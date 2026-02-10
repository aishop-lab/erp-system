# ERP System - Project Context

> **Last Updated:** 2026-02-09 (PO Workflow Refinement + Cascading Dropdown for All Product Types)

## Overview

Multi-tenant ERP system for managing users, suppliers, products, purchase orders, inventory, production, and finance. All data scoped by `tenantId`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, PostgreSQL (Supabase), Prisma, Supabase Auth, shadcn/ui, Tailwind CSS, Zod, TanStack Table

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── admin/users/, admin/settings/
│   │   ├── suppliers/
│   │   ├── products/{styles,fabrics,raw-materials,packaging,finished}/
│   │   ├── purchase-orders/, purchase-orders/new, [id]/, [id]/edit/
│   │   ├── inventory/, production/, finance/
│   │   └── profile/
│   └── api/
│       ├── users/, me/, profile/
│       ├── suppliers/[id]/{contacts,pricing}/
│       ├── admin/settings/{sales-channels,entities,payment-modes}/
│       ├── product-info/{styles,fabrics,raw-materials,packaging,finished}/
│       │   ├── finished/[id]/media/[mediaId]/
│       │   ├── finished/{categories,styles-by-category,colors,sizes,lookup}/
│       │   └── search/                # Cross-library product search
│       └── purchase-orders/
│           └── [id]/{submit,approve}/
├── components/
│   ├── ui/                    # shadcn components
│   ├── shared/                # page-header, loading-spinner, vendor-selector
│   ├── products/media-upload.tsx
│   ├── purchase-orders/       # po-form, po-list, po-detail, product-search, add-line-item-dialog
│   └── layout/sidebar.tsx, header.tsx
├── lib/
│   ├── prisma.ts, utils.ts, constants.ts
│   ├── media-upload.ts       # Supabase Storage upload utility
│   └── supabase/{client,server}.ts
├── services/                  # Business logic (supplier, user, settings, product-info)
├── validators/                # Zod schemas
└── hooks/

scripts/migrations/            # Data migration scripts (excluded from build)
data/                          # CSV files for migration
```

---

## Database Models

### Core
- **Tenant** - Multi-tenant isolation
- **User** - With supabaseUserId, role, isSuperAdmin
- **UserPermission** - Module-level permissions (none/view/edit)

### Suppliers
- **Supplier** - With auto-generated code (SUP001), supplyCategories[], contacts, pricing
- **SupplierContact** - With isPrimary flag
- **SupplierPricing** - Product-supplier price mapping

### Product Information (5 Libraries)
- **Style** - Garment templates with 50+ measurement fields (chest32-50, length32-50, etc.)
- **Fabric** - Material, color, design, work, cost, supplier relation
- **RawMaterial** - Buttons, zippers, threads with cost per SKU
- **Packaging** - Boxes, polybags by channel
- **FinishedProduct** - Style + Fabric combination, selling channels, pricing
- **MediaFile** - Images/videos with isPrimary, sortOrder, stored in Supabase Storage

### Admin Settings
- **SalesChannel** - Amazon, Myntra, Shopify, etc.
- **Entity** - Business entities with GST
- **PaymentMode** - Bank accounts per entity

### Purchase Orders
- **PurchaseOrder** - 14 types, 4 entry modes, status workflow (draft→pending→approved→GRN)
- **POLineItem** - Catalog-based items with product reference
- **POLineItemFreetext** - Free-text items for services
- **POLineItemRefund** - Customer refund entries

### Future (Schema Ready)
- GRN, InventoryBatch, StockLedger
- ProductAmazon, ProductMyntra, ProductShopify, ProductFlipkart, ProductNykaa

---

## API Endpoints

### Auth Pattern
```typescript
const supabase = await createClient()
const { data: { user: authUser } } = await supabase.auth.getUser()
const currentUser = await prisma.user.findUnique({ where: { supabaseUserId: authUser.id } })
// Use currentUser.tenantId for all queries
```

### Key Endpoints
| Resource | Endpoints |
|----------|-----------|
| Users | GET/POST `/api/users`, GET/PUT `/api/users/[id]`, permissions |
| Profile | GET/PUT `/api/profile`, POST `/api/profile/change-password` |
| Suppliers | CRUD + `/active`, `/by-purchase-type`, contacts, pricing |
| Settings | `/api/admin/settings/{sales-channels,entities,payment-modes}` |
| Styles | CRUD `/api/product-info/styles/[id]` |
| Fabrics | CRUD `/api/product-info/fabrics/[id]` |
| Raw Materials | CRUD `/api/product-info/raw-materials/[id]` |
| Packaging | CRUD `/api/product-info/packaging/[id]` |
| Finished Products | CRUD `/api/product-info/finished/[id]` |
| Media | GET/POST `/api/product-info/finished/[id]/media`, PATCH/DELETE `[mediaId]` |
| Product Search | GET `/api/product-info/search?type={finished,fabric,raw_material,packaging}&q=` |
| Finished Lookup | GET `/api/product-info/finished/{categories,styles-by-category,colors,sizes,lookup}` |
| Fabric Lookup | GET `/api/product-info/fabrics/{materials,colors,designs,works,lookup}` |
| RawMaterial Lookup | GET `/api/product-info/raw-materials/{types,colors,lookup}` |
| Packaging Lookup | GET `/api/product-info/packaging/{types,channels,dimensions,lookup}` |
| Purchase Orders | CRUD `/api/purchase-orders/[id]`, POST `[id]/submit`, `[id]/approve` |

---

## Key Components

### VendorSelector
Filter suppliers by purchase type for PO forms:
```typescript
<VendorSelector purchaseType={type} value={id} onChange={(id, supplier) => {}} />
```

### MediaUpload
Drag-and-drop media upload for products:
```typescript
<MediaUpload productId={id} existingMedia={media} onMediaChange={setMedia} maxImages={14} maxVideos={1} />
```
- Supports: JPG, PNG, WEBP (5MB), MP4, MOV (50MB)
- Features: Preview grid, set primary, delete, upload progress

### POForm
Handles all 14 purchase types with appropriate entry modes:
```typescript
<POForm mode="create" />  // New PO
<POForm mode="edit" initialData={purchaseOrder} />  // Edit draft PO
```
- Auto-selects entry mode based on purchase type
- AddLineItemDialog for all catalog items (Finished, Fabric, Raw Material, Packaging)
- Free-text forms for services
- Save as Draft or Save & Submit actions
- **Note:** Entity field removed from PO creation (only used for payment execution)

### AddLineItemDialog
Cascading dropdown supporting all product types:
```typescript
<AddLineItemDialog
  open={open}
  onOpenChange={setOpen}
  purchaseType={purchaseType}
  supplierId={supplierId}
  supplierCode="SUP001"
  onAdd={(item) => addLineItem(item)}
/>
```
**Cascading flows by type:**
- **Finished:** Category → Style → Color → Size
- **Fabric:** Material → Color → Design → Work
- **Raw Material:** Type → Color
- **Packaging:** Type → Channel → Dimensions

Features:
- Searchable dropdowns at each level
- Shows vendor pricing when available
- Auto-populates SKU, price, and GST

### Dynamic Route Params
```typescript
// Client components - use hook
const params = useParams()
const id = params?.id as string

// API routes - await Promise
const { id } = await params
```

---

## Implemented Features

### Slice 1: User Management ✅
- User CRUD (Super Admin only), permissions matrix, password management

### Slice 2: Supplier Management ✅
- Auto-generated codes, contacts, pricing catalog, supply categories
- Real-time form validation, CSV pricing upload

### Slice 2.5: Admin Settings ✅
- Sales channels, entities with payment modes, company info

### Slice 3: Product Information ✅

**Phase 1 - CRUD & UI:**
- 5 product libraries with list/create/edit pages
- Style measurements, fabric/supplier relations, sales channel checkboxes

**Phase 2 - Data Migration:**
- CSV parsing utilities in `scripts/migrations/`
- Scripts: `01-migrate-styles.ts` through `05-migrate-products.ts`
- Results: 8 styles, 44 fabrics, 19 raw materials, 17 packaging, 100 products
- Commands: `npm run migrate:products`, `migrate:validate`, `migrate:rollback`

**Phase 3A - Media Management:**
- MediaFile model with Supabase Storage integration
- MediaUpload component with react-dropzone
- API routes for CRUD, set primary, reorder
- Limits: 14 images, 1 video per product

### Slice 4: Purchase Orders ✅

**14 Purchase Types:**
- Catalog-based: Finished, Fabric, Raw Material, Packaging, Corporate Assets
- Linked to Finished: Samples, Influencer Samples
- Free-text: Transportation, Advertisement, Office Expenses, Software, Feedback, Misc
- Special: Customer Refunds

**Entry Modes:** catalog, free_text, link_finished, special

**Features:**
- POForm component handles all 14 types with appropriate entry modes
- **Entity field removed from PO creation** (entities only used for payment execution)
- Cascading dropdown for ALL catalog types via AddLineItemDialog:
  - Finished: Category → Style → Color → Size
  - Fabric: Material → Color → Design → Work
  - Raw Material: Type → Color
  - Packaging: Type → Channel → Dimensions
- Searchable dropdowns with vendor pricing indicator
- Job Work support (raw_materials_issued mode for Finished type)
- Approval workflow with approve/reject dialogs
- Draft editing, status transitions, print view
- POList with search, status & type filters, pagination

**Status Flow:** draft → pending_approval → approved → (GRN flow)

### Not Yet Implemented
- Slice 5: GRN & Inventory
- Slice 6: Production
- Slice 7: Finance
- Channel-specific UIs (Amazon, Myntra fields)
- Bulk operations, CSV import for products

---

## Environment & Config

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Manual Setup:**
- Create Supabase Storage bucket `product-media` with public read access

**Build Notes:**
- `scripts/` excluded from TypeScript compilation in `tsconfig.json`
- Migration scripts run via `npx cross-env TENANT_ID=xxx npm run migrate:*`

---

## Changelog

### 2026-02-09
- **Cascading Dropdown for Line Items**
- AddLineItemDialog with Category → Style → Color → Size flow
- 5 new API endpoints for attribute filtering: categories, styles-by-category, colors, sizes, lookup
- Searchable dropdowns with vendor pricing indicator
- Integrated into POForm for Finished, Samples, Influencer Samples types

### 2026-02-09 (Phase 4)
- **Phase 4 Purchase Orders complete**
- POForm, POList, PODetail, ProductSearch components
- API routes: CRUD, submit, approve/reject
- 14 purchase types with 4 entry modes
- Approval workflow with dialogs
- Product search across all 5 libraries

### 2026-02-09 (earlier)
- Phase 3A Media Management complete
- MediaUpload component with drag-drop, preview, primary selection
- Media API routes (list, create, update, delete)
- Supabase Storage integration

### 2026-02-06
- Phase 2 Data Migration complete (100 products migrated)
- Migration scripts for all 5 libraries
- Added 13 missing fabric combinations

### 2026-02-05
- Product Information Module Phase 1 complete
- 5 libraries: Style, Fabric, Raw Material, Packaging, Finished Products
- Admin Settings: Sales Channels, Entities, Payment Modes

### 2026-02-04
- Real-time form validation for suppliers
- Supply categories feature

### 2026-02-03
- Profile page with change password
- Sidebar navigation fixes
- VendorSelector component

---

*Update this file after every significant change.*
