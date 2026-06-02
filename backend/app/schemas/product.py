from pydantic import BaseModel, Field, field_validator
from decimal import Decimal
from typing import Optional


class ProductBase(BaseModel):
    name:        str            = Field(..., min_length=1, max_length=255)
    sku:         str            = Field(..., min_length=1, max_length=100)
    price:       Decimal        = Field(..., gt=0)
    quantity:    int            = Field(..., ge=0)
    description: Optional[str] = Field(None, max_length=1000)

    @field_validator("sku")
    @classmethod
    def sku_uppercase(cls, v: str) -> str:
        return v.strip().upper()


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name:        Optional[str]     = Field(None, min_length=1, max_length=255)
    sku:         Optional[str]     = Field(None, min_length=1, max_length=100)
    price:       Optional[Decimal] = Field(None, gt=0)
    quantity:    Optional[int]     = Field(None, ge=0)
    description: Optional[str]    = Field(None, max_length=1000)

    @field_validator("sku")
    @classmethod
    def sku_uppercase(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v is not None else v


class ProductResponse(ProductBase):
    id: int
    model_config = {"from_attributes": True}
