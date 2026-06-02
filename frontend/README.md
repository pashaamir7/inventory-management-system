# Frontend — Inventory & Order Management

A responsive, production-ready single-page application built with **React 18 + Vite**. Provides a clean management interface for products, customers, orders, and a live dashboard — all communicating with the FastAPI backend via Axios.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Configuration & Environment Variables](#configuration--environment-variables)
4. [Running Locally (without Docker)](#running-locally-without-docker)
5. [Running with Docker](#running-with-docker)
6. [Pages & Features](#pages--features)
   - [Dashboard](#dashboard)
   - [Products](#products)
   - [Customers](#customers)
   - [Orders](#orders)
   - [Order Detail](#order-detail)
7. [Component Architecture](#component-architecture)
8. [API Layer](#api-layer)
9. [Form Validations](#form-validations)
10. [Styling & Design System](#styling--design-system)
11. [Responsive Design](#responsive-design)
12. [Deployment](#deployment)

---

## Tech Stack

| Dependency | Version | Purpose |
|---|---|---|
| React | 18.3 | UI library |
| Vite | 5.2 | Build tool & dev server |
| React Router DOM | 6.23 | Client-side routing |
| Axios | 1.7 | HTTP client with interceptors |
| Lucide React | 0.390 | Icon library |
| React Hot Toast | 2.4 | Toast notifications |
| Nginx | alpine | Production static file server |

---

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── client.js        # Axios instance with base URL + error interceptor
│   │   ├── products.js      # Product API functions
│   │   ├── customers.js     # Customer API functions
│   │   ├── orders.js        # Order API functions
│   │   └── dashboard.js     # Dashboard API function
│   ├── components/
│   │   ├── Sidebar.jsx      # Navigation sidebar (collapsible on mobile)
│   │   └── ConfirmDialog.jsx # Reusable delete/action confirmation modal
│   ├── pages/
│   │   ├── Dashboard.jsx    # Stats overview + recent orders + low stock
│   │   ├── Products.jsx     # Product list with search, add, edit, delete
│   │   ├── Customers.jsx    # Customer list with search, add, delete
│   │   ├── Orders.jsx       # Order list with search, create, cancel
│   │   └── OrderDetail.jsx  # Full order view with status panel + item edit
│   ├── App.jsx              # Router, layout, topbar
│   ├── main.jsx             # React DOM entry point
│   └── index.css            # Global design system (CSS custom properties)
├── index.html
├── vite.config.js
├── package.json
├── nginx.conf               # Nginx config for SPA routing + asset caching
├── Dockerfile               # Multi-stage: Node build → Nginx serve
├── .dockerignore
├── .env.example
└── README.md
```

---

## Configuration & Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8001` | Backend API base URL (injected at build time) |

### Setup

```bash
cp .env.example .env.local
# Edit VITE_API_URL to point to your backend
```

> **Important:** Because `VITE_API_URL` is a Vite build-time variable (prefixed with `VITE_`), it is baked into the JavaScript bundle at build time. If you deploy the frontend, you must set this variable **before building** (e.g. as a Vercel/Netlify environment variable).

---

## Running Locally (without Docker)

### Prerequisites
- Node.js 18+ and npm

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8001 (or wherever your backend runs)

# 3. Start dev server with hot-reload
npm run dev
```

The app will be available at `http://localhost:5173`

### Other scripts

```bash
npm run build     # Production build → dist/
npm run preview   # Preview the production build locally
```

---

## Running with Docker

The frontend is included in the root `docker-compose.yml`.

To build and run standalone:

```bash
# Build (pass the backend URL as a build argument)
docker build \
  --build-arg VITE_API_URL=http://localhost:8001 \
  -t ims-frontend .

# Run
docker run -p 80:80 ims-frontend
```

---

## Pages & Features

### Dashboard

**Route:** `/`

Displays a live overview of the entire system.

| Section | Description |
|---|---|
| **Stat Cards** | Total products, customers, orders, and low-stock count — each with a coloured icon |
| **Recent Orders** | The 5 most recent orders with customer name, total, status badge, and date |
| **Low Stock Alert** | Every product at or below 10 units, with a progress bar showing urgency and a badge for "Out of stock" vs "Low Stock" |
| **Refresh button** | Reload dashboard data without a full page reload |

---

### Products

**Route:** `/products`

Full product catalog management.

| Feature | Description |
|---|---|
| **Live search** | Client-side instant filter by product name or SKU |
| **Add Product** | Modal form with full validation |
| **Edit Product** | Pre-filled modal for updating any field |
| **Delete Product** | Confirmation dialog before permanent deletion |
| **Stock badges** | Green (> 10), yellow (1–10), red (Out of stock) |
| **SKU pills** | Monospace styled pill for easy identification |

**Add / Edit form fields:**
- Product Name (required, 1–255 chars)
- SKU (required, 1–100 chars — auto-uppercased by backend)
- Price in USD (required, > 0)
- Quantity in Stock (required, ≥ 0)
- Description (optional, up to 1000 chars)

---

### Customers

**Route:** `/customers`

Customer database management.

| Feature | Description |
|---|---|
| **Live search** | Filter by full name, email, or phone |
| **Add Customer** | Modal form with email format validation |
| **Delete Customer** | Confirmation dialog |
| **Avatar initials** | Auto-generated coloured initials avatar cycles through 6 brand colours |

**Add form fields:**
- Full Name (required)
- Email Address (required, valid email format, must be unique)
- Phone Number (optional)

---

### Orders

**Route:** `/orders`

Order tracking and creation.

| Feature | Description |
|---|---|
| **Live search** | Filter by order ID or customer name |
| **Create Order** | Multi-item order builder with all validations |
| **Duplicate detection** | Auto-merges quantities if same product selected twice |
| **Stock indicators** | Live per-item stock chip and "N will remain" warning |
| **Live subtotals** | Per-row and total calculations as you build the order |
| **Status badges** | Yellow (pending), green (completed), red (cancelled) |
| **Edit button** | Appears only on pending orders — links to Order Detail |
| **Cancel button** | Appears only on pending orders — confirms before cancelling |

**Order builder validations (see [Form Validations](#form-validations))**

---

### Order Detail

**Route:** `/orders/:id`

Full order view with lifecycle management.

| Section | Description |
|---|---|
| **Status Panel** | Visual timeline (pending → completed), action buttons, lock state for non-pending orders |
| **Mark as Completed** | Confirms then transitions status to `completed` |
| **Cancel Order** | Confirms then transitions to `cancelled` and restores all stock |
| **Edit Items** | Opens item editor (pending orders only) |
| **Customer Card** | Full customer info: name, email, phone, ID |
| **Order Summary Card** | Status badge, item count, total amount |
| **Line Items Table** | Product name, SKU, unit price, quantity badge, subtotal per row, grand total footer |

---

## Component Architecture

### `App.jsx`
- Sets up React Router with all routes
- Renders `Sidebar` + topbar + `<main>` content area
- Manages sidebar open/close state for mobile

### `Sidebar.jsx`
Props: `open` (boolean), `onClose` (function)
- Collapsible on mobile via CSS transform + overlay
- Active link highlighted with left border indicator
- Brand logo icon + app name in header

### `ConfirmDialog.jsx`
Props: `title`, `message`, `onConfirm`, `onCancel`, `loading`
- Renders over a blurred backdrop
- Warning icon + title + message + Cancel / Confirm buttons
- Disables all buttons while `loading` is true

---

## API Layer

All API communication is centralised in `src/api/`.

### `api/client.js`
- Creates an Axios instance with `baseURL` from `VITE_API_URL`
- **Response interceptor** extracts error messages from FastAPI's `detail` field:
  - String detail → used directly
  - Array detail (Pydantic validation errors) → joined as a comma-separated string

### API Functions

#### `api/products.js`
```js
getProducts(params)          // GET /products?search=&skip=&limit=
getProduct(id)               // GET /products/:id
createProduct(data)          // POST /products
updateProduct(id, data)      // PUT /products/:id
deleteProduct(id)            // DELETE /products/:id
```

#### `api/customers.js`
```js
getCustomers(params)         // GET /customers?search=&skip=&limit=
getCustomer(id)              // GET /customers/:id
createCustomer(data)         // POST /customers
deleteCustomer(id)           // DELETE /customers/:id
```

#### `api/orders.js`
```js
getOrders(params)            // GET /orders?status=&skip=&limit=
getOrder(id)                 // GET /orders/:id
createOrder(data)            // POST /orders
updateOrderItems(id, data)   // PUT /orders/:id
updateOrderStatus(id, status)// PATCH /orders/:id/status
deleteOrder(id)              // DELETE /orders/:id
```

#### `api/dashboard.js`
```js
getDashboard()               // GET /dashboard
```

---

## Form Validations

### Product Form
| Field | Rules |
|---|---|
| Name | Required, 1–255 characters |
| SKU | Required, 1–100 characters |
| Price | Required, numeric, > 0 |
| Quantity | Required, integer, ≥ 0 |

### Customer Form
| Field | Rules |
|---|---|
| Full Name | Required |
| Email | Required, valid email format (`x@x.x`) |
| Phone | Optional |

### Order Builder
| Rule | Behaviour |
|---|---|
| No customer selected | Error: "Please select a customer" |
| No product selected for a row | Error: "Select a product" |
| Quantity < 1 | Error: "Minimum quantity is 1" |
| Non-integer quantity | Error: "Must be a whole number" |
| Quantity > available stock | Error: "Only N available" |
| Product is out of stock | Option disabled in dropdown with "(out of stock)" label |
| Duplicate product selected | **Auto-merge**: quantities are summed and the duplicate row is removed, confirmed by a toast notification |
| Merge would exceed stock | Merge is blocked with an error toast |
| Product already in order | Option shows "(already added)" and is disabled in other rows |
| Low remaining stock | Amber info chip: "N will remain after order" |
| All validations trigger on submit | Errors also trigger on change after first submit attempt |

---

## Styling & Design System

All styles are in `src/index.css` using **CSS Custom Properties** (no preprocessor required).

### Design Tokens

```css
/* Brand */
--primary:       #6366f1    /* Indigo */
--primary-dark:  #4f46e5
--primary-light: #eef2ff

/* Semantic */
--success:  #10b981
--warning:  #f59e0b
--danger:   #ef4444
--info:     #0ea5e9

/* Neutrals — Slate scale */
--gray-50 … --gray-950

/* Sidebar */
--sidebar-bg:     #0f172a
--sidebar-active: rgba(99,102,241,0.18)
```

### Typography
- **Font**: Inter (Google Fonts), with system font fallback
- **Antialiasing**: `-webkit-font-smoothing: antialiased`
- **Sizes**: 11px (labels) → 32px (stat values)

### Component Classes

| Class | Description |
|---|---|
| `.card` | White bordered card with shadow |
| `.card-header` | Card title row with action slot |
| `.btn` | Base button — combine with `.btn-primary`, `.btn-danger`, etc. |
| `.btn-sm` / `.btn-xs` | Size modifiers |
| `.badge` | Status/count pill — combine with `.badge-green`, `.badge-yellow`, etc. |
| `.sku-pill` | Monospace code pill for SKUs |
| `.form-control` | Styled input, select, textarea |
| `.form-label` | Field label with required asterisk support |
| `.form-error` | Red inline validation message |
| `.search-box` | Input with embedded icon |
| `.table-wrap` | Horizontally scrollable table container |
| `.stat-card` | Dashboard metric card |
| `.modal-overlay` | Blurred full-screen backdrop |
| `.modal` | Centred dialog with slide-up animation |
| `.empty-state` | Centred no-data placeholder |
| `.loading` | Centred spinner + text |

---

## Responsive Design

| Breakpoint | Layout |
|---|---|
| > 1100px | 4-column stat grid, 2-column dashboard |
| 769–1100px | 2-column stat grid, 1-column dashboard |
| ≤ 768px | Sidebar hidden (hamburger toggle), single-column layout, 2-column stats |
| ≤ 480px | 1-column stats, full-width modals |

The sidebar on mobile uses `transform: translateX(-100%)` by default and `.sidebar.open` slides it in. A semi-transparent overlay closes it on tap-outside.

---

## Deployment

### Vercel (recommended)

1. Push the repo to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com`

### Netlify

1. Connect the repo on [netlify.com](https://netlify.com)
2. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
3. Add environment variable: `VITE_API_URL`
4. Add a `_redirects` file (or use `netlify.toml`) for SPA fallback:
   ```
   /*    /index.html    200
   ```
   > The Nginx config already handles this in Docker; Netlify needs it explicitly.

### Docker Hub

```bash
docker build \
  --build-arg VITE_API_URL=https://your-backend.onrender.com \
  -t yourusername/ims-frontend:latest .

docker push yourusername/ims-frontend:latest
```
