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
    assert len(rank_products(products, Preferences(scent_groups=["woody"]))) == 3


def test_returns_nothing_when_no_criterion_matches():
    products = [product(id="a"), product(id="b", scent_groups=["fresh"], base_notes=[])]
    assert rank_products(products, Preferences()) == []
    assert rank_products(products, Preferences(max_budget=5_000_000)) == []
    assert [item.id for item in rank_products(products, Preferences(scent_groups=["fresh"]))] == ["b"]


def test_returns_nothing_when_user_does_not_want_products():
    prefs = Preferences(gender="nam", scent_groups=["woody"], wants_products=False)
    assert rank_products([product()], prefs) == []


def test_budget_breaks_ties_between_matching_products():
    prefs = Preferences(scent_groups=["woody"], max_budget=3_000_000)
    cheap = product(id="cheap", min_price=1_000_000)
    pricey = product(id="pricey", min_price=2_500_000)
    assert [item.id for item in rank_products([pricey, cheap], prefs)] == ["cheap", "pricey"]



def test_advice_prompt_lists_only_variants_within_budget():
    from app.prompts import advice_prompt

    item = product(
        name="Sauvage", min_price=1_900_000, max_price=3_200_000,
        variants=[{"size": "50ml", "price": 1_900_000}, {"size": "100ml", "price": 3_200_000}],
    )
    prompt = advice_prompt("dưới 2 triệu", Preferences(max_budget=2_000_000), [item])
    within = prompt.split('"variants_within_budget": ')[1].split("}]")[0]
    assert "50ml" in within
    assert "100ml" not in within
    assert '"size": "100ml"' in prompt  # full list is still provided for context


def test_advice_prompt_for_general_question_does_not_ask_to_loosen_budget():
    from app.prompts import advice_prompt

    prompt = advice_prompt("nước hoa EDP là gì?", Preferences(wants_products=False), [])
    assert "chưa nhờ chọn sản phẩm" in prompt
    assert "nới ngân sách" not in prompt


def test_advice_prompt_without_match_suggests_loosening():
    from app.prompts import advice_prompt

    prompt = advice_prompt("nam dưới 100k", Preferences(max_budget=100_000), [])
    assert "nới ngân sách" in prompt


def test_deep_advice_prompt_splits_note_tiers_and_asks_for_tier_analysis():
    from app.prompts import advice_prompt

    item = product(top_notes=["cam bergamot"], middle_notes=["hoa nhài"], base_notes=["gỗ đàn hương"])
    deep = advice_prompt("đi tiệc", Preferences(), [item], "deep")
    assert '"top_notes": ["cam bergamot"]' in deep
    assert '"base_notes": ["gỗ đàn hương"]' in deep
    assert "tầng hương Đầu" in deep and "giỏ hàng" in deep


def test_basic_advice_prompt_keeps_short_style_and_merged_notes():
    from app.prompts import advice_prompt

    item = product(top_notes=["cam bergamot"], base_notes=["gỗ đàn hương"])
    basic = advice_prompt("đi tiệc", Preferences(), [item])
    assert "tối đa 140 từ" in basic
    assert '"notes": ["cam bergamot", "gỗ đàn hương"]' in basic
    assert "top_notes" not in basic
