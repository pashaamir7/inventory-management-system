import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.database import engine, Base, SessionLocal
from app.routers import products, customers, orders, dashboard

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — creating database tables…")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Inventory & Order Management API",
    description=(
        "Production-ready REST API for managing products, customers, and orders. "
        "Full inventory tracking with automatic stock deduction and restoration."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed:.1f}"
    return response


app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "Inventory & Order Management API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    db = SessionLocal()
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_status = "healthy"
    except OperationalError:
        db_status = "unhealthy"
    finally:
        db.close()
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
    }
