from sqlalchemy import Column, Integer, String, Numeric
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(255), nullable=False)
    sku         = Column(String(100), unique=True, nullable=False, index=True)
    price       = Column(Numeric(10, 2), nullable=False)
    quantity    = Column(Integer, nullable=False, default=0)
    description = Column(String(1000), nullable=True)
