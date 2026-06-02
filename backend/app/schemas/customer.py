from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class CustomerBase(BaseModel):
    full_name: str            = Field(..., min_length=1, max_length=255)
    email:     EmailStr
    phone:     Optional[str] = Field(None, max_length=50)


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: int
    model_config = {"from_attributes": True}
