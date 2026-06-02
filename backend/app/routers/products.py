from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.crud import product as crud_product

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    return crud_product.create_product(db, product)


@router.get("", response_model=List[ProductResponse])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    db: Session = Depends(get_db),
):
    return crud_product.get_products(db, skip=skip, limit=limit, search=search)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return crud_product.get_product(db, product_id)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db)):
    return crud_product.update_product(db, product_id, product)


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    return crud_product.delete_product(db, product_id)
