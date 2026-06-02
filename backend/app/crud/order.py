from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.customer import Customer
from app.schemas.order import OrderCreate, OrderUpdate

# ── Valid status transitions ────────────────────────────────
# Only pending orders can move forward.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending":   {"completed", "cancelled"},
    "completed": set(),   # locked — no further changes
    "cancelled": set(),   # locked — no further changes
}

STATUS_LOCK_REASON = {
    "completed": "Completed orders cannot be changed.",
    "cancelled": "Cancelled orders cannot be changed.",
}


def _load_order(db: Session, order_id: int) -> Order:
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def _restore_stock(db: Session, order: Order) -> None:
    """Return all items' quantities back to their products."""
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.quantity += item.quantity


def _validate_items(items, db: Session) -> list[tuple[Product, int, Decimal]]:
    """
    Validate a list of OrderItemCreate against current stock.
    Returns validated tuples: (product, qty, unit_price).
    Raises HTTPException on any violation.
    """
    seen_ids: set[int] = set()
    validated = []

    for item in items:
        if item.product_id in seen_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate product ID {item.product_id}. Each product must appear only once.",
            )
        seen_ids.add(item.product_id)

        if item.quantity < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantity must be at least 1 (product ID {item.product_id})",
            )

        product = (
            db.query(Product)
            .filter(Product.id == item.product_id)
            .with_for_update()
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found",
            )
        if product.quantity == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{product.name}' is out of stock",
            )
        if product.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product.name}'. "
                    f"Available: {product.quantity}, Requested: {item.quantity}"
                ),
            )
        validated.append((product, item.quantity, Decimal(str(product.price))))

    return validated


# ── Public API ──────────────────────────────────────────────

def get_order(db: Session, order_id: int) -> Order:
    return _load_order(db, order_id)


def get_orders(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
):
    q = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.items).joinedload(OrderItem.product),
    )
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.id.desc()).offset(skip).limit(limit).all()


def create_order(db: Session, order: OrderCreate) -> Order:
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {order.customer_id} not found",
        )

    validated = _validate_items(order.items, db)
    total_amount = sum(p.price * qty for p, qty, _ in validated)

    db_order = Order(customer_id=order.customer_id, total_amount=total_amount, status="pending")
    db.add(db_order)
    db.flush()

    for product, qty, unit_price in validated:
        db.add(OrderItem(order_id=db_order.id, product_id=product.id, quantity=qty, unit_price=unit_price))
        product.quantity -= qty

    db.commit()
    return _load_order(db, db_order.id)


def update_order_items(db: Session, order_id: int, payload: OrderUpdate) -> Order:
    """Replace all line items on a PENDING order, adjusting stock accordingly."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status != "pending":
        reason = STATUS_LOCK_REASON.get(order.status, "This order cannot be edited.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit order — {reason}",
        )

    # Step 1: restore stock for every current item (so _validate_items sees fresh numbers)
    _restore_stock(db, order)
    db.flush()

    # Step 2: validate new items against refreshed stock
    validated = _validate_items(payload.items, db)
    total_amount = sum(p.price * qty for p, qty, _ in validated)

    # Step 3: delete old order items
    for item in list(order.items):
        db.delete(item)
    db.flush()

    # Step 4: create new order items & deduct stock
    for product, qty, unit_price in validated:
        db.add(OrderItem(order_id=order_id, product_id=product.id, quantity=qty, unit_price=unit_price))
        product.quantity -= qty

    order.total_amount = total_amount
    db.commit()
    return _load_order(db, order_id)


def update_order_status(db: Session, order_id: int, new_status: str) -> Order:
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status == new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is already '{new_status}'",
        )

    allowed = ALLOWED_TRANSITIONS.get(order.status, set())
    if new_status not in allowed:
        if order.status in STATUS_LOCK_REASON:
            detail = f"Cannot change status — {STATUS_LOCK_REASON[order.status]}"
        else:
            detail = (
                f"Invalid transition: '{order.status}' → '{new_status}'. "
                f"Allowed: {', '.join(allowed) or 'none'}"
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    # Cancelling restores stock
    if new_status == "cancelled":
        _restore_stock(db, order)

    order.status = new_status
    db.commit()
    return _load_order(db, order_id)


def delete_order(db: Session, order_id: int) -> dict:
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status in STATUS_LOCK_REASON:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete order — {STATUS_LOCK_REASON[order.status]}",
        )

    _restore_stock(db, order)
    db.delete(order)
    db.commit()
    return {"message": "Order deleted and stock restored"}
