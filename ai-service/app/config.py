import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
    gemini_timeout_seconds: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "15"))
    gemini_embedding_model: str = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001").strip()
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
    semantic_search: bool = os.getenv("SEMANTIC_SEARCH", "true").strip().lower() != "false"
    # Tri thức: mỗi câu hỏi chỉ lấy tối đa knowledge_top_k mục có độ tương đồng >= knowledge_min_similarity
    knowledge_top_k: int = int(os.getenv("KNOWLEDGE_TOP_K", "4"))
    knowledge_min_similarity: float = float(os.getenv("KNOWLEDGE_MIN_SIMILARITY", "0.70"))
    host: str = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))


settings = Settings()

