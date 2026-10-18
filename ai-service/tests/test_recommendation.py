from app.recommendation import rank_products, score_product
from app.schemas import Preferences, Product


def product(**overrides) -> Product:
    data = {
        "id": "1", "name": "Test perfume", "gender": "nam",
        "scent_groups": ["woody"], "base_notes": ["gỗ đàn hương"],
        "min_price": 1_500_000, "max_price": 2_000_000,
    }
    data.update(overrides)
    return Product(**data)


def test_rejects_product_over_budget():
    assert score_product(product(), Preferences(gender="nam", max_budget=1_000_000)) is None


def test_rejects_wrong_gender_but_accepts_unisex():
    prefs = Preferences(gender="nu")
    assert score_product(product(gender="nam"), prefs) is None
    assert score_product(product(gender="unisex"), prefs) is not None


def test_ranks_matching_group_and_note_first():
    prefs = Preferences(gender="nam", scent_groups=["woody"], notes=["gỗ đàn hương"])
    woody = product(id="woody", name="Woody", scent_groups=["woody"])
    fresh = product(id="fresh", name="Fresh", scent_groups=["fresh"], base_notes=[])
    assert [item.id for item in rank_products([fresh, woody], prefs)] == ["woody", "fresh"]


def test_returns_at_most_three_products():
    products = [product(id=str(index), name=f"P{index}") for index in range(5)]
    assert len(rank_products(products, Preferences())) == 3

