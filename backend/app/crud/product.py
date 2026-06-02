from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


def get_product(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def get_products(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    q = db.query(Product)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(Product.name.ilike(term) | Product.sku.ilike(term))
    return q.order_by(Product.id.desc()).offset(skip).limit(limit).all()


def create_product(db: Session, product: ProductCreate) -> Product:
    existing = db.query(Product).filter(Product.sku == product.sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product.sku}' already exists",
        )
    db_product = Product(**product.model_dump())
    db.add(db_product)
    try:
        db.commit()
        db.refresh(db_product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")
    return db_product


def update_product(db: Session, product_id: int, product: ProductUpdate) -> Product:
    db_product = get_product(db, product_id)
    update_data = product.model_dump(exclude_unset=True)
    if "sku" in update_data:
        conflict = (
            db.query(Product)
            .filter(Product.sku == update_data["sku"], Product.id != product_id)
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{update_data['sku']}' is already in use",
            )
    for key, value in update_data.items():
        setattr(db_product, key, value)
    try:
        db.commit()
        db.refresh(db_product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already in use")
    return db_product


def delete_product(db: Session, product_id: int) -> dict:
    db_product = get_product(db, product_id)
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted successfully"}
