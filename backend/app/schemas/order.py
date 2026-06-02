from pydantic import BaseModel, Field
from decimal import Decimal
from typing import List, Optional
from datetime import datetime

from app.schemas.product import ProductResponse
from app.schemas.customer import CustomerResponse


class OrderItemCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., ge=1, description="Must be a positive integer")


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    product: Optional[ProductResponse] = None

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderUpdate(BaseModel):
    """Update the line items of a pending order."""
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|completed|cancelled)$")


class OrderResponse(BaseModel):
    id: int
    customer_id: int
    status: str
    total_amount: Decimal
    created_at: Optional[datetime] = None
    customer: Optional[CustomerResponse] = None
    items: List[OrderItemResponse] = []

    model_config = {"from_attributes": True}
