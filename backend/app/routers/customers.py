from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.crud import customer as crud_customer

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    return crud_customer.create_customer(db, customer)


@router.get("", response_model=List[CustomerResponse])
def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
):
    return crud_customer.get_customers(db, skip=skip, limit=limit, search=search)


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    return crud_customer.get_customer(db, customer_id)


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    return crud_customer.delete_customer(db, customer_id)
