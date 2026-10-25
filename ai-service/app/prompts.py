import json

from .schemas import Intent, Mode, Preferences, Product, Profile, ProfileProduct


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
        "compare_products": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
    },
    "required": [
        "gender", "occasions", "seasons", "styles", "scent_groups", "notes", "max_budget",
        "wants_products", "compare_products",
    ],
    "additionalProperties": False,
}


def preference_prompt(message: str, history: list[dict[str, str]]) -> str:
    conversation = history[-6:] + [{"role": "user", "content": message}]
    return f"""Bạn là bộ phân tích nhu cầu mua nước hoa.
Trích xuất tiêu chí từ toàn bộ hội thoại dưới đây. Chỉ ghi tiêu chí người dùng thực sự nói hoặc có thể suy ra trực tiếp.
Quy đổi ngân sách tiếng Việt sang VND, ví dụ 2 triệu = 2000000.
Nhóm hương chỉ dùng các giá trị trong schema. Nếu chưa có dữ liệu, dùng null hoặc mảng rỗng.
wants_products = true khi người dùng đang tìm, nhờ gợi ý hoặc so sánh sản phẩm để mua (kể cả khi tin nhắn ngắn như "còn loại nào rẻ hơn không"). wants_products = false khi tin nhắn chỉ là chào hỏi, cảm ơn, hoặc câu hỏi kiến thức chung về nước hoa không nhằm chọn sản phẩm.

compare_products: tên các sản phẩm người dùng nêu rõ để so sánh hoặc hỏi sự khác nhau (chỉ khi có từ 2 tên trở lên, giữ đúng tên người dùng viết, có thể lấy từ lượt hội thoại trước); nếu không phải yêu cầu so sánh thì [].

Hội thoại:
{json.dumps(conversation, ensure_ascii=False)}"""


SAMPLE_RULE = (
    "Nếu khách muốn dùng thử, mua thử, mua chiết, mua tặng nhỏ hoặc ngân sách không đủ dung tích lớn, hãy gợi ý dung tích nhỏ nhất "
    "còn trong variants của từng sản phẩm để thử trước khi mua chai lớn."
)


def profile_section(profile: Profile | None) -> str:
    if not profile or profile.is_empty():
        return ""
    def brief(items: list[ProfileProduct]) -> list[dict]:
        return [{"name": i.name, "brand": i.brand, "scent_groups": i.scent_groups} for i in items]

    data = {"da_mua": brief(profile.purchased), "da_thich": brief(profile.liked), "da_xem": brief(profile.viewed)}
    return (
        "\nLịch sử của khách hàng (chỉ để cá nhân hóa): "
        + json.dumps(data, ensure_ascii=False)
        + "\nNếu thực sự liên quan, hãy nhắc ngắn gọn gợi ý này dựa trên chai khách đã mua/thích/xem (nêu đúng tên chai trong lịch sử, "
        "ví dụ \"vì bạn từng chọn ...\"). Không suy diễn thêm về khách và không nhắc lịch sử nếu không liên quan đến câu hỏi."
    )


def advice_prompt(
    message: str, preferences: Preferences, products: list[Product], mode: Mode = "basic",
    profile: Profile | None = None, intent: Intent | None = None,
) -> str:
    budget = preferences.max_budget
    compact_products = [{
        "name": item.name,
        "brand": item.brand,
        "description": item.description,
        "gender": item.gender,
        "scent_groups": item.scent_groups,
        **(
            {"top_notes": item.top_notes, "middle_notes": item.middle_notes, "base_notes": item.base_notes}
            if mode == "deep"
            else {"notes": item.top_notes + item.middle_notes + item.base_notes}
        ),
        "min_price": item.min_price,
        "max_price": item.max_price,
        "variants": [variant.model_dump() for variant in item.variants],
        "variants_within_budget": [
            variant.model_dump() for variant in item.variants if budget is None or variant.price <= budget
        ],
    } for item in products]
    intent = intent or ("recommend" if preferences.wants_products else "chat")
    if intent == "clarify":
        style_rule = (
            "Khách chưa nêu đủ thông tin để gợi ý sản phẩm. Viết tiếng Việt thân thiện, tối đa 80 từ: hỏi lại tối đa 2 câu ngắn "
            "để hiểu nhu cầu (dịp dùng, dùng cho nam hay nữ, ngân sách, nhóm hương yêu thích), mỗi câu kèm 3-4 lựa chọn nhanh. "
            "Chưa gợi ý sản phẩm cụ thể."
        )
    elif intent == "compare":
        style_rule = (
            "Khách muốn so sánh các sản phẩm bên dưới. Viết bản so sánh tiếng Việt tự nhiên, lịch sự (tối đa 260 từ), lần lượt theo: "
            "tầng hương Đầu/Giữa/Cuối, phong cách và dịp dùng phù hợp, giá theo từng dung tích. Kết luận dạng "
            "\"nên chọn A nếu ..., chọn B nếu ...\" dựa trên nhu cầu khách đã nêu. "
            "Cuối cùng nhắc chọn dung tích ở thẻ sản phẩm bên dưới để thêm vào giỏ hàng. " + SAMPLE_RULE
        )
    elif mode == "deep":
        style_rule = (
            "Viết câu trả lời tiếng Việt tự nhiên, lịch sự (tối đa 220 từ) cho khách hàng đã đăng nhập, đi sâu hơn tư vấn thông thường.\n"
            "Với mỗi sản phẩm: nêu tầng hương Đầu (top), Giữa (heart) và Cuối (base) theo đúng dữ liệu (tầng nào không có dữ liệu thì bỏ qua, "
            "không tự thêm nốt hương), rồi giải thích hương thay đổi theo thời gian ra sao và vì sao hợp với gu, dịp dùng hoặc phong cách người dùng nêu. "
            "Cuối cùng gợi ý người dùng chọn dung tích ở thẻ sản phẩm bên dưới để thêm vào giỏ hàng. " + SAMPLE_RULE
        )
    else:
        style_rule = (
            "Viết một câu trả lời tiếng Việt tự nhiên, ngắn gọn (tối đa 140 từ), lịch sự và hữu ích.\n"
            "Giải thích vì sao các sản phẩm được chọn phù hợp với nhu cầu."
        )
    if products or intent in ("clarify", "compare"):
        empty_rule = ""
    elif intent == "recommend":
        empty_rule = "Hiện không có sản phẩm nào phù hợp: đề nghị người dùng nới ngân sách hoặc tiêu chí."
    else:
        empty_rule = (
            "Người dùng chưa nhờ chọn sản phẩm nên không có sản phẩm nào được đưa ra: hãy trả lời trực tiếp câu hỏi "
            "(chỉ dùng kiến thức nước hoa phổ thông, không nêu giá hay sản phẩm cụ thể của cửa hàng), "
            "rồi mời họ mô tả dịp dùng, mùi hương hoặc ngân sách để được gợi ý."
        )
    return f"""Bạn là chuyên viên tư vấn nước hoa của Parfumerie.
{style_rule}
Chỉ sử dụng dữ liệu được cung cấp; không bịa độ lưu hương, nồng độ, giá hoặc đặc tính khác.
Giá trong dữ liệu là giá theo từng dung tích (variants). Khi nêu giá, luôn kèm dung tích; nếu người dùng có ngân sách, chỉ nêu các dung tích trong variants_within_budget và nói rõ các dung tích lớn hơn có giá cao hơn ngân sách.
{empty_rule}

Câu hỏi: {message}
Tiêu chí: {preferences.model_dump_json()}
Sản phẩm đã được hệ thống chọn: {json.dumps(compact_products, ensure_ascii=False)}{profile_section(profile if mode == "deep" else None)}"""

