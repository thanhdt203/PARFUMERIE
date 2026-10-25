import pytest

from app.recommendation import RecommendationService
from app.schemas import RecommendRequest


class FakeGemini:
    async def generate_json(self, prompt, schema):
        return {
            "gender": "nam", "occasions": ["tiệc"], "seasons": ["mùa đông"],
            "styles": ["ấm áp"], "scent_groups": ["woody"], "notes": [],
            "max_budget": 2_000_000,
        }

    async def generate_text(self, prompt):
        return "Mình gợi ý một mùi hương gỗ ấm áp phù hợp đi tiệc."


@pytest.mark.asyncio
async def test_service_returns_real_product_ids():
    request = RecommendRequest(
        message="Nước hoa nam ấm áp đi tiệc dưới 2 triệu",
        products=[{
            "id": "mongo-id", "name": "Versace Eros", "gender": "nam",
            "scent_groups": ["woody", "oriental"],
            "min_price": 1_300_000, "max_price": 2_400_000,
        }],
    )
    result = await RecommendationService(FakeGemini()).recommend(request)
    assert result.product_ids == ["mongo-id"]
    assert "gỗ" in result.reply



def test_stream_endpoint_emits_products_deltas_done(monkeypatch):
    from fastapi.testclient import TestClient
    from app import main

    class StreamGemini(FakeGemini):
        async def stream_text(self, prompt):
            yield "Xin "
            yield "chào"

    monkeypatch.setattr(main, "service", RecommendationService(StreamGemini()))
    body = {
        "message": "Nước hoa nam đi tiệc",
        "products": [{"id": "p1", "name": "Eros", "gender": "nam", "scent_groups": ["woody"], "min_price": 1, "max_price": 2}],
    }
    text = TestClient(main.app).post("/recommend/stream", json=body).text
    assert text.index("event: products") < text.index("event: delta") < text.index("event: done")
    assert '"product_ids": ["p1"]' in text and '"text": "Xin "' in text


def test_stream_endpoint_reports_gemini_error(monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    from app.gemini_client import GeminiError

    class FailingGemini(FakeGemini):
        async def generate_json(self, prompt, schema):
            raise GeminiError("hết quota")

    monkeypatch.setattr(main, "service", RecommendationService(FailingGemini()))
    text = TestClient(main.app).post("/recommend/stream", json={"message": "x", "products": []}).text
    assert "event: error" in text and "hết quota" in text


def test_request_mode_defaults_to_basic_and_rejects_unknown_values():
    import pytest
    from pydantic import ValidationError

    assert RecommendRequest(message="x", products=[]).mode == "basic"
    assert RecommendRequest(message="x", products=[], mode="deep").mode == "deep"
    with pytest.raises(ValidationError):
        RecommendRequest(message="x", products=[], mode="admin")


def test_stream_endpoint_passes_mode_to_advice(monkeypatch):
    from fastapi.testclient import TestClient
    from app import main

    seen = []

    class ModeGemini(FakeGemini):
        async def stream_text(self, prompt):
            seen.append(prompt)
            yield "ok"

    monkeypatch.setattr(main, "service", RecommendationService(ModeGemini()))
    body = {"message": "x", "mode": "deep", "products": [{"id": "p1", "name": "Eros", "gender": "nam", "scent_groups": ["woody"], "min_price": 1, "max_price": 2}]}
    TestClient(main.app).post("/recommend/stream", json=body)
    assert "tầng hương Đầu" in seen[0]


def _profile_request(mode, message="gợi ý cho mình chai mới"):
    return RecommendRequest(
        message=message, mode=mode,
        profile={"purchased": [{"id": "bought", "name": "Sauvage", "gender": "nam", "scent_groups": ["woody"]}]},
        products=[
            {"id": "bought", "name": "Sauvage", "gender": "nam", "scent_groups": ["woody"], "min_price": 1, "max_price": 2},
            {"id": "similar", "name": "Eros", "gender": "nam", "scent_groups": ["woody"], "min_price": 1, "max_price": 2},
        ],
    )


class _NoCriteriaGemini(FakeGemini):
    async def generate_json(self, prompt, schema):
        return {"gender": None, "occasions": [], "seasons": [], "styles": [], "scent_groups": [], "notes": [],
                "max_budget": None, "wants_products": True}


@pytest.mark.asyncio
async def test_deep_mode_recommends_by_history_and_skips_already_bought():
    selection = await RecommendationService(_NoCriteriaGemini()).select(_profile_request("deep"))
    assert [p.id for p in selection.products] == ["similar"]


@pytest.mark.asyncio
async def test_deep_mode_allows_rebuying_when_customer_names_the_product():
    selection = await RecommendationService(_NoCriteriaGemini()).select(_profile_request("deep", "mua lại Sauvage"))
    assert "bought" in [p.id for p in selection.products]


@pytest.mark.asyncio
async def test_basic_mode_ignores_profile():
    selection = await RecommendationService(_NoCriteriaGemini()).select(_profile_request("basic"))
    assert selection.products == []
    assert selection.intent == "clarify"


class _IntentGemini(FakeGemini):
    def __init__(self, **prefs):
        base = {"gender": None, "occasions": [], "seasons": [], "styles": [], "scent_groups": [], "notes": [],
                "max_budget": None, "wants_products": True, "compare_products": []}
        self.prefs = {**base, **prefs}

    async def generate_json(self, prompt, schema):
        return self.prefs


def _catalog(mode="deep", **extra):
    return RecommendRequest(
        message="x", mode=mode, **extra,
        products=[
            {"id": "eros", "name": "Versace Eros", "brand": "Versace", "gender": "nam", "scent_groups": ["woody"], "min_price": 1, "max_price": 2},
            {"id": "sauvage", "name": "Dior Sauvage", "brand": "Dior", "gender": "nam", "scent_groups": ["fresh"], "min_price": 1, "max_price": 2},
            {"id": "libre", "name": "YSL Libre", "brand": "YSL", "gender": "nu", "scent_groups": ["floral"], "min_price": 1, "max_price": 2},
        ],
    )


@pytest.mark.asyncio
async def test_deep_comparison_selects_exactly_the_named_products():
    gemini = _IntentGemini(compare_products=["sauvage", "Versace Eros"])
    selection = await RecommendationService(gemini).select(_catalog())
    assert selection.intent == "compare"
    assert [p.id for p in selection.products] == ["sauvage", "eros"]


@pytest.mark.asyncio
async def test_comparison_needs_two_known_products_and_is_deep_only():
    one_known = _IntentGemini(compare_products=["Sauvage", "Chanel Bleu"], scent_groups=["fresh"])
    assert (await RecommendationService(one_known).select(_catalog())).intent == "recommend"
    two_known = _IntentGemini(compare_products=["Sauvage", "Eros"], scent_groups=["fresh"])
    assert (await RecommendationService(two_known).select(_catalog("basic"))).intent == "recommend"


@pytest.mark.asyncio
async def test_vague_request_without_history_asks_for_clarification():
    selection = await RecommendationService(_IntentGemini()).select(_catalog())
    assert (selection.intent, selection.products) == ("clarify", [])


@pytest.mark.asyncio
async def test_specific_request_and_general_chat_keep_their_intents():
    assert (await RecommendationService(_IntentGemini(gender="nam")).select(_catalog())).intent == "recommend"
    chat = await RecommendationService(_IntentGemini(wants_products=False, gender="nam")).select(_catalog())
    assert (chat.intent, chat.products) == ("chat", [])
