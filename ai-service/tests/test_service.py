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
