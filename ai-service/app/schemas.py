from typing import Literal

from pydantic import BaseModel, Field, field_validator


Role = Literal["user", "assistant"]
Gender = Literal["nam", "nu", "unisex"]
ScentGroup = Literal[
    "floral", "woody", "oriental", "fresh", "citrus",
    "fruity", "aromatic", "gourmand", "chypre", "musk",
]


class ChatMessage(BaseModel):
    role: Role
    content: str = Field(min_length=1, max_length=500)


class Variant(BaseModel):
    size: str = ""
    price: float = Field(ge=0)


class Product(BaseModel):
    id: str = Field(min_length=1)
    name: str
    brand: str = ""
    description: str = ""
    details: str = ""
    gender: Gender
    scent_groups: list[ScentGroup] = Field(default_factory=list)
    top_notes: list[str] = Field(default_factory=list)
    middle_notes: list[str] = Field(default_factory=list)
    base_notes: list[str] = Field(default_factory=list)
    min_price: float = Field(ge=0)
    max_price: float = Field(ge=0)
    variants: list[Variant] = Field(default_factory=list, max_length=10)


Mode = Literal["basic", "deep"]


class ProfileProduct(BaseModel):
    id: str = Field(min_length=1)
    name: str
    brand: str = ""
    gender: Gender
    scent_groups: list[ScentGroup] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class Profile(BaseModel):
    """Lịch sử của khách hàng đã đăng nhập: chai đã mua, đã xem, đã thích."""

    purchased: list[ProfileProduct] = Field(default_factory=list, max_length=10)
    viewed: list[ProfileProduct] = Field(default_factory=list, max_length=10)
    liked: list[ProfileProduct] = Field(default_factory=list, max_length=10)

    def is_empty(self) -> bool:
        return not (self.purchased or self.viewed or self.liked)


class KnowledgeItem(BaseModel):
    title: str = Field(max_length=120)
    content: str = Field(max_length=1000)


class RecommendRequest(BaseModel):
    mode: Mode = "basic"
    # Cấu hình do admin quản lý: hướng dẫn riêng và kiến thức của cửa hàng
    instructions: str = Field(default="", max_length=2000)
    knowledge: list[KnowledgeItem] = Field(default_factory=list, max_length=100)
    profile: Profile | None = None
    message: str = Field(min_length=1, max_length=300)
    history: list[ChatMessage] = Field(default_factory=list, max_length=10)
    products: list[Product] = Field(max_length=100)

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message không được để trống")
        return value


class Preferences(BaseModel):
    gender: Gender | None = None
    occasions: list[str] = Field(default_factory=list, max_length=5)
    seasons: list[str] = Field(default_factory=list, max_length=4)
    styles: list[str] = Field(default_factory=list, max_length=5)
    scent_groups: list[ScentGroup] = Field(default_factory=list, max_length=5)
    notes: list[str] = Field(default_factory=list, max_length=10)
    max_budget: float | None = Field(default=None, ge=0)
    wants_products: bool = True
    compare_products: list[str] = Field(default_factory=list, max_length=3)

    def has_criteria(self) -> bool:
        return bool(
            self.gender or self.occasions or self.seasons or self.styles
            or self.scent_groups or self.notes or self.max_budget
        )


Intent = Literal["recommend", "compare", "clarify", "chat"]


class RecommendResponse(BaseModel):
    reply: str
    product_ids: list[str] = Field(default_factory=list, max_length=3)
    preferences: Preferences

