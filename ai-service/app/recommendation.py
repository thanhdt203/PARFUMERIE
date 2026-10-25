import unicodedata
from collections.abc import AsyncIterator

from .gemini_client import GeminiClient
from .prompts import PREFERENCE_SCHEMA, advice_prompt, preference_prompt
from .schemas import Mode, Preferences, Product, RecommendRequest, RecommendResponse


CONTEXT_KEYWORDS = {
    "tiệc": ["oriental", "gourmand", "woody"],
    "hẹn hò": ["floral", "oriental", "gourmand", "musk"],
    "đi làm": ["fresh", "citrus", "aromatic", "woody"],
    "mùa hè": ["fresh", "citrus", "fruity", "aromatic"],
    "mùa đông": ["oriental", "woody", "gourmand", "musk"],
    "ấm áp": ["oriental", "woody", "gourmand", "musk"],
    "tươi mát": ["fresh", "citrus", "aromatic"],
    "quyến rũ": ["oriental", "gourmand", "floral", "musk"],
    "thanh lịch": ["floral", "woody", "chypre", "musk"],
}


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFD", value.lower())
    return "".join(char for char in value if unicodedata.category(char) != "Mn").replace("đ", "d")


def score_product(product: Product, preferences: Preferences) -> float | None:
    if preferences.max_budget is not None and product.min_price > preferences.max_budget:
        return None
    score = 0.0
    if preferences.gender:
        if product.gender == preferences.gender:
            score += 4
        elif product.gender == "unisex":
            score += 2
        else:
            return None
    product_groups = set(product.scent_groups)
    score += 3 * len(set(preferences.scent_groups) & product_groups)
    product_text = normalize(" ".join([
        product.name, product.brand, product.description, product.details,
        *product.top_notes, *product.middle_notes, *product.base_notes,
    ]))
    for note in preferences.notes:
        if normalize(note) in product_text:
            score += 2
    normalized_context = normalize(" ".join(preferences.occasions + preferences.seasons + preferences.styles))
    for keyword, groups in CONTEXT_KEYWORDS.items():
        if normalize(keyword) in normalized_context:
            score += 1.5 * len(set(groups) & product_groups)
    # Ngân sách chỉ để phá hòa giữa các sản phẩm đã khớp, không tự nó làm sản phẩm "phù hợp"
    if score > 0 and preferences.max_budget:
        score += max(0, 1 - product.min_price / preferences.max_budget)
    return score


def rank_products(products: list[Product], preferences: Preferences, limit: int = 3) -> list[Product]:
    if not preferences.wants_products:
        return []
    ranked = []
    for product in products:
        score = score_product(product, preferences)
        if score:
            ranked.append((score, product.min_price, product.name, product))
    ranked.sort(key=lambda item: (-item[0], item[1], item[2]))
    return [item[3] for item in ranked[:limit]]


class RecommendationService:
    def __init__(self, gemini: GeminiClient):
        self.gemini = gemini

    async def select(self, request: RecommendRequest) -> tuple[Preferences, list[Product]]:
        history = [message.model_dump() for message in request.history]
        raw_preferences = await self.gemini.generate_json(
            preference_prompt(request.message, history), PREFERENCE_SCHEMA
        )
        preferences = Preferences.model_validate(raw_preferences)
        return preferences, rank_products(request.products, preferences)

    def stream_advice(
        self, message: str, preferences: Preferences, selected: list[Product], mode: Mode = "basic"
    ) -> AsyncIterator[str]:
        return self.gemini.stream_text(advice_prompt(message, preferences, selected, mode))

    async def recommend(self, request: RecommendRequest) -> RecommendResponse:
        preferences, selected = await self.select(request)
        reply = await self.gemini.generate_text(advice_prompt(request.message, preferences, selected, request.mode))
        return RecommendResponse(
            reply=reply,
            product_ids=[product.id for product in selected],
            preferences=preferences,
        )

