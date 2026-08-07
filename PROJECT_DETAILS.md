# Deli Cocktail House ERP - Complete Project Details

This document provides a comprehensive overview of the **Deli Cocktail House ERP**, an enterprise resource planning system designed to manage both back-office operations and on-ground event workflows.

---

## 1. System Architecture

The project is built as a **Monorepo** using pnpm workspaces and Turborepo. It comprises three main parts:
- **Admin Dashboard (`apps/admin`)**: A Next.js (App Router) based frontend application serving as the primary user interface.
- **REST API (`apps/api`)**: An Express.js backend that handles all business logic, data processing, and integrations.
- **Shared Database Package (`packages/database`)**: Houses the Prisma schema and the generated Prisma Client, which is shared across the workspace to ensure type safety.

### Technology Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui.
- **Backend**: Express 4, Node.js, TypeScript.
- **Database**: PostgreSQL (hosted on Supabase) with Prisma ORM 6.
- **Authentication/Cache**: JWT access tokens with Redis (Upstash) for managing OTPs and sessions.
- **Storage**: Supabase Storage for managing employee documents (PDFs/Images).

---

## 2. Core Modules in Detail

The ERP is divided into several modules. Below is the breakdown of what each module does and the specific entities it manages.

### A. Admin & Authentication Module

The Admin module is the highest level of control in the ERP. Only authorized users (like `SUPER_ADMIN` or `WAREHOUSE_MANAGER`) can access and manage these settings.

#### What the Admin can do:
- **Login & Security**: Access the system via an OTP sent to the authorized admin email. No passwords are used; instead, session management is handled via secure JWT tokens.
- **Global Dashboard Access**: View high-level metrics across the entire business, including total active employees, attendance statistics for the day, and a snapshot of all ongoing events.
- **Role Management**: Control system access for different user roles (Super Admin, Warehouse Manager, Site Manager, Employee).
- **System Oversight**: Oversee all HR, Payroll, Inventory, and Event activities from a centralized command center.

### B. Office (HR & Payroll) Module

This module manages the lifecycle and records of the company's workforce.

- **Employee Management (`Employee` model)**:
  - Add, edit, or terminate employees.
  - Track diverse roles such as Bartender, Butler, Manager, Supervisor, Graphic Designer, Driver, etc.
  - Store emergency contact info, joining date, leaving date, and base salaries.
  - **Bank Details**: Securely store employee bank account numbers, branches, and IFSC codes for payroll processing.
- **Employee Documents**:
  - Upload critical KYC and onboarding documents: Aadhar Card, PAN Card, Offer Letters, and Bonds.
  - Documents are securely stored in Supabase. Re-uploading a document automatically removes the old file to save space.
- **Attendance Tracking (`Attendance` model)**:
  - Mark daily attendance for every employee.
  - Statuses include: `PRESENT`, `ABSENT`, `HALF_DAY`, `SHORT_LEAVE`, and `ON_LEAVE`.
- **Salary & Payroll (`Salary` model)**:
  - Generate month-wise salary records based on attendance and base salary.
  - Track payment status (`PAID` or `UNPAID`) and record the exact `paidDate`.

### C. Warehouse (Inventory & Logistics) Module

This module manages the physical assets, stock, and event preparations.

- **Inventory Management (`Item` model)**:
  - Track individual items by unique SKU.
  - Categorize items into: `SETUP`, `UNIFORM`, `GLASSWARE`, `DISPOSALS`, and `CONSUMABLE`.
  - Monitor stock levels meticulously: `openingStock`, `currentStock`, and `availableStock`.
  - Track expiration dates for consumables.
- **Event Management (`Event` model)**:
  - Create and schedule upcoming events with details like event date, start/end time, venue, pax (number of guests), and event type.
  - Assign key personnel to events: Site Manager, Site Supervisor, CRM, and Vendor partners.
  - Specify staffing requirements: number of bartenders, male butlers, and female butlers.
  - Record client contact information (name, phone, email) and overall costs (inventory cost, staff cost, total cost).
  - Track event lifecycle status: `UPCOMING`, `ONGOING`, `COMPLETED`, or `CANCELLED`.
- **Event Inventory Allocation (`EventInventory` model)**:
  - Link specific inventory items to an event.
  - Track required quantities versus available quantities.
  - Manage reservations and actual issued quantities of items for the event.
- **Post-Event Return Summary (`EventReturnSummary` model)**:
  - After an event, reconcile the inventory.
  - Track exact counts of what was: `issued`, `returned`, `damaged`, `lost`, or `consumed`.
  - Add remarks for discrepancies.
- **Complaint Logging (`Complain` model)**:
  - Log complaints or issues that arise during an event.
  - Link complaints to specific events and site managers to track resolution statuses.

---

## 3. Data Integrity & Relationships

The database is built with strict relational integrity using cascading deletes (`onDelete: Cascade`):
- If an **Employee** is removed, their associated **Attendance** and **Salary** records are also purged.
- If an **Event** is cancelled or deleted, the associated **EventInventory** and **EventReturnSummary** records are automatically cleaned up to prevent orphaned data.
- Inventory quantities dynamically shift between `currentStock` and `availableStock` as items are reserved and issued to `Events`.
