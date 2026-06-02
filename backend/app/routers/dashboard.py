from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import APIRouter, Depends

from app.database import get_db
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import Order

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

LOW_STOCK_THRESHOLD = 10


@router.get("")
def get_dashboard(db: Session = Depends(get_db)):
    total_products  = db.query(Product).count()
    total_customers = db.query(Customer).count()
    total_orders    = db.query(Order).count()

    pending_orders   = db.query(Order).filter(Order.status == "pending").count()
    completed_orders = db.query(Order).filter(Order.status == "completed").count()

    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.status == "completed"
    ).scalar() or 0

    low_stock = (
        db.query(Product)
        .filter(Product.quantity <= LOW_STOCK_THRESHOLD)
        .order_by(Product.quantity.asc())
        .all()
    )

    out_of_stock = sum(1 for p in low_stock if p.quantity == 0)

    return {
        "total_products":  total_products,
        "total_customers": total_customers,
        "total_orders":    total_orders,
        "pending_orders":  pending_orders,
        "completed_orders": completed_orders,
        "total_revenue":   float(total_revenue),
        "out_of_stock_count": out_of_stock,
        "low_stock_products": [
            {
                "id":       p.id,
                "name":     p.name,
                "sku":      p.sku,
                "quantity": p.quantity,
                "price":    float(p.price),
            }
            for p in low_stock
        ],
    }
