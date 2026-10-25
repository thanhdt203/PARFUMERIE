import json
import math

import httpx
import pytest

from app import embeddings
from app.config import Settings
from app.embeddings import EmbeddingError, GeminiEmbedder, SemanticIndex, normalize_vector
from app.recommendation import RecommendationService, fit_knowledge, rank_products, semantic_bonuses
from app.schemas import KnowledgeItem, Preferences, Product, RecommendRequest


REAL_CLIENT = httpx.AsyncClient  # giữ bản gốc: helper được gọi nhiều lần trong một test


def embedder_with(monkeypatch, handler, api_key="test-key"):
    monkeypatch.setattr(
        embeddings.httpx, "AsyncClient",
        lambda **kwargs: REAL_CLIENT(transport=httpx.MockTransport(handler), **kwargs),
    )
    return GeminiEmbedder(Settings(gemini_api_key=api_key, embedding_dimensions=3))


def vectors_response(request, vector=(3.0, 4.0, 0.0)):
    count = len(json.loads(request.content)["requests"])
    return httpx.Response(200, json={"embeddings": [{"values": list(vector)} for _ in range(count)]})


def test_normalize_vector_gives_unit_length():
    assert normalize_vector([3.0, 4.0]) == [0.6, 0.8]
    assert math.isclose(sum(x * x for x in normalize_vector([1.0, 2.0, 2.0])), 1.0)
    assert normalize_vector([0.0, 0.0]) == [0.0, 0.0]


@pytest.mark.asyncio
async def test_embedder_sends_task_type_and_dimensions_and_normalizes(monkeypatch):
    seen = []

    def handler(request):
        seen.append(json.loads(request.content))
        return vectors_response(request)

    embedder = embedder_with(monkeypatch, handler)
    vectors = await embedder.embed(["a", "b"], "RETRIEVAL_QUERY")
    assert vectors == [[0.6, 0.8, 0.0], [0.6, 0.8, 0.0]]
    first = seen[0]["requests"][0]
    assert first["taskType"] == "RETRIEVAL_QUERY" and first["outputDimensionality"] == 3
    assert first["model"] == "models/gemini-embedding-001"


@pytest.mark.asyncio
async def test_embedder_splits_large_inputs_into_batches_of_100(monkeypatch):
    sizes = []

    def handler(request):
        sizes.append(len(json.loads(request.content)["requests"]))
        return vectors_response(request)

    embedder = embedder_with(monkeypatch, handler)
    assert len(await embedder.embed([str(i) for i in range(250)], "RETRIEVAL_DOCUMENT")) == 250
    assert sizes == [100, 100, 50]


@pytest.mark.asyncio
async def test_embedder_errors_become_embedding_error(monkeypatch):
    with pytest.raises(EmbeddingError, match="GEMINI_API_KEY"):
        await embedder_with(monkeypatch, vectors_response, api_key="").embed(["a"], "RETRIEVAL_QUERY")
    with pytest.raises(EmbeddingError, match="429"):
        await embedder_with(monkeypatch, lambda r: httpx.Response(429)).embed(["a"], "RETRIEVAL_QUERY")
    with pytest.raises(EmbeddingError, match="dữ liệu hợp lệ"):
        await embedder_with(monkeypatch, lambda r: httpx.Response(200, json={"oops": 1})).embed(["a"], "RETRIEVAL_QUERY")
    with pytest.raises(EmbeddingError, match="thiếu"):
        await embedder_with(monkeypatch, lambda r: httpx.Response(200, json={"embeddings": []})).embed(["a"], "RETRIEVAL_QUERY")

    def timeout(request):
        raise httpx.ReadTimeout("slow")

    with pytest.raises(EmbeddingError, match="quá thời gian"):
        await embedder_with(monkeypatch, timeout).embed(["a"], "RETRIEVAL_QUERY")


class CountingEmbedder:
    """Vector = one-hot theo chữ cái đầu để dễ dự đoán độ tương đồng."""

    def __init__(self):
        self.calls = []

    async def embed(self, texts, task):
        self.calls.append((list(texts), task))
        return [[1.0 if text[:1] == letter else 0.0 for letter in "abc"] for text in texts]


@pytest.mark.asyncio
async def test_index_embeds_each_text_once_and_reuses_the_cache():
    fake = CountingEmbedder()
    index = SemanticIndex(fake)
    assert await index.similarities("a-query", ["a1", "b1"]) == [1.0, 0.0]
    assert await index.similarities("a-query", ["a1", "b1", "c1"]) == [1.0, 0.0, 0.0]
    documents = [texts for texts, task in fake.calls if task == "RETRIEVAL_DOCUMENT"]
    assert documents == [["a1", "b1"], ["c1"]]
    queries = [texts for texts, task in fake.calls if task == "RETRIEVAL_QUERY"]
    assert queries == [["a-query"]]  # câu hỏi giống hệt cũng không phải embed lại


@pytest.mark.asyncio
async def test_index_keys_include_task_type_and_evicts_least_recently_used():
    fake = CountingEmbedder()
    index = SemanticIndex(fake, max_items=2)
    await index.embed(["a"], "RETRIEVAL_DOCUMENT")
    await index.embed(["a"], "RETRIEVAL_QUERY")
    assert len(fake.calls) == 2
    await index.embed(["b"], "RETRIEVAL_DOCUMENT")  # đẩy mục cũ nhất ra
    await index.embed(["a"], "RETRIEVAL_DOCUMENT")
    assert len(fake.calls) == 4
    assert await index.similarities("a", []) == []


def test_fit_knowledge_respects_item_and_character_limits():
    big = [KnowledgeItem(title="t", content="x" * 1000) for _ in range(10)]
    assert len(fit_knowledge(big)) == 7  # 7 * 1001 <= 8000 < 8 * 1001
    assert len(fit_knowledge([KnowledgeItem(title="t", content="c")] * 100)) == 30


def make_product(pid, **extra):
    data = {"id": pid, "name": pid, "gender": "nam", "scent_groups": ["woody"], "min_price": 1, "max_price": 2}
    return Product(**{**data, **extra})


def test_semantic_bonus_is_relative_to_the_median_and_capped():
    products = [make_product(p) for p in "abcde"]
    bonuses = semantic_bonuses(products, [0.60, 0.61, 0.62, 0.66, 0.80])
    assert bonuses["a"] == 0 and bonuses["c"] == 0  # không trừ điểm sản phẩm dưới trung vị
    assert 0 < bonuses["d"] < bonuses["e"] <= 1.5
    assert bonuses["e"] == 1.5
    assert semantic_bonuses(products[:1], [0.9]) == {}


def test_semantic_only_reorders_qualified_products_and_never_qualifies_one():
    a, b, c = make_product("a"), make_product("b"), make_product("c", scent_groups=["fresh"])
    prefs = Preferences(scent_groups=["woody"])
    assert [p.id for p in rank_products([a, b, c], prefs)] == ["a", "b"]
    assert [p.id for p in rank_products([a, b, c], prefs, semantic={"b": 1.0, "c": 1.5})] == ["b", "a"]


class FakeIndex:
    def __init__(self, sims=None, error=None):
        self.sims, self.error, self.queries = sims or {}, error, []

    async def similarities(self, query, documents):
        self.queries.append(query)
        if self.error:
            raise self.error
        return [next((v for key, v in self.sims.items() if doc.startswith(key)), 0.0) for doc in documents]


class JsonGemini:
    async def generate_json(self, prompt, schema):
        return {"gender": None, "occasions": [], "seasons": [], "styles": [], "scent_groups": [], "notes": [],
                "max_budget": None, "wants_products": False, "compare_products": []}


KB = [KnowledgeItem(title=title, content="nội dung") for title in ("EDP", "Bảo quản", "Đổi trả", "Giao hàng", "Mẫu thử", "Xịt")]


def request_with(**extra):
    return RecommendRequest(message="EDP là gì", products=[], knowledge=KB, **extra)


@pytest.mark.asyncio
async def test_only_relevant_knowledge_is_picked_up_to_top_k():
    sims = {"EDP": 0.78, "Bảo quản": 0.74, "Đổi trả": 0.72, "Giao hàng": 0.71, "Mẫu thử": 0.705, "Xịt": 0.69}
    service = RecommendationService(JsonGemini(), FakeIndex(sims))
    selection = await service.select(request_with())
    assert [k.title for k in selection.knowledge] == ["EDP", "Bảo quản", "Đổi trả", "Giao hàng"]  # top 4, "Xịt" < 0.70


@pytest.mark.asyncio
async def test_no_knowledge_when_nothing_is_similar_enough():
    service = RecommendationService(JsonGemini(), FakeIndex({"EDP": 0.65}))
    assert (await service.select(request_with())).knowledge == []


@pytest.mark.asyncio
async def test_knowledge_falls_back_to_budgeted_list_when_embedding_fails():
    service = RecommendationService(JsonGemini(), FakeIndex(error=EmbeddingError("hết quota")))
    selection = await service.select(request_with())
    assert [k.title for k in selection.knowledge] == [k.title for k in KB]  # cách cũ: lấy theo thứ tự trong giới hạn


@pytest.mark.asyncio
async def test_retrieval_query_includes_the_previous_user_turns():
    index = FakeIndex()
    request = RecommendRequest(
        message="còn loại nào rẻ hơn", products=[], knowledge=KB,
        history=[{"role": "user", "content": "nước hoa nam"}, {"role": "assistant", "content": "gợi ý A"},
                 {"role": "user", "content": "đi tiệc"}],
    )
    await RecommendationService(JsonGemini(), index).select(request)
    assert index.queries[0] == "nước hoa nam đi tiệc còn loại nào rẻ hơn"


@pytest.mark.asyncio
async def test_selected_knowledge_reaches_the_advice_prompt_not_the_whole_kb():
    seen = []

    class SpyGemini(JsonGemini):
        async def stream_text(self, prompt):
            seen.append(prompt)
            yield "ok"

    request = request_with()
    service = RecommendationService(SpyGemini(), FakeIndex({"EDP": 0.78}))
    selection = await service.select(request)
    async for _ in service.stream_advice(request, selection):
        pass
    assert "EDP" in seen[0] and "Giao hàng" not in seen[0]
