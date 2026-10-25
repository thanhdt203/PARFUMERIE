import json

from .schemas import Preferences, Product


PREFERENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "gender": {
            "anyOf": [
                {"type": "string", "enum": ["nam", "nu", "unisex"]},
                {"type": "null"},
            ]
        },
        "occasions": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
        "seasons": {"type": "array", "items": {"type": "string"}, "maxItems": 4},
        "styles": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
        "scent_groups": {
            "type": "array",
            "items": {"type": "string", "enum": ["floral", "woody", "oriental", "fresh", "citrus", "fruity", "aromatic", "gourmand", "chypre", "musk"]},
            "maxItems": 5,
        },
        "notes": {"type": "array", "items": {"type": "string"}, "maxItems": 10},
        "max_budget": {"type": ["number", "null"], "minimum": 0},
        "wants_products": {"type": "boolean"},
    },
    "required": ["gender", "occasions", "seasons", "styles", "scent_groups", "notes", "max_budget", "wants_products"],
    "additionalProperties": False,
}


def preference_prompt(message: str, history: list[dict[str, str]]) -> str:
    conversation = history[-6:] + [{"role": "user", "content": message}]
    return f"""Bạn là bộ phân tích nhu cầu mua nước hoa.
Trích xuất tiêu chí từ toàn bộ hội thoại dưới đây. Chỉ ghi tiêu chí người dùng thực sự nói hoặc có thể suy ra trực tiếp.
Quy đổi ngân sách tiếng Việt sang VND, ví dụ 2 triệu = 2000000.
Nhóm hương chỉ dùng các giá trị trong schema. Nếu chưa có dữ liệu, dùng null hoặc mảng rỗng.
wants_products = true khi người dùng đang tìm, nhờ gợi ý hoặc so sánh sản phẩm để mua (kể cả khi tin nhắn ngắn như "còn loại nào rẻ hơn không"). wants_products = false khi tin nhắn chỉ là chào hỏi, cảm ơn, hoặc câu hỏi kiến thức chung về nước hoa không nhằm chọn sản phẩm.

Hội thoại:
{json.dumps(conversation, ensure_ascii=False)}"""


def advice_prompt(message: str, preferences: Preferences, products: list[Product]) -> str:
    budget = preferences.max_budget
    compact_products = [{
        "name": item.name,
        "brand": item.brand,
        "description": item.description,
        "gender": item.gender,
        "scent_groups": item.scent_groups,
        "notes": item.top_notes + item.middle_notes + item.base_notes,
        "min_price": item.min_price,
        "max_price": item.max_price,
        "variants": [variant.model_dump() for variant in item.variants],
        "variants_within_budget": [
            variant.model_dump() for variant in item.variants if budget is None or variant.price <= budget
        ],
    } for item in products]
    if products:
        empty_rule = ""
    elif preferences.wants_products:
        empty_rule = "Hiện không có sản phẩm nào phù hợp: đề nghị người dùng nới ngân sách hoặc tiêu chí."
    else:
        empty_rule = (
            "Người dùng chưa nhờ chọn sản phẩm nên không có sản phẩm nào được đưa ra: hãy trả lời trực tiếp câu hỏi "
            "(chỉ dùng kiến thức nước hoa phổ thông, không nêu giá hay sản phẩm cụ thể của cửa hàng), "
            "rồi mời họ mô tả dịp dùng, mùi hương hoặc ngân sách để được gợi ý."
        )
    return f"""Bạn là chuyên viên tư vấn nước hoa của Parfumerie.
Viết một câu trả lời tiếng Việt tự nhiên, ngắn gọn (tối đa 140 từ), lịch sự và hữu ích.
Giải thích vì sao các sản phẩm được chọn phù hợp với nhu cầu. Chỉ sử dụng dữ liệu được cung cấp; không bịa độ lưu hương, nồng độ, giá hoặc đặc tính khác.
Giá trong dữ liệu là giá theo từng dung tích (variants). Khi nêu giá, luôn kèm dung tích; nếu người dùng có ngân sách, chỉ nêu các dung tích trong variants_within_budget và nói rõ các dung tích lớn hơn có giá cao hơn ngân sách.
{empty_rule}

Câu hỏi: {message}
Tiêu chí: {preferences.model_dump_json()}
Sản phẩm đã được hệ thống chọn: {json.dumps(compact_products, ensure_ascii=False)}"""

