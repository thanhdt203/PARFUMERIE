import asyncio
import statistics
import unicodedata
from dataclasses import dataclass, field
from collections.abc import AsyncIterator

from .config import Settings, settings as default_settings
from .embeddings import EmbeddingError, SemanticIndex
from .gemini_client import GeminiClient
from .prompts import PREFERENCE_SCHEMA, advice_prompt, preference_prompt
from .schemas import Intent, KnowledgeItem, Preferences, Product, Profile, RecommendRequest, RecommendResponse


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


# Chai đã mua ảnh hưởng gu nhiều nhất, rồi đến chai đã thích, cuối cùng là đã xem
PROFILE_WEIGHTS = (("purchased", 1.0), ("liked", 0.7), ("viewed", 0.4))
MAX_AFFINITY = 3.0


def taste_weights(profile: Profile | None) -> dict[str, float]:
    weights: dict[str, float] = {}
    if profile:
        for field, weight in PROFILE_WEIGHTS:
            for item in getattr(profile, field):
                for group in item.scent_groups:
                    weights[group] = weights.get(group, 0.0) + weight
    return weights


def affinity(product: Product, weights: dict[str, float]) -> float:
    return min(MAX_AFFINITY, sum(weights.get(group, 0.0) for group in product.scent_groups))


# Độ tương đồng giữa các sản phẩm trong cùng một catalog nằm rất sát nhau, nên so với trung vị thay vì dùng ngưỡng tuyệt đối
SEMANTIC_SCALE = 0.04
MAX_SEMANTIC_BONUS = 1.5

KNOWLEDGE_CHAR_BUDGET = 8000
KNOWLEDGE_MAX_ITEMS = 30


def semantic_bonuses(products: list[Product], similarities: list[float]) -> dict[str, float]:
    if len(similarities) < 2:
        return {}
    median = statistics.median(similarities)
    return {
        product.id: min(MAX_SEMANTIC_BONUS, max(0.0, (similarity - median) / SEMANTIC_SCALE))
        for product, similarity in zip(products, similarities)
    }


def product_text(product: Product) -> str:
    return (
        f"{product.brand} {product.name}. {product.description}. {product.details}. Giới tính: {product.gender}. "
        f"Nhóm hương: {', '.join(product.scent_groups)}. Hương đầu: {', '.join(product.top_notes)}. "
        f"Hương giữa: {', '.join(product.middle_notes)}. Hương cuối: {', '.join(product.base_notes)}."
    )


def fit_knowledge(items: list[KnowledgeItem]) -> list[KnowledgeItem]:
    """Cách dự phòng khi không tra cứu ngữ nghĩa được: lấy các mục đầu tiên trong giới hạn ký tự."""
    chosen, used = [], 0
    for item in items[:KNOWLEDGE_MAX_ITEMS]:
        size = len(item.title) + len(item.content)
        if used + size > KNOWLEDGE_CHAR_BUDGET:
            break
        chosen.append(item)
        used += size
    return chosen


def rank_products(
    products: list[Product], preferences: Preferences, limit: int = 3, weights: dict[str, float] | None = None,
    semantic: dict[str, float] | None = None,
) -> list[Product]:
    if not preferences.wants_products:
        return []
    weights = weights or {}
    semantic = semantic or {}
    ranked = []
    for product in products:
        score = score_product(product, preferences)
        if score is not None:
            score += affinity(product, weights)
            if score:  # ngữ nghĩa chỉ xếp lại thứ tự, không tự khiến sản phẩm thành "phù hợp"
                score += semantic.get(product.id, 0.0)
        if score:
            ranked.append((score, product.min_price, product.name, product))
    ranked.sort(key=lambda item: (-item[0], item[1], item[2]))
    return [item[3] for item in ranked[:limit]]


def find_named_products(products: list[Product], names: list[str], limit: int = 3) -> list[Product]:
    """Sản phẩm trong catalog khớp với tên khách nêu (so khớp không dấu, chứa nhau theo hai chiều)."""
    found: list[Product] = []
    for name in names:
        wanted = normalize(name).strip()
        if not wanted:
            continue
        for product in products:
            full = normalize(f"{product.brand} {product.name}")
            if product not in found and (wanted in full or normalize(product.name) in wanted):
                found.append(product)
                break
    return found[:limit]


@dataclass
class Selection:
    preferences: Preferences
    products: list[Product]
    intent: Intent
    knowledge: list[KnowledgeItem] = field(default_factory=list)


class RecommendationService:
    def __init__(self, gemini: GeminiClient, index: SemanticIndex | None = None, config: Settings = default_settings):
        self.gemini = gemini
        self.index = index
        self.config = config

    @staticmethod
    def _retrieval_query(request: RecommendRequest) -> str:
        # câu hỏi nối tiếp ("còn loại nào rẻ hơn?") cần ngữ cảnh từ các lượt hỏi trước
        previous = [m.content for m in request.history if m.role == "user"][-2:]
        return " ".join([*previous, request.message])

    async def _pick_knowledge(self, request: RecommendRequest) -> list[KnowledgeItem]:
        items = request.knowledge
        if not items:
            return []
        if self.index:
            try:
                sims = await self.index.similarities(self._retrieval_query(request), [f"{i.title}. {i.content}" for i in items])
            except EmbeddingError:
                return fit_knowledge(items)
            ranked = sorted(zip(sims, items), key=lambda pair: -pair[0])
            return [i for sim, i in ranked if sim >= self.config.knowledge_min_similarity][: self.config.knowledge_top_k]
        return fit_knowledge(items)

    async def _product_bonuses(self, request: RecommendRequest) -> dict[str, float]:
        if not self.index or len(request.products) < 2:
            return {}
        try:
            sims = await self.index.similarities(
                self._retrieval_query(request), [product_text(p) for p in request.products]
            )
        except EmbeddingError:
            return {}
        return semantic_bonuses(request.products, sims)

    async def select(self, request: RecommendRequest) -> Selection:
        history = [message.model_dump() for message in request.history]
        # tri thức và độ tương đồng sản phẩm chạy song song với bước trích tiêu chí
        raw_preferences, knowledge, bonuses = await asyncio.gather(
            self.gemini.generate_json(preference_prompt(request.message, history), PREFERENCE_SCHEMA),
            self._pick_knowledge(request),
            self._product_bonuses(request),
        )
        preferences = Preferences.model_validate(raw_preferences)
        if not preferences.wants_products:
            return Selection(preferences, [], "chat", knowledge)
        deep = request.mode == "deep"
        if deep:
            named = find_named_products(request.products, preferences.compare_products)
            if len(named) >= 2:
                return Selection(preferences, named, "compare", knowledge)
        candidates = request.products
        profile = request.profile if deep else None
        if profile:
            # Không gợi lại chai đã mua, trừ khi khách nhắc đúng tên chai đó
            asked = normalize(request.message)
            bought = {item.id for item in profile.purchased}
            candidates = [p for p in candidates if p.id not in bought or normalize(p.name) in asked]
        weights = taste_weights(profile)
        if not preferences.has_criteria() and not weights:
            return Selection(preferences, [], "clarify", knowledge)
        ranked = rank_products(candidates, preferences, weights=weights, semantic=bonuses)
        return Selection(preferences, ranked, "recommend", knowledge)

    @staticmethod
    def _advice_prompt(request: RecommendRequest, selection: Selection) -> str:
        return advice_prompt(
            request.message, selection.preferences, selection.products, request.mode, request.profile,
            selection.intent, request.instructions, selection.knowledge,
        )

    def stream_advice(self, request: RecommendRequest, selection: Selection) -> AsyncIterator[str]:
        return self.gemini.stream_text(self._advice_prompt(request, selection))

    async def recommend(self, request: RecommendRequest) -> RecommendResponse:
        selection = await self.select(request)
        reply = await self.gemini.generate_text(self._advice_prompt(request, selection))
        return RecommendResponse(
            reply=reply,
            product_ids=[product.id for product in selection.products],
            preferences=selection.preferences,
        )
