# Inventory & Order Management System

A full-stack, production-ready, fully containerised web application for managing products, customers, and orders. Built with a React frontend, a Python FastAPI backend, and a PostgreSQL database - all orchestrated by Docker Compose.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Complete File Structure](#complete-file-structure)
5. [Quick Start](#quick-start)
6. [All Features Implemented](#all-features-implemented)
   - [Dashboard](#-dashboard)
   - [Product Management](#-product-management)
   - [Customer Management](#-customer-management)
   - [Order Management](#-order-management)
   - [Order Detail & Lifecycle](#-order-detail--lifecycle)
7. [Business Logic & Rules](#-business-logic--rules)
8. [Order Status Transitions](#-order-status-transitions)
9. [Validation System](#-validation-system)
   - [Backend Validations](#backend-validations)
   - [Frontend Validations](#frontend-validations)
   - [Order Builder Validations](#order-builder-validations)
10. [REST API Reference](#-rest-api-reference)
11. [Database Schema](#-database-schema)
12. [UI / Design System](#-ui--design-system)
13. [Docker & Containerisation](#-docker--containerisation)
14. [Environment Variables](#-environment-variables)
15. [Seed Data](#-seed-data)
16. [Deployment Guide](#-deployment-guide)
17. [Development Guide](#-development-guide)

---

## Project Overview

This system allows businesses to:

- Maintain a **product catalog** with inventory tracking
- Manage a **customer database**
- Create and track **orders** with automatic stock adjustment
- Monitor the business through a **live dashboard**

Everything is containerised and production-ready - a single `docker compose up --build` command starts the entire system.

---

## Technology Stack

### Backend
| Technology | Version | Role |
|---|---|---|
| Python | 3.11 | Runtime language |
| FastAPI | 0.111 | Web framework, auto Swagger/ReDoc docs |
| Uvicorn | 0.29 | ASGI production server |
| SQLAlchemy | 2.0 | ORM and query builder |
| PostgreSQL | 16 | Relational database |
| Psycopg2-binary | 2.9 | PostgreSQL driver |
| Pydantic v2 | 2.7 | Data validation and serialisation |
| Pydantic-Settings | 2.2 | Environment-based configuration |
| email-validator | 2.1 | RFC-compliant email validation |

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 18.3 | UI component library |
| Vite | 5.2 | Build tool and dev server |
| React Router DOM | 6.23 | Client-side SPA routing |
| Axios | 1.7 | HTTP client with interceptors |
| Lucide React | 0.390 | Icon library (SVG) |
| React Hot Toast | 2.4 | Notification toasts |

### Infrastructure
| Technology | Role |
|---|---|
| Docker | Container runtime |
| Docker Compose | Multi-service orchestration |
| Nginx (alpine) | Frontend static file server with SPA routing |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User's Browser                    │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP :80
┌─────────────────────▼───────────────────────────────┐
│          Frontend Container (Nginx + React)          │
│  - Serves pre-built static files                     │
│  - SPA fallback: all routes → index.html             │
│  - Asset caching headers (1y immutable)              │
│  - Gzip compression enabled                          │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP :8001 (host) → :8000 (container)
┌─────────────────────▼───────────────────────────────┐
│           Backend Container (Uvicorn + FastAPI)       │
│  - REST API with full OpenAPI documentation          │
│  - CORS enabled for all origins                      │
│  - X-Process-Time-Ms header on every response        │
│  - Lifespan event: auto-creates DB tables on start   │
│  - Row-level locking for concurrent order safety     │
└─────────────────────┬───────────────────────────────┘
                      │ PostgreSQL :5432
┌─────────────────────▼───────────────────────────────┐
│              Database Container (PostgreSQL 16)       │
│  - Named volume: inventory_postgres_data             │
│  - Health check: pg_isready before backend starts    │
│  - Tables: products, customers, orders, order_items  │
└─────────────────────────────────────────────────────┘
```

---

## Complete File Structure

```
Pasha/
│
├── docker-compose.yml          # Orchestrates db + backend + frontend
├── .env.example                # Root env template
├── .gitignore
├── README.md                   # ← This file
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app, CORS, middleware, lifespan startup
│   │   ├── config.py           # Pydantic-Settings from env vars
│   │   ├── database.py         # SQLAlchemy engine, SessionLocal, Base, get_db
│   │   ├── models/
│   │   │   ├── __init__.py     # Imports all models (required for metadata)
│   │   │   ├── product.py      # Products table
│   │   │   ├── customer.py     # Customers table
│   │   │   └── order.py        # Orders + OrderItems tables with relationships
│   │   ├── schemas/
│   │   │   ├── product.py      # ProductCreate, ProductUpdate, ProductResponse
│   │   │   ├── customer.py     # CustomerCreate, CustomerResponse
│   │   │   └── order.py        # OrderCreate, OrderUpdate, OrderStatusUpdate, OrderResponse
│   │   ├── crud/
│   │   │   ├── product.py      # get, list (search/paginate), create, update, delete
│   │   │   ├── customer.py     # get, list (search/paginate), create, delete
│   │   │   └── order.py        # get, list, create, update items, update status, delete
│   │   └── routers/
│   │       ├── products.py     # /products - 5 endpoints
│   │       ├── customers.py    # /customers - 4 endpoints
│   │       ├── orders.py       # /orders - 6 endpoints
│   │       └── dashboard.py    # /dashboard - aggregated stats
│   ├── Dockerfile              # python:3.11-slim, installs deps, copies app
│   ├── requirements.txt        # Pinned dependency versions
│   ├── .env.example
│   ├── .dockerignore
│   └── README.md               # Full backend documentation
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.js       # Axios instance + error interceptor
    │   │   ├── products.js     # 5 product API helpers
    │   │   ├── customers.js    # 4 customer API helpers
    │   │   ├── orders.js       # 6 order API helpers
    │   │   └── dashboard.js    # 1 dashboard API helper
    │   ├── components/
    │   │   ├── Sidebar.jsx     # Collapsible nav with active state
    │   │   └── ConfirmDialog.jsx # Reusable delete/action confirmation
    │   ├── pages/
    │   │   ├── Dashboard.jsx   # Stats, recent orders, low stock panel
    │   │   ├── Products.jsx    # CRUD with search + stock badges
    │   │   ├── Customers.jsx   # CRUD with search + avatar initials
    │   │   ├── Orders.jsx      # List + create with full validation
    │   │   └── OrderDetail.jsx # Status panel + edit items + line items table
    │   ├── App.jsx             # Router + layout + topbar
    │   ├── main.jsx            # React DOM root with Toaster
    │   └── index.css           # 1,000+ line design system
    ├── index.html              # Vite entry - Inter font loaded here
    ├── vite.config.js
    ├── package.json
    ├── nginx.conf              # SPA routing + gzip + 1y asset cache
    ├── Dockerfile              # Multi-stage: node:20-alpine → nginx:alpine
    ├── .dockerignore
    ├── .env.example
    └── README.md               # Full frontend documentation
```

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd Pasha

# 2. Create your env file
cp .env.example .env

# 3. Build and start all 3 services
docker compose up --build -d

# 4. Open the app
# Frontend UI   → http://localhost
# API Docs      → http://localhost:8001/docs
# Health check  → http://localhost:8001/health
```

```bash
# Stop everything
docker compose down

# Stop and wipe the database
docker compose down -v
```

---

## All Features Implemented

### 🖥 Dashboard

Located at `/` - gives a live bird's-eye view of the entire business.

#### Stat Cards
Four metric cards with coloured icons:
- **Total Products** - count of all products in the catalog
- **Total Customers** - count of all registered customers
- **Total Orders** - count of all orders ever placed
- **Low Stock Items** - count of products at or below 10 units (turns amber when > 0)

#### Recent Orders Table
- Shows the **5 most recent orders**
- Columns: Order #, Customer, Total, Status (badge), Date
- Each order ID is a clickable link to the full Order Detail page

#### Low Stock Alert Panel
- Lists every product with **quantity ≤ 10**
- Each item shows: product name, SKU pill, stock badge (`Low - N` or `Out of stock`)
- **Visual progress bar** - fills proportionally to the 10-unit threshold; red when 0, amber otherwise
- "Manage" link goes directly to the Products page

#### Refresh Button
- Reloads all dashboard data without a full page reload
- Spinner animates while fetching

---

### 📦 Product Management

Located at `/products` - full CRUD for the product catalog.

#### Features
- **Live search** - client-side instant filter by name or SKU (no API call)
- **Result count** - shows "N results" when searching
- **Add Product** - opens a modal form
- **Edit Product** - pre-fills modal with all current values
- **Delete Product** - requires confirmation dialog
- **Stock badges** - colour-coded:
  - 🟢 Green: > 10 in stock (shows quantity)
  - 🟡 Yellow: 1–10 in stock (`Low - N`)
  - 🔴 Red: Out of stock
- **SKU pills** - monospace styled for visual distinction
- **Empty state** - illustrated prompt with "Add Product" CTA when catalog is empty
- **No-results state** - graceful message when search finds nothing

#### Add / Edit Modal Fields
| Field | Type | Rules |
|---|---|---|
| Product Name | Text | Required, 1–255 chars |
| SKU / Code | Text | Required, 1–100 chars, auto-uppercased |
| Price (USD) | Number | Required, > 0 |
| Quantity in Stock | Number | Required, ≥ 0 |
| Description | Textarea | Optional, up to 1000 chars |

---

### 👤 Customer Management

Located at `/customers` - customer database with unique email enforcement.

#### Features
- **Live search** - filter by full name, email, or phone number
- **Add Customer** - modal form with email validation
- **Delete Customer** - confirmation dialog
- **Colour-coded avatar initials** - auto-generated from the customer's name, cycling through 6 brand colours (indigo, emerald, amber, sky, violet, rose)
- **Email + phone icons** - visual indicators next to contact details
- **Empty state** with CTA

#### Add Customer Form
| Field | Type | Rules |
|---|---|---|
| Full Name | Text | Required |
| Email Address | Email | Required, valid format, must be globally unique |
| Phone Number | Text | Optional |

---

### 🛒 Order Management

Located at `/orders` - order tracking with a powerful creation workflow.

#### Order List Features
- **Live search** - filter by order # or customer name
- **Status badges** - Yellow (pending), Green (completed), Red (cancelled)
- **Item count badge** - shows number of line items per order
- **Edit button** - appears only for `pending` orders, links to Order Detail
- **Cancel button** - appears only for `pending` orders, requires confirmation, restores stock automatically
- **Empty state** with CTA

#### Create Order Modal

A multi-step order builder with comprehensive real-time validation:

**Customer selection**
- Dropdown of all registered customers with name + email

**Order Items builder**
- Add any number of product rows
- Each row has:
  - **Product dropdown** - shows name, price, and live stock count
  - **Quantity input** - min 1, max capped at available stock
  - **Remove button** - disabled when only 1 row remains
  - **Per-row subtotal** - live calculation shown below each row
- **Add Another Item** button

**Live total box** - shows total with item count while building the order

**Full validation system (detailed in [Validation System](#-validation-system))**

---

### 📋 Order Detail & Lifecycle

Located at `/orders/:id` - complete order view with management controls.

#### Status Panel (top of page)

The status panel provides full lifecycle management:

**Visual Progress Timeline**
- Horizontal timeline with numbered steps: `pending → completed`
- The connecting bar fills with a success colour when the order is completed
- Cancelled orders show a separate "Cancelled - stock restored" indicator

**Action Buttons** (only shown for `pending` orders)
- **Mark as Completed** (green) - transitions to `completed`
- **Cancel Order** (red) - transitions to `cancelled` and restores all stock

Each action requires a **confirmation dialog** before executing.

**Lock State** (for completed or cancelled orders)
- A padlock icon and message explain why no further changes are possible
- Example: *"This order is completed and cannot be modified."*

#### Edit Items (pending orders only)

Accessed via the "Edit Items" button in the page header or on the line items card.

**Edit Items Modal:**
- Pre-filled with all current order items and quantities
- Stock counts shown include what the current order is holding (so you see true available numbers)
- Same full validation as create: duplicates, stock limits, auto-merge
- On save:
  1. Old item stock is restored
  2. New items are validated against refreshed stock
  3. New stock is deducted
  4. Total is recalculated
- Info banner explains the stock accounting behaviour

#### Customer Card
- Full name, email address, phone number, customer ID

#### Order Summary Card
- Order ID, status badge, item count, total amount (large styled figure)

#### Line Items Table
- Columns: Row #, Product Name, SKU, Unit Price, Quantity (badge), Subtotal
- Grand total footer row
- "Edit Items" shortcut button in the card header

#### Delete Order
- Available only for `pending` orders
- Restores all stock before deleting
- Requires confirmation

---

## ✅ Business Logic & Rules

Every rule is enforced at **both** the frontend (UX feedback) and the backend (API rejection):

| # | Rule | Details |
|---|---|---|
| 1 | **Unique SKU** | SKUs are normalised to uppercase and must be unique globally. Attempting to create or update to a duplicate SKU returns HTTP 400. |
| 2 | **Unique Email** | Customer emails are stored lowercase. Duplicate emails return HTTP 400. |
| 3 | **No negative stock** | `quantity` is enforced ≥ 0 at the schema level (Pydantic) and database level. |
| 4 | **No duplicate products per order** | Each `product_id` may appear only once per order. Duplicates return HTTP 400. |
| 5 | **Minimum quantity** | Every order item must have `quantity ≥ 1`. |
| 6 | **Stock check on create** | If any item lacks sufficient stock, the **entire order** is rejected atomically. |
| 7 | **Race condition protection** | `SELECT ... FOR UPDATE` row-level locks prevent two concurrent orders from overselling the same product. |
| 8 | **Auto stock deduction** | Creating an order immediately reduces `product.quantity` for every item. |
| 9 | **Auto stock restoration on cancel** | Changing status to `cancelled` restores all item quantities to their products. |
| 10 | **Auto stock restoration on delete** | Deleting a pending order restores all item quantities. |
| 11 | **Auto stock adjustment on edit** | Editing order items: old stock is restored first, then new items are deducted. |
| 12 | **Price snapshot** | `unit_price` is captured at order creation time from the product's current price. Future product price changes do not affect existing orders. |
| 13 | **Server-side total calculation** | `total_amount` is always calculated by the backend. The frontend's estimated total is informational only. |
| 14 | **Status lock** | Completed and cancelled orders cannot have their status changed or items edited. |
| 15 | **Delete lock** | Completed and cancelled orders cannot be deleted. |

---

## 🔄 Order Status Transitions

```
              ┌─────────────────────────────┐
              │                             │
           CREATE                           │
              │                             │
              ▼                             │
         ┌─────────┐                        │
         │ PENDING │                        │
         └────┬────┘                        │
              │                             │
    ┌─────────┴──────────┐                  │
    │                    │                  │
    ▼                    ▼                  │
┌───────────┐      ┌───────────┐            │
│ COMPLETED │      │ CANCELLED │            │
│  (locked) │      │  (locked) │            │
└───────────┘      └───────────┘            │
                         │                  │
                  Stock restored ───────────┘
```

| From | To | Allowed | Side Effect |
|---|---|---|---|
| `pending` | `completed` | ✅ | None - order is finalised |
| `pending` | `cancelled` | ✅ | All item quantities restored to products |
| `completed` | any | ❌ | HTTP 400: "Completed orders cannot be changed" |
| `cancelled` | any | ❌ | HTTP 400: "Cancelled orders cannot be changed" |
| any | same status | ❌ | HTTP 400: "Order is already 'X'" |

---

## 🛡 Validation System

### Backend Validations

Enforced via **Pydantic schemas** (request body) and **CRUD layer** (business rules):

#### Product
- `name`: 1–255 characters
- `sku`: 1–100 characters, auto-uppercased via `@field_validator`
- `price`: `Decimal`, must be > 0
- `quantity`: integer, must be ≥ 0
- SKU uniqueness: checked before insert and on update with conflict detection

#### Customer
- `full_name`: 1–255 characters
- `email`: validated by `email-validator` library (RFC compliant)
- Email uniqueness: checked before insert

#### Order (Create & Edit)
- `customer_id`: must reference an existing customer row
- `items`: at least 1 item required (`min_length=1`)
- Each `product_id`: must be positive integer, must reference an existing product
- No duplicate `product_id` values within one order - checked via a `seen_ids` set
- Each `quantity`: must be `≥ 1` (Pydantic `ge=1`)
- Out-of-stock check: `product.quantity == 0` → specific error
- Insufficient stock: `product.quantity < requested` → specific error with available count

#### Order Status Update
- `status`: Pydantic regex pattern `^(pending|completed|cancelled)$`
- Transition validation: checked against `ALLOWED_TRANSITIONS` dict in CRUD layer

### Frontend Validations

Client-side validation runs **on submit** and then **on every change** after the first submission attempt (progressive validation UX).

#### Product Form
| Field | Error Message |
|---|---|
| Empty name | "Product name is required" |
| Empty SKU | "SKU is required" |
| Missing/zero/negative price | "Enter a valid positive price" |
| Missing/negative quantity | "Quantity must be 0 or more" |

#### Customer Form
| Field | Error Message |
|---|---|
| Empty name | "Full name is required" |
| Empty email | "Email is required" |
| Invalid email format | "Enter a valid email address" |

### Order Builder Validations

| Trigger | Behaviour |
|---|---|
| No customer selected | Error under dropdown: "Please select a customer" |
| No product selected for a row | Error under selector: "Select a product" |
| Quantity empty or < 1 | Error: "Minimum quantity is 1" |
| Non-integer quantity (e.g. 1.5) | Error: "Must be a whole number" |
| Quantity > available stock | Error: "Only N available" |
| Product is out of stock | Option **disabled** in dropdown with "(out of stock)" label; inline red chip: "Out of stock" |
| Product already in another row | Option **disabled** in dropdown with "(already added)" label |
| Duplicate product selected | **Auto-merge**: the new quantity is added to the existing row, duplicate row is removed, toast confirms - *"Quantities merged for 'X' → N units"* |
| Merge would exceed stock | Merge **blocked** with error toast: "Cannot merge: combined quantity (N) exceeds available stock (M)" |
| 1–5 units would remain after order | Amber info chip: "N will remain after order" |
| Duplicate banner | Yellow warning banner lists all duplicated product names if somehow both rows still exist |
| Per-row subtotal | Live calculation: `qty × price = subtotal` shown below each item row |
| Order total box | Animated total box shows item count and grand total |

---

## 🌐 REST API Reference

All endpoints are also available interactively at **`http://localhost:8001/docs`** (Swagger UI).

### Base URL
```
http://localhost:8001
```

### Products - `/products`
| Method | Path | Description |
|---|---|---|
| `GET` | `/products` | List all products (`?search=`, `?skip=`, `?limit=`) |
| `POST` | `/products` | Create a product |
| `GET` | `/products/{id}` | Get product by ID |
| `PUT` | `/products/{id}` | Partially update a product |
| `DELETE` | `/products/{id}` | Delete a product |

### Customers - `/customers`
| Method | Path | Description |
|---|---|---|
| `GET` | `/customers` | List all customers (`?search=`, `?skip=`, `?limit=`) |
| `POST` | `/customers` | Create a customer |
| `GET` | `/customers/{id}` | Get customer by ID |
| `DELETE` | `/customers/{id}` | Delete a customer |

### Orders - `/orders`
| Method | Path | Description |
|---|---|---|
| `GET` | `/orders` | List all orders (`?status=`, `?skip=`, `?limit=`) |
| `POST` | `/orders` | Create an order (deducts stock) |
| `GET` | `/orders/{id}` | Get full order with customer + items |
| `PUT` | `/orders/{id}` | Replace line items (pending only, adjusts stock) |
| `PATCH` | `/orders/{id}/status` | Change order status with transition validation |
| `DELETE` | `/orders/{id}` | Delete order (pending only, restores stock) |

### Dashboard & Health
| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard` | Stats, revenue, low-stock list |
| `GET` | `/health` | Service health + database ping |
| `GET` | `/` | Service info |

### Response Headers
Every response includes:
- `X-Process-Time-Ms` - request duration in milliseconds (added by middleware)

---

## 🗄 Database Schema

```sql
-- Products
CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    sku         VARCHAR(100) NOT NULL UNIQUE,
    price       NUMERIC(10,2) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 0,
    description VARCHAR(1000)
);

-- Customers
CREATE TABLE customers (
    id        SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email     VARCHAR(255) NOT NULL UNIQUE,
    phone     VARCHAR(50)
);

-- Orders
CREATE TABLE orders (
    id           SERIAL PRIMARY KEY,
    customer_id  INTEGER NOT NULL REFERENCES customers(id),
    status       VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items (junction table)
CREATE TABLE order_items (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity   INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL  -- price snapshot at time of order
);
```

> Tables are created **automatically** via SQLAlchemy `Base.metadata.create_all()` on backend startup.

---

## 🎨 UI / Design System

The entire design system lives in `frontend/src/index.css` - ~1,050 lines of CSS using custom properties. No external CSS framework is used.

### Design Tokens
```css
/* Brand Palette */
--primary:       #6366f1;   /* Indigo 500 */
--primary-dark:  #4f46e5;   /* Indigo 600 */
--success:       #10b981;   /* Emerald 500 */
--warning:       #f59e0b;   /* Amber 500 */
--danger:        #ef4444;   /* Red 500 */

/* Neutral Scale (Slate) */
--gray-50  to  --gray-950

/* Sidebar */
--sidebar-bg:  #0f172a;     /* Slate 950 */
```

### Typography
- **Font**: Inter (variable weight 300–800, loaded from Google Fonts)
- **Antialiasing**: `-webkit-font-smoothing: antialiased`

### Key UI Components

| Component | Description |
|---|---|
| Stat Cards | Lift-on-hover, coloured icon, large bold value, optional trend badge |
| Progress bars | CSS gradient bars for low-stock visualisation |
| Status Timeline | Step circles + connecting bar for order lifecycle |
| Sidebar | Dark (`#0f172a`), active link with left-border indicator, mobile slide-in |
| Modals | Blur backdrop, slide-up animation (`slideUp` keyframe), sticky header/footer |
| Tables | Hover highlight, uppercase column headers, responsive horizontal scroll |
| Badges | Rounded pill with coloured dot prefix |
| SKU Pills | Monospace border pill |
| Search Box | Icon-embedded input with focus ring |
| Toasts | Right-aligned, Inter font, 10px border-radius, shadow |
| Confirm Dialog | Warning icon + blur backdrop + Cancel / Confirm |
| Empty States | Centred icon box + copy + action CTA |
| Avatar Initials | Auto-coloured circles from 6 brand colour pairs |

### Animations
- `fadeIn` - modal backdrop opacity
- `slideUp` - modal content entry
- `spin` - loading spinner
- `pulse` - topbar status dot

---

## 🐳 Docker & Containerisation

### Services

| Service | Image | Port (host→container) | Notes |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5432→5432` | Health check: `pg_isready` |
| `backend` | `pasha-backend` (built) | `8001→8000` | Waits for `db` to be healthy |
| `frontend` | `pasha-frontend` (built) | `80→80` | Waits for `backend` |

### `backend/Dockerfile`
```
Base:    python:3.11-slim
Install: gcc + libpq-dev (for psycopg2)
Deps:    pip install -r requirements.txt (cached layer)
App:     COPY . .
Run:     uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### `frontend/Dockerfile` (multi-stage)
```
Stage 1 - Builder:
  Base:   node:20-alpine
  Args:   VITE_API_URL (baked into bundle at build time)
  Deps:   npm install --legacy-peer-deps
  Build:  npm run build → dist/

Stage 2 - Server:
  Base:   nginx:alpine
  Copy:   dist/ → /usr/share/nginx/html
  Config: nginx.conf (SPA routing + gzip + cache headers)
```

### Named Volumes
- `inventory_postgres_data` - persists PostgreSQL data across container restarts

### Docker Compose Dependency Chain
```
frontend  →  backend  →  db (health-checked)
```

---

## ⚙ Environment Variables

### Root `.env` (for Docker Compose)

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=supersecurepassword
POSTGRES_DB=inventory_db

# Backend
SECRET_KEY=your-very-secret-key-here
DEBUG=false

# Frontend build arg - set to your deployed backend URL
VITE_API_URL=http://localhost:8001
```

### Backend `.env` (for local dev)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_db
SECRET_KEY=your-secret-key-here
DEBUG=false
```

### Frontend `.env.local` (for local dev)

```env
VITE_API_URL=http://localhost:8001
```

---

## 🌱 Seed Data

The database is pre-seeded with realistic test data:

### 10 Customers
James Anderson, Sophia Martinez, Liam Thompson, Olivia Robinson, Noah Wilson, Emma Davis, William Taylor, Ava Harris, Mason Clark, Isabella Lewis

### 20 Products
Covering a tech accessories catalog with varied stock levels including:
- High stock: HDMI Cable (400), Cable Management Kit (300), USB-C Hub (200)
- Normal stock: Wireless Mouse (150), Desk Mat (180), Laptop Stand (120)
- Low stock: Wireless Charging Pad (8), Blue Light Glasses (5)
- Out of stock: Monitor Light Bar (0) - intentional for low-stock alert demo

### 10 Orders
Spread across all 10 customers, each with 1–2 line items, covering a variety of products and totals from $76.95 to $419.97.

---

## 🚀 Deployment Guide

### Backend → Render

1. Push `backend/` to GitHub
2. New Web Service on [render.com](https://render.com)
   - Root: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add env vars:
   - `DATABASE_URL` (from Render PostgreSQL add-on)
   - `SECRET_KEY`

### Push Backend to Docker Hub

```bash
docker build -t yourdockerhubuser/ims-backend:latest ./backend
docker push yourdockerhubuser/ims-backend:latest
```

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
   - Framework: Vite
   - Root: `frontend`
   - Build: `npm run build`
   - Output: `dist`
2. Add env var: `VITE_API_URL=https://your-backend.onrender.com`

### Frontend → Netlify

1. Connect repo on [netlify.com](https://netlify.com)
   - Base: `frontend`, Build: `npm run build`, Publish: `frontend/dist`
2. Add env var: `VITE_API_URL=https://your-backend.onrender.com`

---

## 🛠 Development Guide

### Backend (hot reload)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Edit DATABASE_URL for local Postgres
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

### Frontend (hot reload)

```bash
cd frontend
npm install
cp .env.example .env.local    # VITE_API_URL=http://localhost:8000
npm run dev
# → http://localhost:5173
```

### Re-seed the database

```bash
# Reset (wipe data)
docker compose down -v && docker compose up -d

# Run the seed script
python3 seed.py   # (or the inline urllib version - no dependencies needed)
```

### View API documentation

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **OpenAPI JSON**: http://localhost:8001/openapi.json

### Useful Docker commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild a single service
docker compose up --build -d backend

# Exec into backend container
docker compose exec backend bash

# Exec into database
docker compose exec db psql -U postgres -d inventory_db
```
