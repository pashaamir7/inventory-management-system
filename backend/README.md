# Backend - Inventory & Order Management API

A production-ready REST API built with **Python 3.11 + FastAPI** and **PostgreSQL**. Handles all business logic for product inventory, customer management, and order lifecycle including automatic stock deduction, restoration, and status transition enforcement.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Configuration & Environment Variables](#configuration--environment-variables)
4. [Running Locally (without Docker)](#running-locally-without-docker)
5. [Running with Docker](#running-with-docker)
6. [Database Models](#database-models)
7. [API Reference](#api-reference)
   - [Health](#health)
   - [Products](#products)
   - [Customers](#customers)
   - [Orders](#orders)
   - [Dashboard](#dashboard)
8. [Business Logic & Rules](#business-logic--rules)
9. [Status Transition Rules](#status-transition-rules)
10. [Error Handling](#error-handling)
11. [Deployment](#deployment)

---

## Tech Stack

| Dependency | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | 0.111 | Web framework + auto OpenAPI docs |
| Uvicorn | 0.29 | ASGI server |
| SQLAlchemy | 2.0 | ORM + query builder |
| PostgreSQL | 16 | Relational database |
| Psycopg2 | 2.9 | PostgreSQL driver |
| Pydantic v2 | 2.7 | Data validation & serialisation |
| Pydantic-Settings | 2.2 | Env-var based configuration |
| email-validator | 2.1 | Email format validation |

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app, CORS, middleware, lifespan
│   ├── config.py          # Settings loaded from environment variables
│   ├── database.py        # SQLAlchemy engine, session factory, Base
│   ├── models/
│   │   ├── __init__.py    # Imports all models (needed for Base.metadata)
│   │   ├── product.py     # Product ORM model
│   │   ├── customer.py    # Customer ORM model
│   │   └── order.py       # Order + OrderItem ORM models
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── product.py     # ProductCreate, ProductUpdate, ProductResponse
│   │   ├── customer.py    # CustomerCreate, CustomerResponse
│   │   └── order.py       # OrderCreate, OrderUpdate, OrderStatusUpdate, OrderResponse
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── product.py     # Product CRUD operations
│   │   ├── customer.py    # Customer CRUD operations
│   │   └── order.py       # Order CRUD + business logic
│   └── routers/
│       ├── __init__.py
│       ├── products.py    # /products routes
│       ├── customers.py   # /customers routes
│       ├── orders.py      # /orders routes
│       └── dashboard.py   # /dashboard route
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Configuration & Environment Variables

All settings are loaded from environment variables (or a `.env` file in development).

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/inventory_db` | Full PostgreSQL connection string |
| `SECRET_KEY` | `changeme-in-production` | Application secret - change this in production |
| `DEBUG` | `false` | Enable debug mode |

### Setup

```bash
cp .env.example .env
# Edit .env with your values
```

`.env.example`:
```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/inventory_db
SECRET_KEY=your-secret-key-here
DEBUG=false
```

---

## Running Locally (without Docker)

### Prerequisites
- Python 3.11+
- PostgreSQL 14+ running locally

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit DATABASE_URL to point to your local Postgres instance

# 4. Start the server (tables are created automatically on startup)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API base**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Running with Docker

The backend is included in the root `docker-compose.yml`. To run it standalone:

```bash
# Build the image
docker build -t ims-backend .

# Run with environment variables
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/dbname \
  -e SECRET_KEY=your-secret \
  ims-backend
```

---

## Database Models

### Product

| Column | Type | Constraints |
|---|---|---|
| `id` | Integer | PK, auto-increment |
| `name` | String(255) | NOT NULL |
| `sku` | String(100) | NOT NULL, UNIQUE, indexed |
| `price` | Numeric(10,2) | NOT NULL |
| `quantity` | Integer | NOT NULL, default 0 |
| `description` | String(1000) | nullable |

### Customer

| Column | Type | Constraints |
|---|---|---|
| `id` | Integer | PK, auto-increment |
| `full_name` | String(255) | NOT NULL |
| `email` | String(255) | NOT NULL, UNIQUE, indexed |
| `phone` | String(50) | nullable |

### Order

| Column | Type | Constraints |
|---|---|---|
| `id` | Integer | PK, auto-increment |
| `customer_id` | Integer | FK → customers.id |
| `status` | String(50) | NOT NULL, default `"pending"` |
| `total_amount` | Numeric(10,2) | NOT NULL |
| `created_at` | DateTime(tz) | server default: `now()` |

### OrderItem

| Column | Type | Constraints |
|---|---|---|
| `id` | Integer | PK, auto-increment |
| `order_id` | Integer | FK → orders.id, CASCADE DELETE |
| `product_id` | Integer | FK → products.id |
| `quantity` | Integer | NOT NULL |
| `unit_price` | Numeric(10,2) | NOT NULL (price at time of order) |

---

## API Reference

All endpoints return JSON. All request bodies must have `Content-Type: application/json`.

### Health

#### `GET /`
Returns service info.

**Response `200`**
```json
{
  "service": "Inventory & Order Management API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs"
}
```

#### `GET /health`
Deep health check - pings the database.

**Response `200`**
```json
{ "status": "healthy", "database": "healthy" }
```

---

### Products

#### `POST /products`
Create a new product. SKU is automatically uppercased.

**Request body**
```json
{
  "name": "Wireless Mouse",
  "sku": "wm-001",
  "price": 24.99,
  "quantity": 150,
  "description": "Optional description"
}
```

**Validation rules**
- `name`: 1–255 characters, required
- `sku`: 1–100 characters, required, must be unique
- `price`: positive number, required
- `quantity`: integer ≥ 0, required
- `description`: up to 1000 characters, optional

**Response `201`** - ProductResponse object  
**Error `400`** - SKU already exists

---

#### `GET /products`
List all products with optional search and pagination.

**Query parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | - | Filter by name or SKU (case-insensitive) |
| `skip` | int | 0 | Pagination offset |
| `limit` | int | 100 | Max results (max 500) |

**Response `200`** - Array of ProductResponse

---

#### `GET /products/{id}`
Retrieve a single product by ID.

**Response `200`** - ProductResponse  
**Error `404`** - Product not found

---

#### `PUT /products/{id}`
Partially update a product. Only supply fields you want to change.

**Request body** (all fields optional)
```json
{
  "name": "New Name",
  "sku": "NEW-SKU",
  "price": 29.99,
  "quantity": 200,
  "description": "Updated description"
}
```

**Response `200`** - Updated ProductResponse  
**Error `400`** - SKU conflict  
**Error `404`** - Product not found

---

#### `DELETE /products/{id}`
Delete a product permanently.

**Response `200`**
```json
{ "message": "Product deleted successfully" }
```
**Error `404`** - Product not found

---

### Customers

#### `POST /customers`
Create a new customer. Email is stored lowercase.

**Request body**
```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1 555 000 0000"
}
```

**Validation rules**
- `full_name`: 1–255 characters, required
- `email`: valid email format, required, must be unique
- `phone`: up to 50 characters, optional

**Response `201`** - CustomerResponse  
**Error `400`** - Email already exists

---

#### `GET /customers`
List all customers with optional search and pagination.

**Query parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | - | Filter by full name or email |
| `skip` | int | 0 | Pagination offset |
| `limit` | int | 100 | Max results (max 500) |

**Response `200`** - Array of CustomerResponse

---

#### `GET /customers/{id}`
**Response `200`** - CustomerResponse  
**Error `404`** - Customer not found

---

#### `DELETE /customers/{id}`
**Response `200`**
```json
{ "message": "Customer deleted successfully" }
```

---

### Orders

#### `POST /orders`
Create a new order. Stock is deducted automatically. Total is calculated server-side.

**Request body**
```json
{
  "customer_id": 1,
  "items": [
    { "product_id": 3, "quantity": 2 },
    { "product_id": 7, "quantity": 1 }
  ]
}
```

**Validation rules**
- `customer_id`: must reference an existing customer
- `items`: at least 1 item required
- Each `product_id` must be unique within the order (no duplicates)
- Each `quantity` must be ≥ 1
- Stock must be sufficient for each item
- Row-level `SELECT ... FOR UPDATE` locks prevent race conditions

**Response `201`** - Full OrderResponse with nested customer and items  
**Error `400`** - Duplicate product, insufficient stock, out of stock  
**Error `404`** - Customer or product not found

---

#### `GET /orders`
List orders with optional status filter and pagination.

**Query parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `status` | string | - | Filter: `pending`, `completed`, `cancelled` |
| `skip` | int | 0 | Pagination offset |
| `limit` | int | 100 | Max results (max 500) |

**Response `200`** - Array of OrderResponse (newest first)

---

#### `GET /orders/{id}`
**Response `200`** - Full OrderResponse with customer and line items  
**Error `404`** - Order not found

---

#### `PUT /orders/{id}`
Replace the line items on a **pending** order. Stock is adjusted automatically:
1. Old items' stock is restored
2. New items are validated against current stock
3. New stock is deducted
4. Total is recalculated

**Request body**
```json
{
  "items": [
    { "product_id": 1, "quantity": 3 },
    { "product_id": 5, "quantity": 1 }
  ]
}
```

**Response `200`** - Updated OrderResponse  
**Error `400`** - Order is not pending / duplicate product / insufficient stock

---

#### `PATCH /orders/{id}/status`
Update the status of an order. See [Status Transition Rules](#status-transition-rules).

**Request body**
```json
{ "status": "completed" }
```

Allowed values: `pending`, `completed`, `cancelled`

**Response `200`** - Updated OrderResponse  
**Error `400`** - Invalid transition or order already has that status

---

#### `DELETE /orders/{id}`
Permanently delete an order. Only allowed on **pending** orders. Stock is restored.

**Response `200`**
```json
{ "message": "Order deleted and stock restored" }
```
**Error `400`** - Order is completed or cancelled (locked)

---

### Dashboard

#### `GET /dashboard`
Returns aggregated statistics for the management dashboard.

**Response `200`**
```json
{
  "total_products": 20,
  "total_customers": 10,
  "total_orders": 10,
  "pending_orders": 10,
  "completed_orders": 0,
  "total_revenue": 0.00,
  "out_of_stock_count": 1,
  "low_stock_products": [
    {
      "id": 20,
      "name": "Monitor Light Bar",
      "sku": "MLB-020",
      "quantity": 0,
      "price": 37.99
    }
  ]
}
```

> Products with quantity ≤ 10 are included in `low_stock_products`. Products with quantity = 0 are also counted in `out_of_stock_count`.

---

## Business Logic & Rules

| Rule | Detail |
|---|---|
| **Unique SKU** | SKUs are normalised to uppercase and must be unique across all products |
| **Unique Email** | Customer emails are stored lowercase and must be unique |
| **No negative stock** | `quantity` field enforced ≥ 0 at schema and DB level |
| **Duplicate products in order** | An order cannot contain the same `product_id` more than once |
| **Minimum quantity** | Every order item must have `quantity ≥ 1` |
| **Stock check on create** | If any item has insufficient stock, the entire order is rejected |
| **Atomic stock deduction** | `SELECT ... FOR UPDATE` row locks prevent overselling under concurrent load |
| **Auto stock deduction** | Creating an order reduces `product.quantity` for each item |
| **Auto stock restoration on cancel** | Changing status to `cancelled` restores all item quantities |
| **Auto stock restoration on delete** | Deleting a pending order restores all item quantities |
| **Auto stock adjustment on edit** | Editing order items restores old quantities then deducts new ones |
| **Server-side total** | `total_amount` is always calculated by the backend using `unit_price × quantity` |
| **Price snapshot** | `unit_price` is captured at order creation time; future product price changes don't affect existing orders |

---

## Status Transition Rules

```
pending ──→ completed   (allowed - finalises the order)
pending ──→ cancelled   (allowed - restores stock)
completed ──→ *         (BLOCKED - completed orders are locked)
cancelled ──→ *         (BLOCKED - cancelled orders are locked)
```

Attempting an invalid transition returns HTTP `400` with a descriptive message.

---

## Error Handling

All errors follow FastAPI's standard format:

```json
{
  "detail": "Human-readable error message"
}
```

| Status Code | Meaning |
|---|---|
| `400 Bad Request` | Validation failure, business rule violation |
| `404 Not Found` | Resource does not exist |
| `422 Unprocessable Entity` | Request body fails Pydantic schema validation |
| `500 Internal Server Error` | Unexpected server error |

Every response also includes an `X-Process-Time-Ms` header showing the request duration in milliseconds.

---

## Deployment

### Render (recommended free tier)

1. Push the `backend/` directory to a GitHub repository
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set the following:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables in the Render dashboard:
   - `DATABASE_URL` - from Render's PostgreSQL add-on
   - `SECRET_KEY` - a random 32+ character string

### Docker Hub

```bash
# Build and tag
docker build -t yourusername/ims-backend:latest .

# Push
docker push yourusername/ims-backend:latest
```

### Railway / Fly.io

Both platforms auto-detect `Dockerfile`. Set the same environment variables as above via their respective dashboards.
