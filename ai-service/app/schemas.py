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


class RecommendRequest(BaseModel):
    mode: Mode = "basic"
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


class RecommendResponse(BaseModel):
    reply: str
    product_ids: list[str] = Field(default_factory=list, max_length=3)
    preferences: Preferences

