# VisionDesk

> Multi-branch management system for an optical retail store — point of sale, inventory, prescriptions, loyalty, and reporting.

VisionDesk is a full-stack web app that runs the day-to-day operations of an eyewear business: taking orders with eye-test prescriptions, billing with GST tax splits, tracking frame/lens stock across branches, running a tiered loyalty program, and giving owners cross-branch dashboards and reports.

<!-- TODO: add a screenshot or GIF of the dashboard here — it's the single highest-impact thing for a reader. -->
<!-- ![VisionDesk dashboard](docs/dashboard.png) -->

## Tech stack

| Layer    | Stack                                                                 |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Recharts, jsPDF, axios    |
| Backend  | Node.js, Express, Zod (validation), JWT + bcryptjs (auth)             |
| Database | PostgreSQL (Supabase), via the `pg` driver with hand-written SQL      |
| Infra    | Docker / Docker Compose, nginx (serves the SPA and proxies `/api`)    |

## Features

- **Role-based access** — `owner`, `branch_admin`, and `staff`, with every query branch-scoped so non-owners only see their own branch's data.
- **Orders & invoicing** — create an order, capture an optional eye-test prescription, and generate a GST invoice (CGST/SGST split) in a single atomic transaction that also decrements inventory and writes a stock ledger entry.
- **Payments & loyalty** — close invoices by payment method, earn/redeem loyalty points, and auto-update loyalty tiers (silver → gold → platinum) — all transactional and guarded against double-payment.
- **Inventory** — frames and lenses with per-branch stock levels, stock transactions, and inter-branch stock transfers.
- **Procurement** — suppliers and purchase orders.
- **Finance & reporting** — expenses, owner dashboards, and sales/inventory reports with charts and PDF export.
- **Audit logging** — mutating actions are recorded for traceability.

## Project structure

```
VisionDesk/
├── backend/              # Express API
│   └── src/
│       ├── config/       # Supabase Postgres pool + startup validation
│       ├── controllers/  # Request handlers (one per domain)
│       ├── middleware/    # auth, audit, validate, rateLimit, errorHandler
│       ├── routes/       # Route definitions, mounted under /api
│       ├── models/       # Zod schemas
│       └── utils/        # roles, pagination, notifications, apiError, asyncHandler
├── frontend/             # React + Vite SPA
│   └── src/
│       ├── pages/        # One page per domain
│       ├── components/   # Reusable UI (DataTable, Modal, Sidebar, …)
│       ├── context/      # Auth and Toast providers
│       └── services/     # axios API client
├── database/
│   └── schema.sql        # Postgres schema, enums, triggers, stored procedures
├── docker-compose.yml
└── DEPLOYMENT.md         # Production deployment guide
```

## Getting started (local development)

### Prerequisites

- Node.js 20+ (developed on Node 24)
- A PostgreSQL database — a free [Supabase](https://supabase.com) project works out of the box

### 1. Database

Run the schema against your Postgres database:

```bash
psql "<your-connection-string>" -f database/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in real values (see DEPLOYMENT.md)
npm run dev               # starts on http://localhost:5000
```

Verify it's up:

```bash
curl http://localhost:5000/health      # { "status": "ok", ... }
curl http://localhost:5000/health/db   # checks the database connection
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # starts on http://localhost:5173
```

The Vite dev server proxies API calls to the backend. Open http://localhost:5173 and log in with a seeded `login_id` / password.

> **Note:** login uses a **`login_id`**, not an email address. Seeded users may have `$plain$`-prefixed passwords; set `ALLOW_PLAIN_SEEDED_PASSWORDS=true` to use them in development, and replace them with bcrypt hashes before production.

## Running tests

```bash
cd backend
npm test
```

Tests use Node's built-in test runner (`node --test`) — no extra dependencies. Current coverage focuses on the role/branch-scoping logic that enforces multi-tenant data isolation.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the production checklist and Docker Compose instructions:

```bash
docker compose up --build -d
```

The frontend container serves the built SPA and proxies `/api/` to the backend, which is only reachable inside the Compose network.

## API surface

All routes are mounted under `/api`. `/api/auth` is public; everything else requires a `Bearer` token.

| Resource         | Base path                |
| ---------------- | ------------------------ |
| Auth             | `/api/auth`              |
| Dashboard        | `/api/dashboard`         |
| Customers        | `/api/customers`         |
| Products         | `/api/products`          |
| Inventory        | `/api/inventory`         |
| Suppliers        | `/api/suppliers`         |
| Orders           | `/api/orders`            |
| Purchase orders  | `/api/purchase-orders`   |
| Expenses         | `/api/expenses`          |
| Stock transfers  | `/api/stock-transfers`   |
| Invoices         | `/api/invoices`          |
| Branches         | `/api/branches`          |
| Reports          | `/api/reports`           |
| Staff            | `/api/staff`             |
| Audit logs       | `/api/audit-logs`        |
