from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def get_customers(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    q = db.query(Customer)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(Customer.full_name.ilike(term) | Customer.email.ilike(term))
    return q.order_by(Customer.id.desc()).offset(skip).limit(limit).all()


def create_customer(db: Session, customer: CustomerCreate) -> Customer:
    existing = db.query(Customer).filter(Customer.email == customer.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with email '{customer.email}' already exists",
        )
    db_customer = Customer(**customer.model_dump())
    db.add(db_customer)
    try:
        db.commit()
        db.refresh(db_customer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
    return db_customer


def delete_customer(db: Session, customer_id: int) -> dict:
    db_customer = get_customer(db, customer_id)
    db.delete(db_customer)
    db.commit()
    return {"message": "Customer deleted successfully"}
