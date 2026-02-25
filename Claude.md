# ERP System - Project Context

> **Last Updated:** 2026-02-15 (Production Module - In-House + Job Work)

## Overview

Multi-tenant ERP system for managing users, suppliers, products, purchase orders, inventory, production, and finance. All data scoped by `tenantId`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, PostgreSQL (Supabase), Prisma, Supabase Auth, shadcn/ui, Tailwind CSS, Zod, TanStack Table

---

## Project Structure

```1
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── admin/users/, admin/settings/
│   │   ├── admin/approvals/{po,payments}/
│   │   ├── suppliers/
│   │   ├── products/{styles,fabrics,raw-materials,packaging,finished}/
│   │   ├── purchase-orders/, purchase-orders/new, [id]/, [id]/edit/
│   │   ├── inventory/, inventory/grn/, inventory/ledger/
│   │   ├── production/, production/in-house/, production/in-house/new, [id]/
│   │   ├── production/job-work/, production/job-work/issue/
│   │   ├── finance/, finance/reconciliation/, finance/payments/
│   │   ├── finance/{fulton,mse,sna}/        # Entity-specific payment pages
│   │   └── profile/
│   └── api/
│       ├── users/, me/, profile/
│       ├── suppliers/[id]/{contacts,pricing}/
│       ├── admin/settings/{sales-channels,entities,payment-modes}/
│       ├── admin/approvals/po/[id]/approve/
│       ├── product-info/{styles,fabrics,raw-materials,packaging,finished}/
│       │   ├── finished/[id]/media/[mediaId]/
│       │   ├── finished/{categories,styles-by-category,colors,sizes,lookup}/
│       │   └── search/                # Cross-library product search
│       ├── purchase-orders/[id]/{submit,approve}/
│       ├── inventory/{grn,stock-overview,stock-ledger}/
│       ├── production/
│       │   ├── orders/, orders/[id]/, orders/[id]/complete/
│       │   ├── job-work/eligible-pos/, job-work/issue-rm/
│       │   └── available-batches/
│       └── finance/
│           ├── reconciliation/[poId]/, [poId]/submit/
│           └── payments/[id]/, [id]/{approve,execute}/
├── components/
│   ├── ui/                    # shadcn components
│   ├── shared/                # page-header, loading-spinner, vendor-selector, empty-state
│   ├── products/media-upload.tsx
│   ├── purchase-orders/       # po-form, po-list, po-detail, product-search, add-line-item-dialog
│   ├── inventory/             # BarcodePrintModal, barcode-labels/ (Fabric, RawMaterial, Packaging, Finished)
│   ├── finance/               # reconciliation-list, reconciliation-form, payment-list,
│   │                          # payment-detail, payment-execution-form, entity-payment-list
│   └── layout/sidebar.tsx, header.tsx
├── lib/
│   ├── prisma.ts, utils.ts, constants.ts
│   ├── media-upload.ts       # Supabase Storage upload utility
│   └── supabase/{client,server}.ts
├── services/                  # Business logic (supplier, user, settings, product-info,
│                              # grn, inventory, reconciliation, finance, production)
├── validators/                # Zod schemas (supplier, purchase-order, reconciliation, payment, production)
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
- **SupplierPricing** - Polymorphic (productId + productType, no FK); tenantId, unitPrice?, jobWorkRate?, directPurchaseRate?; unique on [tenantId, supplierId, productId, productType]

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

### Inventory & GRN
- **GRN** - Goods receipt with poNumber, supplierId, grnDate, receivedBy, deliveryChallan, vehicleNumber, status; User relation via `user` field (not `createdBy` which is a plain String)
- **GRNLineItem** - receivedQty, acceptedQty, rejectedQty, condition, batchNumber
- **InventoryBatch** - Polymorphic (productId + productType + sku, no FK); fields: initialQty, currentQty, status, grnId
- **StockLedger** - Polymorphic (productId + productType + sku, no FK); movementType is String (not enum); fields: qtyIn, qtyOut, batchBalance, skuBalance, createdBy (String), referenceNumber

### Production
- **Production** - productionNumber, productionType (in_house|job_work), status (planned|materials_issued|in_progress|completed|cancelled), outputProductId, sku, productName, plannedQty, actualQty, rejectedQty, wasteQty, targetDate, completionDate, costs, completedById
- **ProductionMaterial** - productId (FK to Product), quantity, batchId

### Finance
- **Payment** - Full lifecycle: status enum (pending, pending_approval, approved, executed, rejected, paid, cod); invoice fields (invoiceNumber, invoiceDate, invoiceAmount, invoiceAttachment); execution fields (amountPaid, tdsDeducted, netAmountPaid, paymentProof, transactionReference); audit (createdById, approvedById, executedById with User relations); linked to PO, Supplier, Entity, PaymentMode, ExternalVendor
- **MarketplaceSettlement** - salesChannelId, grossAmount, fees, netAmount
- **ApprovalAuditLog** - approvalType (po_approval, payment_approval), action, userId, reason, referenceId

### Future (Schema Ready)
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
| Admin PO Approvals | GET `/api/admin/approvals/po`, POST `/api/admin/approvals/po/[id]/approve` |
| Reconciliation | GET `/api/finance/reconciliation`, GET `[poId]`, POST `[poId]/submit` |
| Payments | GET `/api/finance/payments?entityId=&status=`, GET `[id]`, POST `[id]/approve`, POST `[id]/execute` |
| Inventory | GET `/api/inventory/grn/`, `/api/inventory/stock-overview/`, `/api/inventory/stock-ledger/` |
| Production Orders | GET/POST `/api/production/orders`, GET `/api/production/orders/[id]`, POST `[id]/complete` |
| Job Work | GET `/api/production/job-work/eligible-pos`, POST `/api/production/job-work/issue-rm` |
| Available Batches | GET `/api/production/available-batches?productType=&search=` |
| External Vendors | GET `/api/external-vendors/shivaang` |

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

### Slice 5: GRN & Inventory (In Progress)
- **GRN Service**: createGRN (with inventory batch + stock ledger), getGRNs, getGRNById, getEligiblePOs, getPOForGRN
- **Inventory Service**: getInventoryStock (queries InventoryBatch), getStockLedger
- **GRN UI**: List page, create form (PO selector → line items → submit), detail page
- **Stock Overview**: Real-time dashboard grouped by SKU, summary cards (total SKUs, low stock, out of stock, by type), expandable batch details, CSV export
- **Stock Ledger**: Full transaction history with filters (product type, movement type, SKU, date range, search), pagination, color-coded movements, CSV export
- **Admin Approvals UI**: PO approvals page with approve/reject dialogs
- **API Routes**: `/api/inventory/grn/`, `/api/inventory/stock-overview/`, `/api/inventory/stock-ledger/`, `/api/admin/approvals/po/`

### Slice 7: Finance ✅
- **Reconciliation**: three-way match (PO vs GRN vs Invoice), entity assignment, transport/other charges, file attachments (invoice + signed GRN), payment auto-creation
- **Payments**: approval workflow (pending_approval → approved → executed), execution with TDS, entity-specific payment listing pages
- **Admin Payment Approvals**: dedicated page for approving/rejecting payments with inline dialogs
- **Entity Payment Pages**: Fulton (`/finance/fulton`), MSE (`/finance/mse`), SNA (`/finance/sna`) - filtered payment lists per entity
- **API Routes**: `/api/finance/reconciliation/`, `/api/finance/payments/`
- **Status Flow**: PO: goods_received → payment_pending → payment_approved → paid; Payment: pending_approval → approved → executed

### External Vendors: Shivaang ✅
- **Dashboard**: Overview cards (total orders, pending, completed, total paid), tabbed interface
- **Tabs**: Overview (partnership summary + quick actions), Transactions (interleaved POs/payments), Pending Orders (table), Payment History (table with paid amounts)
- **API**: `GET /api/external-vendors/shivaang` - aggregates POs and payments filtered by Shivaang entity
- **Data Source**: Queries PurchaseOrder and Payment where `entityId` matches Shivaang (set during reconciliation)
- **Reusable Pattern**: Same approach works for any entity-specific vendor dashboard

### Slice 5B: Barcode Labels ✅
- **Barcode Print Modal**: Auto-opens after GRN creation with barcode labels for all received items
- **4 Label Components**: FabricLabel, RawMaterialLabel, PackagingLabel, FinishedProductLabel
- **Features**: CODE128 barcodes via JsBarcode, thermal printer-ready (50mm x 25mm), per-item quantity controls, live preview, react-to-print v3
- **Components**: `src/components/inventory/BarcodePrintModal.tsx`, `src/components/inventory/barcode-labels/`

### Slice 6: Production ✅
- **In-House Production**: Create production orders (SKU, product name, planned qty, target date), list with search/pagination, detail page with cost summary
- **Complete Production**: Dialog with actual qty, rejected, waste, labor/overhead costs; auto-creates output inventory batch + stock ledger entries; calculates total cost & cost/unit
- **Job Work Orders**: Lists eligible POs (approved with rawMaterialMode), issue RM from inventory batches to vendors
- **Batch Selection**: Dropdown of available batches with qty input, prevents duplicate batch selection
- **Service**: `src/services/production-service.ts` - getProductions, createProduction, completeProduction, getEligiblePOsForRMIssuance, getAvailableBatches, issueRawMaterials
- **API Routes**: 6 endpoints under `/api/production/`
- **UI Pages**: 6 pages - dashboard with tabs, in-house list/new/detail, job work list/issue
- **Status Flow**: planned → materials_issued → in_progress → completed
- **Number Formats**: `PRD-YYMM-NNNN` (in-house), `JWK-YYMM-NNNN` (job work)

### Not Yet Implemented
- Slice 5: GRN & Inventory - outflow UI, adjustments UI
- Slice 7: Finance - Settlements, Invoices, Credits (stub pages exist)
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

### 2026-02-15
- **Production Module - In-House + Job Work**
- Schema: Extended Production model with ~20 new fields (sku, productName, plannedQty, actualQty, costs, dates, completedById); added `materials_issued` to ProductionStatus enum
- Service: Full rewrite of `production-service.ts` - completeProduction (material consumption, output batch, stock ledger, cost calc), getEligiblePOsForRMIssuance, getAvailableBatches
- 6 API routes: `/api/production/orders` (GET/POST), `orders/[id]` (GET), `orders/[id]/complete` (POST), `job-work/eligible-pos` (GET), `job-work/issue-rm` (POST), `available-batches` (GET)
- 6 UI pages: Production dashboard with tabs + stats, in-house list/new/detail, job work list + issue RM form
- Complete production dialog: actual qty, rejected, waste, labor/overhead costs
- Barcode label printing: 4 product-type labels (Fabric, RawMaterial, Packaging, Finished), BarcodePrintModal with qty controls, CODE128 via JsBarcode, react-to-print v3
- GRN service updated to return inventoryBatches with product details for barcode generation

### 2026-02-14 (external vendors)
- **Shivaang External Vendor Dashboard**
- API: `GET /api/external-vendors/shivaang` - aggregates POs and payments filtered by Shivaang entity ID
- Dashboard page with 4 overview cards (total/pending/completed orders, total paid)
- Tabbed UI: Overview (summary + quick actions), Transactions (interleaved activity feed), Pending Orders (table), Payment History (table with paid/TDS amounts)
- Uses existing PO_STATUS_MAP and PAYMENT_STATUS_MAP for consistent status badges
- Data sourced from PurchaseOrder and Payment tables filtered by entityId (no new schema needed)

### 2026-02-14 (later)
- **Finance Module - Reconciliation & Payments Complete**
- Fixed 3 bugs in reconciliation-form.tsx: `receivedAt` → `grnDate`, `createdBy` → `user`, `item.product?.name` → `item.sku`
- Enhanced reconciliation form: transport/other charges field, invoice & signed GRN file uploads, amount payable calculation, improved PO details layout
- Updated reconciliation validator & service to support `transportCharges` and `grnAttachment`
- Entity-specific payment pages: `/finance/fulton`, `/finance/mse`, `/finance/sna` (filter payments by entity)
- Admin Payment Approvals page (`/admin/approvals/payments`): list pending payments, approve/reject with dialog
- New component: `EntityPaymentList` - reusable entity-filtered payment list

### 2026-02-14
- **Stock Ledger & Stock Overview Implementation**
- Stock Overview page (`/inventory`): summary cards (Total SKUs, Low Stock, Out of Stock, By Type), filterable stock table grouped by SKU, expandable batch details, CSV export
- Stock Ledger page (`/inventory/ledger`): full transaction history with filters (product type, movement type, SKU, date range, search), pagination (50/page), color-coded quantity badges (green=in, red=out), CSV export
- API: `GET /api/inventory/stock-overview` (aggregates InventoryBatch by SKU with summary stats)
- API: `GET /api/inventory/stock-ledger` (StockLedger query with filters and pagination)
- Navigation already configured in constants.ts

### 2026-02-12 (later)
- **Dual Pricing for Finished Products**
- SupplierPricing model → polymorphic (productId + productType as plain strings, no FK to Product)
- Added `tenantId`, `jobWorkRate`, `directPurchaseRate` fields; `unitPrice` now optional
- Unique constraint: `[tenantId, supplierId, productId, productType]`
- Finished lookup API returns both `jobWorkRate` and `directPurchaseRate`
- AddLineItemDialog accepts `rawMaterialMode` prop; picks jobWorkRate for RM Issued, directPurchaseRate for Direct Purchase
- POForm passes `rawMaterialMode` to AddLineItemDialog
- Supplier pricing UI: shows Type, Direct Purchase Rate, Job Work Rate columns; CSV template updated
- Supplier service: getPricing returns flat records (no Product join); uploadPricingFromCsv looks up SKUs across all product tables
- Removed `supplierPricings` relation from Product model; fixed product-service.ts

### 2026-02-12
- **Schema alignment fixes** across all service files after schema restructure
- `inventory-service.ts`: Rewrote to query InventoryBatch directly (Product has no inventoryBatches relation); StockLedger uses `batch` relation (no `product` relation)
- `production-service.ts`: Fixed StockLedger creates (quantity → qtyIn/qtyOut/batchBalance/skuBalance/createdBy/referenceNumber); InventoryBatch quantity → currentQty; added userId params
- `reconciliation-service.ts`: GRN receivedAt → grnDate; GRN createdBy include → user include
- `finance-service.ts`: GRN receivedAt → grnDate
- `grn-service.ts`: Full rewrite for new GRN fields (poNumber, supplierId, grnDate, receivedBy, status, createdBy/createdById); InventoryBatch create (not upsert); StockLedger new fields
- GRN/Approvals UI: List, create form, detail pages for GRN; PO approvals page with approve/reject dialogs
- All TypeScript errors resolved (tsc --noEmit clean)

### 2026-02-11
- **Finance Module (Reconciliation + Payments)**
- Schema: PO.entityId optional, reconciliation fields on PO, enhanced Payment model, new PaymentStatus values
- Admin Approvals API: GET/POST `/api/admin/approvals/po/[id]/approve` with audit logging
- Reconciliation: three-way match (PO vs GRN vs Invoice), entity assignment, payment creation
- Payments: approval workflow (pending_approval → approved → executed), execution with TDS
- 9 new API endpoints, 5 UI components, 6 pages
- PO integration: "Reconcile" button on goods_received POs
- Fixed POLineItem type errors (no product relation, receivedQty from GRNLineItem aggregation)

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
