from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderStatusUpdate
from app.crud import order as crud_order

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    return crud_order.create_order(db, order)


@router.get("", response_model=List[OrderResponse])
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None, description="Filter by status: pending | completed | cancelled"),
    db: Session = Depends(get_db),
):
    return crud_order.get_orders(db, skip=skip, limit=limit, status=status)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return crud_order.get_order(db, order_id)


@router.put("/{order_id}", response_model=OrderResponse)
def update_order_items(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)):
    """Replace the line items of a PENDING order. Stock is adjusted automatically."""
    return crud_order.update_order_items(db, order_id, payload)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    """
    Update order status. Allowed transitions:
    - pending → completed
    - pending → cancelled  (restores stock automatically)
    """
    return crud_order.update_order_status(db, order_id, payload.status)


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    return crud_order.delete_order(db, order_id)
