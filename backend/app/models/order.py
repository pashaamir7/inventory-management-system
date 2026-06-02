from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class OrderItem(Base):
    __tablename__ = "order_items"

    id         = Column(Integer, primary_key=True, index=True)
    order_id   = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity   = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)

    order   = relationship("Order", back_populates="items")
    product = relationship("Product")


class Order(Base):
    __tablename__ = "orders"

    id           = Column(Integer, primary_key=True, index=True)
    customer_id  = Column(Integer, ForeignKey("customers.id"), nullable=False)
    status       = Column(String(50), nullable=False, default="pending")
    total_amount = Column(Numeric(10, 2), nullable=False, default=0)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer")
    items    = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
