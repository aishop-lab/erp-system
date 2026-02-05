# ERP System - Project Context

> **Last Updated:** 2026-02-04 (Real-time form validation added)
> **Purpose:** This file contains the complete project context for AI assistants. Update this file after every significant change.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication](#authentication)
6. [Implemented Slices](#implemented-slices)
7. [API Endpoints](#api-endpoints)
8. [Frontend Pages](#frontend-pages)
9. [Key Patterns & Conventions](#key-patterns--conventions)
10. [Current State & Next Steps](#current-state--next-steps)

---

## Project Overview

This is a multi-tenant ERP (Enterprise Resource Planning) system built for managing:
- **Users & Permissions** - Role-based access control per module
- **Suppliers** - Vendor management with contacts and pricing catalogs
- **Products** - SKU catalog with categories
- **Purchase Orders** - Multi-type POs with approval workflows
- **Inventory** - Batch tracking, GRN, stock movements
- **Production** - In-house and job work production tracking
- **Finance** - Payments, settlements, customer invoices

### Multi-Tenancy
- All data is scoped by `tenantId`
- Users belong to a single tenant
- API routes always filter by the authenticated user's tenant

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | Supabase Auth |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |

### Key Dependencies
```json
{
  "@prisma/client": "^5.10.0",
  "@supabase/ssr": "^0.1.0",
  "@supabase/supabase-js": "^2.39.7",
  "@tanstack/react-table": "^8.13.0",
  "zod": "^3.22.4",
  "zustand": "^4.5.1"
}
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth pages (login, etc.)
│   ├── (dashboard)/               # Protected dashboard pages
│   │   ├── dashboard/
│   │   ├── suppliers/
│   │   │   ├── page.tsx           # List page
│   │   │   ├── new/page.tsx       # Create page
│   │   │   └── [id]/page.tsx      # Edit/detail page
│   │   ├── admin/
│   │   │   └── users/
│   │   │       ├── page.tsx       # User list (Super Admin)
│   │   │       ├── new/page.tsx   # Create user
│   │   │       └── [id]/page.tsx  # Edit user
│   │   ├── profile/
│   │   │   └── page.tsx           # User profile & change password
│   │   └── ...
│   ├── api/                       # API routes
│   │   ├── suppliers/
│   │   │   ├── route.ts           # GET (list), POST (create)
│   │   │   ├── active/route.ts    # GET active suppliers
│   │   │   └── [id]/
│   │   │       ├── route.ts       # GET, PUT, DELETE
│   │   │       ├── activate/route.ts
│   │   │       ├── contacts/
│   │   │       │   ├── route.ts
│   │   │       │   └── [contactId]/route.ts
│   │   │       └── pricing/
│   │   │           ├── route.ts
│   │   │           └── [pricingId]/route.ts
│   │   ├── users/
│   │   ├── me/
│   │   └── profile/
│   │       ├── route.ts           # GET/PUT profile
│   │       └── change-password/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── textarea.tsx
│   │   ├── switch.tsx
│   │   ├── tooltip.tsx
│   │   ├── dialog.tsx
│   │   ├── alert.tsx
│   │   └── ...
│   ├── shared/                    # Reusable components
│   │   ├── page-header.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-spinner.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── status-badge.tsx
│   │   └── vendor-selector.tsx    # PO vendor dropdown with purchase type filter
│   ├── tables/
│   │   └── data-table.tsx         # Generic data table
│   └── layout/
│       ├── sidebar.tsx
│       ├── header.tsx
│       └── nav-item.tsx
├── lib/
│   ├── prisma.ts                  # Prisma client singleton
│   ├── utils.ts                   # cn() utility
│   ├── constants.ts
│   └── supabase/
│       ├── client.ts              # Browser client
│       ├── server.ts              # Server client
│       └── middleware.ts
├── services/                      # Business logic layer
│   ├── supplier-service.ts
│   ├── user-service.ts
│   ├── product-service.ts
│   ├── po-service.ts
│   ├── inventory-service.ts
│   ├── production-service.ts
│   └── finance-service.ts
├── validators/                    # Zod schemas
│   ├── supplier.ts
│   ├── user.ts
│   ├── product.ts
│   ├── purchase-order.ts
│   ├── grn.ts
│   ├── production.ts
│   └── payment.ts
└── hooks/
    ├── use-permissions.ts
    ├── use-auth.ts                # Auth state hook
    └── use-toast.ts               # Toast notifications
```

---

## Database Schema

### Core Tables

```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  isActive  Boolean  @default(true)
  // ... relations to all tenant-scoped tables
}

model User {
  id             String   @id @default(cuid())
  tenantId       String
  supabaseUserId String?  @unique
  email          String   @unique
  name           String
  role           String   @default("user")
  isSuperAdmin   Boolean  @default(false)
  isActive       Boolean  @default(true)
  // ... relations
}

model UserPermission {
  id              String          @id @default(cuid())
  userId          String
  module          String
  subModule       String?
  permissionLevel PermissionLevel // none, view, edit
}
```

### Supply Categories (Purchase Types)

Suppliers can be tagged with one or more of these categories:

| Value | Label |
|-------|-------|
| `finished` | Finished Goods |
| `fabric` | Fabric |
| `raw_material` | Raw Material |
| `packaging` | Packaging |
| `corporate_assets` | Corporate Assets |
| `samples` | Samples |
| `influencer_samples` | Influencer Samples |
| `transportation` | Transportation |
| `advertisement` | Advertisement |
| `office_expenses` | Office Expenses |
| `software` | Software |
| `feedback` | Feedback |
| `misc` | Miscellaneous |
| `customer_refunds` | Customer Refunds |

### Supplier Tables

```prisma
model Supplier {
  id                String   @id @default(cuid())
  tenantId          String
  name              String
  code              String           // Auto-generated: SUP001, SUP002...
  email             String?
  phone             String?
  address           String?
  gstNumber         String?
  panNumber         String?
  bankName          String?
  bankAccountNumber String?
  bankIfscCode      String?
  paymentTerms      String?
  supplyCategories  String[] @default([])  // Purchase types this supplier can provide
  isActive          Boolean  @default(true)

  contacts          SupplierContact[]
  pricings          SupplierPricing[]
  purchaseOrders    PurchaseOrder[]
  payments          Payment[]

  @@unique([tenantId, code])
}

model SupplierContact {
  id         String   @id @default(cuid())
  supplierId String
  name       String
  email      String?
  phone      String?
  isPrimary  Boolean  @default(false)
}

model SupplierPricing {
  id         String    @id @default(cuid())
  supplierId String
  productId  String
  unitPrice  Decimal
  currency   String    @default("INR")
  minQty     Int?
  validFrom  DateTime?
  validTo    DateTime?

  @@unique([supplierId, productId])
}
```

### Product Tables

```prisma
model Product {
  id          String   @id @default(cuid())
  tenantId    String
  sku         String
  name        String
  description String?
  categoryId  String?
  unit        String   @default("pcs")
  hsnCode     String?
  gstRate     Decimal?
  isActive    Boolean  @default(true)

  @@unique([tenantId, sku])
}

model ProductCategory {
  id       String  @id @default(cuid())
  tenantId String
  name     String
  level    Int     @default(1)
  parentId String?
}
```

### Purchase Order Tables

```prisma
model PurchaseOrder {
  id               String      @id @default(cuid())
  tenantId         String
  poNumber         String
  purchaseType     PurchaseType
  supplierId       String?
  entityId         String
  status           POStatus    @default(draft)
  entryMode        EntryMode
  rawMaterialMode  RawMaterialMode?
  totalAmount      Decimal
  taxAmount        Decimal
  grandTotal       Decimal
  // ... audit fields

  lineItems        POLineItem[]
  freeTextItems    POLineItemFreetext[]
  refundItems      POLineItemRefund[]
  grns             GRN[]
  payments         Payment[]
}

// POStatus: draft, pending_approval, approved, rejected,
//           partially_received, goods_received, payment_pending, paid
```

### Inventory Tables

```prisma
model GRN {
  id              String   @id @default(cuid())
  tenantId        String
  grnNumber       String
  purchaseOrderId String
  // ...
  lineItems       GRNLineItem[]
}

model InventoryBatch {
  id          String   @id @default(cuid())
  tenantId    String
  productId   String
  batchNumber String
  quantity    Int
  costPrice   Decimal
  expiryDate  DateTime?
}

model StockLedger {
  id           String       @id @default(cuid())
  tenantId     String
  productId    String
  batchId      String?
  movementType MovementType
  quantity     Int
  referenceId  String?
  referenceType String?
}
```

### Key Enums

```prisma
enum PurchaseType {
  finished, fabric, raw_material, packaging, corporate_assets,
  samples, influencer_samples, transportation, advertisement,
  office_expenses, software, feedback, misc, customer_refunds
}

enum POStatus {
  draft, pending_approval, approved, approved_pending_rm_issuance,
  rm_issued_pending_goods, rejected, partially_received,
  goods_received, payment_pending, payment_approved, paid
}

enum EntryMode {
  catalog, free_text, link_finished, special
}

enum MovementType {
  grn, sale, sample, production_in, production_out,
  rm_issued_to_vendor, adjustment_add, adjustment_reduce,
  write_off, opening
}

enum PermissionLevel {
  none, view, edit
}
```

---

## Authentication

### Supabase Auth Integration

**Server-side auth check pattern:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  })

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Use currentUser.tenantId for all queries
}
```

**Supabase Server Client** (`src/lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie handlers */ } }
  )
}
```

---

## Implemented Slices

### Slice 1: User Management + Permissions ✅
- User CRUD (Super Admin only)
- Per-module permission levels (none/view/edit)
- Password management via Supabase Auth

### Slice 2: Supplier Management ✅
- **Validators:** `src/validators/supplier.ts`
- **Service:** `src/services/supplier-service.ts`
- **API Routes:** 8 endpoints under `/api/suppliers/`
- **Frontend:** 3 pages (list, create, edit)

**Features:**
- Auto-generated supplier codes (SUP001, SUP002...)
- Full CRUD with soft delete (active/inactive)
- Contact management with primary designation
- CSV pricing catalog upload
- Search, filter, pagination
- Supply Categories - tag suppliers with purchase types they can provide
- VendorSelector component for filtering suppliers by purchase type in PO module

### Slice 3: Product Management 🔲 (Not Started)
- Product catalog CRUD
- Category hierarchy
- HSN codes, GST rates

### Slice 4: Purchase Orders 🔲 (Not Started)
- Multi-type POs (finished, fabric, raw material, etc.)
- Entry modes (catalog, free text, link to finished)
- Approval workflow
- Status transitions

### Slice 5: GRN & Inventory 🔲 (Not Started)
- Goods Receipt Notes
- Batch tracking
- Stock ledger
- Inventory adjustments

### Slice 6: Production 🔲 (Not Started)
- Production orders
- Material consumption
- In-house vs Job Work

### Slice 7: Finance 🔲 (Not Started)
- Payment tracking
- Marketplace settlements
- Customer invoices

---

## API Endpoints

### Suppliers API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers` | List suppliers (with search, filters, pagination, purchaseType) |
| POST | `/api/suppliers` | Create supplier |
| GET | `/api/suppliers/active` | Get active suppliers (for dropdowns) |
| GET | `/api/suppliers/by-purchase-type?purchaseType=X` | Get suppliers by purchase type (for PO vendor dropdown) |
| GET | `/api/suppliers/[id]` | Get supplier details |
| PUT | `/api/suppliers/[id]` | Update supplier |
| DELETE | `/api/suppliers/[id]` | Deactivate supplier (soft delete) |
| POST | `/api/suppliers/[id]/activate` | Reactivate supplier |
| POST | `/api/suppliers/[id]/contacts` | Add contact |
| PUT | `/api/suppliers/[id]/contacts/[contactId]` | Update contact |
| DELETE | `/api/suppliers/[id]/contacts/[contactId]` | Delete contact |
| GET | `/api/suppliers/[id]/pricing` | Get pricing catalog |
| POST | `/api/suppliers/[id]/pricing` | Upload pricing (direct or CSV) |
| DELETE | `/api/suppliers/[id]/pricing/[pricingId]` | Delete pricing |

### Users API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (Super Admin only) |
| POST | `/api/users` | Create user |
| GET | `/api/users/[id]` | Get user details |
| PUT | `/api/users/[id]` | Update user |
| GET | `/api/users/[id]/permissions` | Get user permissions |
| PUT | `/api/users/[id]/permissions` | Update user permissions |
| GET | `/api/me` | Get current user |

### Profile API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get current user profile |
| PUT | `/api/profile` | Update profile (name) |
| POST | `/api/profile/change-password` | Change password |

---

## Frontend Pages

### Dashboard Layout (`src/app/(dashboard)/layout.tsx`)
- Sidebar navigation with collapsible state
- Header with user menu
- Protected routes

### Sidebar Navigation Structure
The sidebar (`src/components/layout/sidebar.tsx`) renders navigation based on `NAVIGATION` constant from `src/lib/constants.ts`:

| Module | Icon | Sub-items | Access |
|--------|------|-----------|--------|
| Dashboard | LayoutDashboard | - | Everyone |
| Purchase Orders | ShoppingCart | - | Module permission |
| Suppliers | Truck | - | Module permission |
| Products | Package | - | Module permission |
| Inventory | Warehouse | Stock Overview, GRN, Outflow, Adjustments, Ledger | Module permission |
| Production | Factory | In-House, Job Work | Module permission |
| Finance | Wallet | Fulton, MSE, SNA, Payments, Settlements, Invoices | Module permission |
| External Vendors | Building2 | Shivaang | Module permission |
| Admin | Shield | PO Approvals, Payment Approvals, User Management, Settings | Super Admin only |

**Permission Logic:**
1. Super Admin sees all items immediately
2. During loading, only items without permission requirements are shown
3. Non-super-admin users see items based on their module permissions

### Suppliers Module

**List Page** (`/suppliers`):
- Search by name, code, email
- Filter by status (active/inactive)
- Pagination
- Actions: Edit, Activate/Deactivate

**Create Page** (`/suppliers/new`):
- Basic info (name, email, phone)
- Tax info (GST, PAN)
- Banking details
- Multiple contacts with primary designation

**Edit Page** (`/suppliers/[id]`):
- All fields from create
- Contact management (add/edit/delete)
- Pricing catalog section
- CSV upload for pricing
- Download CSV template

### User Management Module (Admin Only)

**List Page** (`/admin/users`):
- Table with all users
- Shows name, email, role, status, permissions count
- Actions with tooltips: Edit (pencil), Activate/Deactivate (shield)
- Super Admin badge for admin users

**Create Page** (`/admin/users/new`):
- Full name and email inputs
- Super Admin toggle
- Module permissions matrix (when not super admin)
- Success dialog with temporary password
- Copy password button

**Edit Page** (`/admin/users/[id]`):
- Pre-populated form with user data
- Active/Inactive toggle
- Super Admin toggle
- Module permissions matrix
- Uses `useParams()` hook for route params

### Profile Page

**Profile Page** (`/profile`):
- Personal information section (name, email - readonly)
- Super Admin badge display
- Change password section with:
  - Current password input
  - New password with strength requirements
  - Confirm password
  - Real-time password validation indicators
  - Show/hide password toggles
- Account information (status, created date, user ID)
- Success/error alerts for both forms

**Password Requirements:**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&#)

---

## Key Patterns & Conventions

### API Route Pattern
```typescript
// src/app/api/[resource]/route.ts
export async function GET(request: NextRequest) {
  // 1. Auth check
  // 2. Get current user & tenantId
  // 3. Parse query params
  // 4. Call service layer
  // 5. Return JSON response
}

export async function POST(request: NextRequest) {
  // 1. Auth check
  // 2. Get current user & tenantId
  // 3. Parse & validate body with Zod
  // 4. Call service layer
  // 5. Return JSON response
}
```

### Service Layer Pattern
```typescript
// src/services/[resource]-service.ts
export class ResourceService {
  static async getAll(tenantId: string, filters?: Filters) {
    // Always filter by tenantId
    return prisma.resource.findMany({
      where: { tenantId, ...filters },
    })
  }

  static async create(tenantId: string, data: CreateInput) {
    return prisma.resource.create({
      data: { ...data, tenantId },
    })
  }
}
```

### Validator Pattern
```typescript
// src/validators/[resource].ts
import { z } from 'zod'

export const createResourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  // ...
})

export const updateResourceSchema = createResourceSchema.partial()

export type CreateResourceInput = z.infer<typeof createResourceSchema>
```

### Frontend Page Pattern
```typescript
'use client'

export default function ResourcePage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const response = await fetch('/api/resource')
    const result = await response.json()
    setData(result.data)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="..." />
      {loading ? <LoadingSpinner /> : <DataTable data={data} />}
    </div>
  )
}
```

### VendorSelector Component

For selecting suppliers filtered by purchase type in Purchase Orders:

```typescript
import { VendorSelector } from '@/components/shared/vendor-selector'

function PurchaseOrderForm() {
  const [purchaseType, setPurchaseType] = useState('')
  const [vendorId, setVendorId] = useState('')

  return (
    <VendorSelector
      purchaseType={purchaseType}
      value={vendorId}
      onChange={(id, supplier) => {
        setVendorId(id)
        // supplier object contains: id, code, name, supplyCategories, email, gstNumber
      }}
      label="Vendor"
      required
    />
  )
}
```

**Props:**
- `purchaseType` (required): Filter suppliers by this purchase type
- `value`: Currently selected supplier ID
- `onChange(supplierId, supplier)`: Called when selection changes
- `label`: Label text (default: "Vendor")
- `placeholder`: Placeholder text
- `disabled`: Disable the selector
- `required`: Show required indicator

### Dynamic Route Params (Next.js 14/15)

**Option 1: useParams() hook (Recommended for client components)**
```typescript
'use client'
import { useParams } from 'next/navigation'

export default function Page() {
  const params = useParams()
  const id = params?.id as string
  // ...
}
```

**Option 2: use() with Promise params (Next.js 15+ server components)**
```typescript
import { use } from 'react'

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  // ...
}
```

---

## Current State & Next Steps

### Completed
- [x] Project setup (Next.js, Prisma, Supabase)
- [x] Database schema design & migration
- [x] UI component library (shadcn/ui)
- [x] Slice 1: User Management
- [x] Slice 2: Supplier Management

### In Progress
- [ ] Testing Slice 2 implementation

### Next Up
- [ ] Slice 3: Product Management
- [ ] Slice 4: Purchase Orders
- [ ] Slice 5: GRN & Inventory

### Known Issues
- None currently documented

### Recently Added (2026-02-04)
- **Real-time Form Validation for Supplier Forms:**
  - Validates fields on change and blur
  - Shows error messages immediately below invalid fields
  - Red border on invalid fields using `border-destructive` class
  - Submit button disabled until form is valid
  - Validation rules:
    - Name: Required, minimum 2 characters
    - Email: Valid email format (optional)
    - Phone: 10-15 digits (optional)
    - GST: Exactly 15 characters with valid format (optional)
    - PAN: Exactly 10 characters with valid format (optional)
    - IFSC: Valid format like HDFC0001234 (optional)
    - Supply Categories: At least 1 required
  - Character count shown for GST/PAN fields
  - Auto-uppercase for GST, PAN, IFSC fields

### Recently Added (2026-02-03)
- **Supply Categories feature for Suppliers:**
  - Added `supplyCategories` field to Supplier model (PostgreSQL array)
  - Updated supplier forms (new/edit) with category checkboxes (14 purchase types)
  - Added `purchaseType` filter to supplier list API
  - New `/api/suppliers/by-purchase-type` endpoint for PO vendor dropdown
  - Created `VendorSelector` component for Purchase Order module
- Profile page with change password functionality
- Alert UI component
- Updated user menu dropdown (removed Settings, linked Profile)

### Recently Fixed (2026-02-03)
- **Fixed Sidebar Navigation:**
  - Fixed permission check order - Super Admin now sees all items immediately
  - Added Shield icon for Admin section
  - Added MSE and SNA to Finance submenu
  - Updated Admin section to be `superAdminOnly` with proper children
  - Added DollarSign and Users icons to icon map
- Fixed Edit User page `useParams()` error - switched from `use(params)` to `useParams()` hook
- Fixed User creation "Done" button redirect - now goes to `/admin/users`
- Added tooltips to Edit and Deactivate buttons on user list page

### Environment Variables Required
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## How to Use This Document

1. **New Chat Session:** Share this file at the start to provide full context
2. **After Changes:** Update relevant sections and the "Last Updated" date
3. **Adding Features:** Document new endpoints, pages, and patterns
4. **Tracking Progress:** Update the "Implemented Slices" section

---

*This document is auto-maintained by Claude Code. Update after every significant change.*
