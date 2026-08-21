# Deli Cocktail House ERP

Monorepo ERP for **Deli Cocktail House** — an operations platform covering the Office (HR & payroll) and Warehouse (events & inventory) modules.

Built with a pnpm + Turborepo workspace containing a Next.js admin dashboard, an Express REST API, and a shared Prisma database package.

## What's inside?

```
├── apps/
│   ├── admin/      Next.js (App Router) admin dashboard  → http://localhost:3000
│   └── api/        Express REST API                     → http://localhost:4000
└── packages/
    ├── database/   Prisma schema, client and shared PrismaClient
    ├── eslint-config/   Shared ESLint configs
    └── typescript-config/ Shared tsconfigs
```

## Tech Stack

| Layer      | Tools                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Frontend   | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), TanStack Query, lucide-react, sonner, zod |
| Backend    | Express 4, TypeScript, multer, jsonwebtoken, nodemailer                                                           |
| Database   | PostgreSQL (Supabase), Prisma ORM 6                                                                               |
| Storage    | Supabase Storage (employee documents)                                                                             |
| Cache/Auth | Redis (Upstash) for OTP, JWT access tokens                                                                        |
| Tooling    | pnpm, Turborepo, ESLint, Prettier                                                                                 |

## Modules & Features

### Office (HR & Payroll)

- **Dashboard** — live metrics: total employees, present/absent/on-leave today, ongoing events. Click a card to drill into a filtered list (employees or events).
- **Employees** — create, edit, view and delete employee records; designation, base salary, joining date, contact info.
- **Employee Documents** — upload Aadhar, PAN, Offer Letter and Bond. Re-uploading auto-deletes the previous file from storage; documents can also be deleted.
- **Attendance** — mark daily attendance per employee (Present / Absent / Half Day / Short Leave / On Leave).
- **Salaries** — month-wise salary tracking with paid/unpaid status and paid-date.

### Warehouse (Events & Inventory)

- **Inventory** — items with SKU, category, unit, opening/current/available stock, stock status and expiry.
- **Events** — create and manage events (event code, name, date, venue, pax, staffing, clients), track status (Upcoming / Ongoing / Completed / Cancelled).
- **Event Detail** — per-event inventory allocation (required/available/reserved/issued quantities) and return summaries (issued/returned/damaged/lost/consumed).
- **Complaints** — log and track complaints against events.

### Accounting (Finance)

- **Dashboard** — financial overview: revenue, expenses, profit margins, and cash flow summaries.
- **Invoices** — create, send, and track invoices with line items, tax calculations, and payment status.
- **Expenses** — log and categorize business expenses with receipts and approval workflows.
- **Payments** — track incoming and outgoing payments, reconcile with invoices and expenses.
- **Financial Reports** — generate profit & loss statements, balance sheets, and cash flow reports.

### Sales (CRM)

- **Customers** — manage customer profiles with contact details, purchase history, and preferences.
- **Orders** — create and track orders from placement to fulfillment with status updates.
- **Sales Pipeline** — visual pipeline to track leads through stages (Lead → Proposal → Negotiation → Closed Won/Lost).
- **Quotes** — generate and send quotes to customers, convert approved quotes to orders.
- **Sales Analytics** — sales performance dashboards, revenue trends, and customer insights.

### Inventory Management

- **Stock Management** — real-time stock levels with automatic updates on orders and returns.
- **Categories & Units** — organize items by categories with support for multiple unit types.
- **Stock Alerts** — configurable low-stock alerts and reorder point notifications.
- **Stock Movements** — track all stock in/out movements with timestamps and reasons.
- **Stocktake** — physical inventory count reconciliation with variance reporting.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 10 (`npm i -g pnpm`)
- PostgreSQL database (a Supabase project works)
- Redis instance (Upstash Redis with TLS)
- Supabase project with a storage bucket for documents

### Install

```sh
pnpm install
```

### Configure environment variables

Create the following env files (values are your own — never commit real secrets):

**`packages/database/.env`**

```sh
DATABASE_URL="postgresql://..."
```

**`apps/api/.env`**

```sh
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="your-jwt-secret"
PORT=4000
SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="service_role_key"
SMTP_USER="your-gmail"
SMTP_PASS="your-app-password"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
```

**`apps/admin/.env.local`**

```sh
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Database setup

The `@repo/database` package owns the Prisma schema (`packages/database/prisma/schema.prisma`). Apply schema changes with:

```sh
pnpm --filter @repo/database exec prisma migrate dev
pnpm --filter @repo/database generate
```

> Note: `prisma generate` can fail with an `EPERM` error renaming the query engine DLL while dev servers are running on Windows — stop the dev servers, then re-run.

## Development

Start all apps (Turborepo):

```sh
pnpm dev
```

Or run each app individually:

```sh
pnpm --filter @repo/database dev
pnpm --filter @repo/api dev
pnpm --filter admin dev
```

## Scripts

| Command            | Description                 |
| ------------------ | --------------------------- |
| `pnpm dev`         | Run all apps in watch mode  |
| `pnpm build`       | Build all apps and packages |
| `pnpm lint`        | Lint all workspaces         |
| `pnpm check-types` | Type-check all workspaces   |
| `pnpm format`      | Format code with Prettier   |

## API Overview

All endpoints (except auth) require a `Bearer` JWT.

- `POST /api/auth/request-otp` / `POST /api/auth/verify-otp` / `POST /api/auth/refresh` — email OTP authentication
- `/api/office/dashboard` — dashboard metrics (incl. `ongoingEvents`)
- `/api/office/dashboard/ongoing-events` — list of ongoing events
- `/api/office/employees` — CRUD employees; `?attendanceStatus=` filters to employees with that attendance status today
- `/api/office/employees/:id/salaries` — get / upsert monthly salary
- `/api/office/attendance/summary` — monthly attendance + net salary summary
- `/api/uploads/employee-document` — upload (with optional `oldPath` auto-delete) and delete employee documents
- `/api/items`, `/api/events`, `/api/warehouse/*`, `/api/complains` — warehouse module routes

## Useful Links

- [Turborepo docs](https://turborepo.dev/docs)
- [Next.js docs](https://nextjs.org/docs)
- [Prisma docs](https://www.prisma.io/docs)
