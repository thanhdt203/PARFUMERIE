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

