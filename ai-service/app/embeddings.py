import hashlib
import math
from collections import OrderedDict

import httpx

from .config import Settings


class EmbeddingError(RuntimeError):
    pass


def normalize_vector(vector: list[float]) -> list[float]:
    # Vector rút gọn chiều của Gemini chưa được chuẩn hóa, nên tự chuẩn hóa để cosine = tích vô hướng
    norm = math.sqrt(sum(x * x for x in vector)) or 1.0
    return [x / norm for x in vector]


def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


class GeminiEmbedder:
    BATCH_SIZE = 100

    def __init__(self, config: Settings):
        self.config = config

    def _url(self) -> str:
        return f"https://generativelanguage.googleapis.com/v1beta/models/{self.config.gemini_embedding_model}:batchEmbedContents"

    async def embed(self, texts: list[str], task: str) -> list[list[float]]:
        if not self.config.gemini_api_key:
            raise EmbeddingError("Chưa cấu hình GEMINI_API_KEY")
        vectors: list[list[float]] = []
        try:
            async with httpx.AsyncClient(timeout=self.config.gemini_timeout_seconds) as client:
                for start in range(0, len(texts), self.BATCH_SIZE):
                    chunk = texts[start:start + self.BATCH_SIZE]
                    response = await client.post(
                        self._url(),
                        headers={"x-goog-api-key": self.config.gemini_api_key},
                        json={"requests": [{
                            "model": f"models/{self.config.gemini_embedding_model}",
                            "content": {"parts": [{"text": text}]},
                            "taskType": task,
                            "outputDimensionality": self.config.embedding_dimensions,
                        } for text in chunk]},
                    )
                    response.raise_for_status()
                    vectors.extend(normalize_vector(item["values"]) for item in response.json()["embeddings"])
        except httpx.TimeoutException as exc:
            raise EmbeddingError("Embedding phản hồi quá thời gian") from exc
        except httpx.HTTPStatusError as exc:
            raise EmbeddingError(f"Embedding API trả về lỗi {exc.response.status_code}") from exc
        except httpx.HTTPError as exc:
            raise EmbeddingError("Không thể kết nối Embedding API") from exc
        except (KeyError, TypeError, ValueError) as exc:
            raise EmbeddingError("Embedding API không trả về dữ liệu hợp lệ") from exc
        if len(vectors) != len(texts):
            raise EmbeddingError("Embedding API trả về thiếu vector")
        return vectors


class SemanticIndex:
    """Chỉ mục vector trong bộ nhớ: nhớ vector theo nội dung văn bản nên sản phẩm/tri thức không đổi thì không phải embed lại.

    Phù hợp vài trăm tài liệu (catalog và kho tri thức của một cửa hàng); lớn hơn thì thay bằng vector DB thật.
    """

    def __init__(self, embedder: GeminiEmbedder, max_items: int = 5000):
        self.embedder = embedder
        self.max_items = max_items
        self._cache: OrderedDict[str, list[float]] = OrderedDict()

    @staticmethod
    def _key(text: str, task: str) -> str:
        return hashlib.sha256(f"{task}\n{text}".encode()).hexdigest()

    async def embed(self, texts: list[str], task: str) -> list[list[float]]:
        keys = [self._key(text, task) for text in texts]
        missing: dict[str, str] = {key: text for key, text in zip(keys, texts) if key not in self._cache}
        if missing:
            vectors = await self.embedder.embed(list(missing.values()), task)
            for key, vector in zip(missing, vectors):
                self._cache[key] = vector
        for key in keys:
            self._cache.move_to_end(key)
        while len(self._cache) > self.max_items:
            self._cache.popitem(last=False)
        return [self._cache[key] for key in keys]

    async def similarities(self, query: str, documents: list[str]) -> list[float]:
        if not documents:
            return []
        (query_vector,) = await self.embed([query], "RETRIEVAL_QUERY")
        return [dot(query_vector, vector) for vector in await self.embed(documents, "RETRIEVAL_DOCUMENT")]
