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
    },
    "required": ["gender", "occasions", "seasons", "styles", "scent_groups", "notes", "max_budget"],
    "additionalProperties": False,
}


def preference_prompt(message: str, history: list[dict[str, str]]) -> str:
    conversation = history[-6:] + [{"role": "user", "content": message}]
    return f"""Bạn là bộ phân tích nhu cầu mua nước hoa.
Trích xuất tiêu chí từ toàn bộ hội thoại dưới đây. Chỉ ghi tiêu chí người dùng thực sự nói hoặc có thể suy ra trực tiếp.
Quy đổi ngân sách tiếng Việt sang VND, ví dụ 2 triệu = 2000000.
Nhóm hương chỉ dùng các giá trị trong schema. Nếu chưa có dữ liệu, dùng null hoặc mảng rỗng.

Hội thoại:
{json.dumps(conversation, ensure_ascii=False)}"""


def advice_prompt(message: str, preferences: Preferences, products: list[Product]) -> str:
    compact_products = [{
        "name": item.name,
        "brand": item.brand,
        "description": item.description,
        "gender": item.gender,
        "scent_groups": item.scent_groups,
        "notes": item.top_notes + item.middle_notes + item.base_notes,
        "min_price": item.min_price,
        "max_price": item.max_price,
    } for item in products]
    return f"""Bạn là chuyên viên tư vấn nước hoa của Parfumerie.
Viết một câu trả lời tiếng Việt tự nhiên, ngắn gọn (tối đa 140 từ), lịch sự và hữu ích.
Giải thích vì sao các sản phẩm được chọn phù hợp với nhu cầu. Chỉ sử dụng dữ liệu được cung cấp; không bịa độ lưu hương, nồng độ, giá hoặc đặc tính khác.
Nếu danh sách sản phẩm rỗng, đề nghị người dùng nới ngân sách hoặc tiêu chí.

Câu hỏi: {message}
Tiêu chí: {preferences.model_dump_json()}
Sản phẩm đã được hệ thống chọn: {json.dumps(compact_products, ensure_ascii=False)}"""

