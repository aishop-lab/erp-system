# ERP System - Complete Feature Testing Checklist

> **Generated:** 2026-02-24 | **Covers:** All implemented, incomplete, and missing features

---

## Table of Contents

1. [Authentication & Login](#1-authentication--login)
2. [User Management (Admin)](#2-user-management-admin)
3. [Profile & Password](#3-profile--password)
4. [Supplier Management](#4-supplier-management)
5. [Product Information (5 Libraries)](#5-product-information)
6. [Purchase Orders](#6-purchase-orders)
7. [Inventory & GRN](#7-inventory--grn)
8. [Production](#8-production)
9. [Finance](#9-finance)
10. [Admin Settings](#10-admin-settings)
11. [Navigation, Sidebar & Layout](#11-navigation-sidebar--layout)
12. [External Vendors](#12-external-vendors)
13. [Known Bugs](#13-known-bugs)
14. [Missing / Incomplete Features](#14-missing--incomplete-features)

---

## 1. Authentication & Login

### Login Page (`/login`)

| # | Test Case | Expected |
|---|-----------|----------|
| 1.1 | Enter valid email + password and submit | Redirect to `/dashboard` |
| 1.2 | Enter wrong credentials | Red error text below password field (Supabase error message) |
| 1.3 | Submit with empty email | HTML5 required validation fires |
| 1.4 | Submit with empty password | HTML5 required validation fires |
| 1.5 | Submit with invalid email format | HTML5 email validation fires |
| 1.6 | Double-click Sign In while loading | Button disabled + spinner during submission |
| 1.7 | Visit `/login` while already authenticated | Redirect to `/dashboard` |
| 1.8 | Visit protected route while unauthenticated | Redirect to `/login` |

### Middleware / Route Protection

| # | Test Case | Expected |
|---|-----------|----------|
| 1.9 | Visit `/dashboard`, `/purchase-orders`, `/suppliers`, `/products`, `/inventory`, `/production`, `/finance`, `/external-vendors`, `/admin` while unauthenticated | All redirect to `/login` |
| 1.10 | Visit `/profile` while unauthenticated | **BUG**: `/profile` is NOT in protected paths list - page loads, API calls fail with 401 |

### Session

| # | Test Case | Expected |
|---|-----------|----------|
| 1.11 | Session refresh on page load | Supabase cookie refreshed via middleware |
| 1.12 | Sign out | Redirected to `/login`, session cleared |
| 1.13 | `GET /api/me` with valid session | Returns full user profile with permissions |
| 1.14 | `GET /api/me` with no session | 401 |
| 1.15 | `GET /api/me` - user exists by email but not by supabaseUserId | Account auto-linked (supabaseUserId backfilled silently) |

### Missing Features

- [ ] No "Forgot Password" flow anywhere
- [ ] No "Remember Me" option
- [ ] No redirect to originally requested URL after login (always goes to `/dashboard`)
- [ ] No client-side rate limiting (relies on Supabase backend limits)

---

## 2. User Management (Admin)

### User List (`/admin/users`)

| # | Test Case | Expected |
|---|-----------|----------|
| 2.1 | Access as Super Admin | Table of users with Name, Email, Role, Status, Permissions, Actions |
| 2.2 | Access as non-Super Admin | "Access Denied" page header (no redirect) |
| 2.3 | Click "Add User" button | Navigate to `/admin/users/new` |
| 2.4 | Click Edit (pencil icon) on a user | Navigate to `/admin/users/[id]` |
| 2.5 | Click Deactivate on an active user | Confirm dialog, then user set inactive |
| 2.6 | Click Activate on an inactive user | Confirm dialog, then user set active |
| 2.7 | Own account row | Activate/Deactivate button hidden |
| 2.8 | No users exist | Empty state: "No users" |
| 2.9 | Role badges display | Super Admin = purple shield, Regular = secondary "User" |
| 2.10 | Permissions count | Super Admin = "Full Access", Regular = "N modules" |

### Create User (`/admin/users/new`)

| # | Test Case | Expected |
|---|-----------|----------|
| 2.11 | Fill name + email + submit (non-Super Admin) | User created, dialog shows temporary password |
| 2.12 | Copy temporary password button | Clipboard copy with check icon (2s) |
| 2.13 | Click "Done" | Navigate to `/admin/users` |
| 2.14 | Name less than 2 chars | Zod validation error |
| 2.15 | Invalid email format | Zod validation error |
| 2.16 | Duplicate email | Supabase error surfaced |
| 2.17 | Toggle Super Admin ON | Permissions matrix hidden |
| 2.18 | Toggle Super Admin OFF | Permissions matrix visible (8 modules) |
| 2.19 | Set permissions per module | Dropdown: None / View / Edit per module/sub-module |
| 2.20 | Production sub-modules | "In-House Production" and "Job Work - Issue Materials" shown |
| 2.21 | Finance sub-modules | Only "Fulton" shown (MSE/SNA missing) |
| 2.22 | Admin Approvals sub-modules | "PO Approvals" and "Payment Approvals" |

### Edit User (`/admin/users/[id]`)

| # | Test Case | Expected |
|---|-----------|----------|
| 2.23 | Load existing user | Form pre-filled with name, email (disabled), active, super admin, permissions |
| 2.24 | Email field | Disabled, shows "Email cannot be changed" |
| 2.25 | Toggle active status | User activated/deactivated |
| 2.26 | Toggle Super Admin for self | **RISK**: No self-protection - admin can lock themselves out |
| 2.27 | Update permissions | Old permissions deleted, new ones bulk created |
| 2.28 | User not found | Toast error, redirect to `/admin/users` |

### API Edge Cases

| # | Test Case | Expected |
|---|-----------|----------|
| 2.29 | `GET /api/users/[id]` - user from different tenant | **BUG**: No tenant isolation check on single user fetch |
| 2.30 | `DELETE /api/users/[id]` | Endpoint exists but UI never calls it (uses PUT for deactivation) |
| 2.31 | Password generation | 14 chars, excludes ambiguous chars, uses `Math.random()` (not crypto-secure) |
| 2.32 | `role` field | Always "user" - never changed anywhere in codebase |

---

## 3. Profile & Password

### Profile Page (`/profile`)

| # | Test Case | Expected |
|---|-----------|----------|
| 3.1 | View personal info | Name (editable), Email (disabled), Super Admin badge if applicable |
| 3.2 | Update name | Success alert (auto-dismiss 3s) |
| 3.3 | Empty name submit | Save button disabled |
| 3.4 | Account info section | Status badge, Created date, User ID (monospace) |

### Change Password

| # | Test Case | Expected |
|---|-----------|----------|
| 3.5 | Show/hide password toggles | Eye/EyeOff icon toggles for all 3 fields |
| 3.6 | Password strength checker | 5 rules: length>=12, uppercase, lowercase, number, special char |
| 3.7 | All rules met + matching passwords | Submit button enabled |
| 3.8 | Mismatched new/confirm passwords | Error: "New password and confirm password do not match" |
| 3.9 | Password < 12 chars | Error: "Password must be at least 12 characters long" |
| 3.10 | Wrong current password | 401 error displayed |
| 3.11 | Same old and new password | 400: "New password must be different" |
| 3.12 | Successful change | Success alert, all fields cleared |

---

## 4. Supplier Management

### Supplier List (`/suppliers`)

| # | Test Case | Expected |
|---|-----------|----------|
| 4.1 | View list | Table: Code, Name, Contact, Email, GST, Products count, Status, Actions |
| 4.2 | Search by name/code/email | Results filtered, page resets to 1 |
| 4.3 | Status filter (All/Active/Inactive) | Filter applied, page resets to 1 |
| 4.4 | Deactivate a supplier | Confirm dialog, soft-delete (isActive=false) |
| 4.5 | Activate an inactive supplier | Confirm dialog, re-activate |
| 4.6 | Pagination (Previous/Next) | Page size 10 |
| 4.7 | Empty state (no filters) | "No users" empty state with description |
| 4.8 | Click "Add Supplier" | Navigate to `/suppliers/new` |

### Create Supplier (`/suppliers/new`)

| # | Test Case | Expected |
|---|-----------|----------|
| 4.9 | Fill required fields (Name + 1 supply category) | Supplier created with auto-code (SUP001+) |
| 4.10 | Name < 2 chars | Real-time validation error on blur |
| 4.11 | GST number validation | 15 chars, regex pattern (frontend only; backend accepts any 15-char string) |
| 4.12 | PAN number validation | 10 chars, regex pattern (frontend only) |
| 4.13 | IFSC code validation | 11 chars, regex pattern (frontend only) |
| 4.14 | No supply categories selected | Submit blocked - at least 1 required |
| 4.15 | Add contacts | First auto-set as primary; trash to delete |
| 4.16 | Primary contact toggle | Setting one unsets others |
| 4.17 | Contacts with empty names | Silently dropped before POST |
| 4.18 | All 14 supply category checkboxes | Grid of checkboxes, count hint below |

### Edit Supplier (`/suppliers/[id]`)

| # | Test Case | Expected |
|---|-----------|----------|
| 4.19 | Load existing supplier | All fields pre-filled |
| 4.20 | Update basic info | PUT call succeeds |
| 4.21 | Add new contact | POST per new contact |
| 4.22 | Edit existing contact | PUT per existing contact |
| 4.23 | Delete existing contact | Confirm dialog, then DELETE |
| 4.24 | Contact sync errors | **BUG**: Errors only console-logged, no UI feedback |

### Pricing Catalog (Edit Page)

| # | Test Case | Expected |
|---|-----------|----------|
| 4.25 | View pricing table | Product ID (truncated), Type, Unit Price, Direct Purchase, Job Work, Min Qty |
| 4.26 | Download CSV template | 3-row sample CSV downloaded |
| 4.27 | Upload CSV with valid SKUs | Items matched and upserted; partial success message if some fail |
| 4.28 | Upload CSV with unknown SKUs | Error message listing unfound SKUs |
| 4.29 | Upload CSV missing `sku` column | Error thrown |
| 4.30 | Delete pricing row | Confirm dialog, hard delete |
| 4.31 | Empty pricing state | "No pricing data" message |

### VendorSelector Component

| # | Test Case | Expected |
|---|-----------|----------|
| 4.32 | No purchase type selected | Disabled dropdown: "Select purchase type first" |
| 4.33 | Purchase type with no vendors | Disabled + helper text |
| 4.34 | Purchase type with vendors | Shows `[CODE] Name` options |
| 4.35 | Loading state | Spinner + "Loading vendors..." |

### Known Issues

- [ ] No uniqueness check on supplier name (only `[tenantId, code]` is unique)
- [ ] Code generation race condition under concurrent creates
- [ ] Debug `console.log` statements in POST route (exposes PAN/GST in server logs)
- [ ] `validFrom`/`validTo` pricing fields exist in service but no UI
- [ ] No pagination on pricing catalog
- [ ] Pricing table shows truncated UUID, not human-readable SKU/name
- [ ] Deactivate/activate error feedback swallowed on list page (console only)

---

## 5. Product Information

### Products Landing (`/products`)

| # | Test Case | Expected |
|---|-----------|----------|
| 5.1 | View products hub | Card grid linking to 5 libraries |
| 5.2 | Legacy `/products/[id]` route | Shows "Product details coming soon..." (stub) |

### 5A. Style Library (`/products/styles`)

| # | Test Case | Expected |
|---|-----------|----------|
| 5.3 | View list | Table: Style Code, Style Name, Gender, Category, Status, Actions |
| 5.4 | Client-side search (name/code) | Filtered results |
| 5.5 | Create style | Required: styleCode (unique, uppercase), styleName |
| 5.6 | Duplicate styleCode | Error: "A style with this code already exists" |
| 5.7 | Measurement fields (chest32-40, length32-40) | Number inputs, step 0.01 |
| 5.8 | Edit style | All fields pre-populated |
| 5.9 | Delete (deactivate) style | API sets status=inactive |

**Missing in UI:**
- [ ] Chest sizes 42-50 (5 fields in schema, no UI)
- [ ] Length sizes 42-50 (5 fields in schema, no UI)
- [ ] All waist measurements 32-50 (10 fields in schema, no UI)
- [ ] shoulder, neckDepth, armhole, sleeveLength (4 fields in schema, no UI)
- [ ] Total: **19 measurement fields** exist in schema/validator but have no form input
- [ ] No status filter dropdown (API supports `?status=`)
- [ ] No pagination (all records loaded at once)
- [ ] No re-activate button in UI (`activate` service exists, no route/UI)

### 5B. Fabric Library (`/products/fabrics`)

| # | Test Case | Expected |
|---|-----------|----------|
| 5.10 | View list | Table: SKU, Material, Color, Supplier, Cost, Status, Actions |
| 5.11 | Client-side search (SKU, material, color) | Filtered results |
| 5.12 | Create fabric | Required: fabricSku (unique, uppercase), material, color, costAmount |
| 5.13 | Supplier dropdown | From `/api/suppliers/active` |
| 5.14 | UOM select | Meters / Yards / Pieces |
| 5.15 | Duplicate fabricSku | Error message |
| 5.16 | Cascading lookup APIs | materials → colors → designs → works → lookup |

**Known Issues:**
- [ ] Design/Work stored as literal string `"None"` (not NULL) - can cause lookup mismatches
- [ ] Debug `console.log` in lookup, materials, designs, works routes
- [ ] No pagination, no status filter in UI

### 5C. Raw Materials Library (`/products/raw-materials`)

| # | Test Case | Expected |
|---|-----------|----------|
| 5.17 | View list | Table: SKU, Type, Color, Unit, Supplier, Cost, Status, Actions |
| 5.18 | Create raw material | Required: rmSku (unique, uppercase), rmType, measurementUnit, unitsPerQuantity, costPerSku |
| 5.19 | Measurement units | Pieces / Meters / Grams / Sets / Packets |
| 5.20 | Cascading lookup APIs | types → colors → lookup |
| 5.21 | Colors with "None" value | Added when items have null/empty color |

### 5D. Packaging Library (`/products/packaging`)

| # | Test Case | Expected |
|---|-----------|----------|
| 5.22 | View list | Table: SKU, Type, Channel, Dimensions, Unit, Supplier, Cost, Status, Actions |
| 5.23 | Create packaging | Required: pkgSku (unique, uppercase), pkgType, measurementUnit, unitsPerQuantity, costPerUnit |
| 5.24 | Measurement units | Pieces / Sets / Packets / Rolls |
| 5.25 | Cascading lookup APIs | types → channels → dimensions → lookup |
| 5.26 | "None" handling for channels/dimensions | Added when items have null/empty values |

### 5E. Finished Products Library (`/products/finished`)

| # | Test Case | Expected |
|---|-----------|----------|
| 5.27 | View list | Table: Parent SKU, Child SKU, Title, Color/Size, Style Code, Fabric SKU, Cost, MRP, Status, Actions |
| 5.28 | Create finished product | Required: parentSku, childSku (unique), title, color, size, styleId, fabricId, costAmount |
| 5.29 | Style dropdown | From `/api/product-info/styles` |
| 5.30 | Fabric dropdown | From `/api/product-info/fabrics` |
| 5.31 | Entity dropdown | From `/api/admin/settings/entities`, optional |
| 5.32 | Selling channels checkboxes | Dynamic from `/api/admin/settings/sales-channels` |
| 5.33 | Cascading lookup APIs | categories → styles-by-category → colors → sizes → lookup |
| 5.34 | Supplier pricing in lookup | Returns jobWorkRate, directPurchaseRate, unitPrice |

**Missing:**
- [ ] Channel-specific data (Amazon, Myntra, Shopify, Flipkart, Nykaa) - schema ready, no UI
- [ ] `currency` hardcoded to INR, no UI control
- [ ] No delete/deactivate button on any list page

### 5F. Media Management (Finished Products Only)

| # | Test Case | Expected |
|---|-----------|----------|
| 5.35 | Drag-and-drop image upload | File uploads to Supabase Storage `product-media` bucket |
| 5.36 | Image limit (14) | Enforced client + server |
| 5.37 | Video limit (1) | Enforced client + server |
| 5.38 | Image size limit (5MB) | Validated before upload |
| 5.39 | Video size limit (50MB) | Validated before upload |
| 5.40 | File types accepted | JPG, PNG, WEBP, MP4, MOV |
| 5.41 | Set primary image | Hover → "Set as Primary" button |
| 5.42 | Delete media | Hover → "Delete" with browser `confirm()` |
| 5.43 | First image auto-primary | isPrimary set when `media.length === 0` |
| 5.44 | Upload progress | Spinner + file names listed |
| 5.45 | Sequential upload | Files uploaded one at a time, not parallel |

**Known Issues:**
- [ ] `thumbnailPath` field exists in schema, never populated
- [ ] Media only for Finished Products (not for other libraries)
- [ ] Storage delete failure → DB record still deleted (orphaned file)

### Cross-Library Product Search API

| # | Test Case | Expected |
|---|-----------|----------|
| 5.46 | `GET /api/product-info/search?type=finished&q=term` | Normalized results: id, sku, title, gstPct, uom, costPrice |
| 5.47 | Missing `type` param | 400 error |
| 5.48 | Empty `q` param | Returns all active records (up to limit) |
| 5.49 | `limit` param | Default 20 |

---

## 6. Purchase Orders

### PO List (`/purchase-orders`)

| # | Test Case | Expected |
|---|-----------|----------|
| 6.1 | View list | Table: PO#, Type, Supplier, Entity, Status, Amount, Date, Actions |
| 6.2 | Search by PO number or supplier name | Server-side filter, page resets to 1 |
| 6.3 | Status filter (11 options) | Dropdown with all PO statuses |
| 6.4 | Type filter (14 options) | Dropdown with all purchase types |
| 6.5 | Pagination (20 per page) | Previous/Next buttons |
| 6.6 | Row actions: View | Always available |
| 6.7 | Row actions: Reconcile | Only if `status === 'goods_received'` |
| 6.8 | Row actions: Edit | Only if `status === 'draft'` |
| 6.9 | Row actions: Delete | Only if `status === 'draft'`, window.confirm() |
| 6.10 | Click "New Order" | Navigate to `/purchase-orders/new` |

### PO Create (`/purchase-orders/new`)

**Header Fields:**

| # | Test Case | Expected |
|---|-----------|----------|
| 6.11 | Select Purchase Type (required) | Determines entry mode, clears all items |
| 6.12 | Raw Material Mode (only for Finished type) | "Direct Purchase" or "Raw Materials Issued (Job Work)" |
| 6.13 | Supplier dropdown (optional) | All active suppliers (NOT filtered by type) |
| 6.14 | Expected Delivery (optional) | Date picker |
| 6.15 | Notes (optional, max 1000) | Textarea |

**Catalog Entry Mode (Finished, Fabric, Raw Material, Packaging, Samples, Influencer Samples):**

| # | Test Case | Expected |
|---|-----------|----------|
| 6.16 | "Add Product" button → AddLineItemDialog | Opens cascading dropdown dialog |
| 6.17 | Inline edit: Qty, Unit Price, GST % | Directly in table row |
| 6.18 | Delete line item | Remove button per row |
| 6.19 | Totals calculated | Subtotal + GST = Grand Total |

**Free Text Entry Mode (Transportation, Advertisement, Office Expenses, Software, Feedback, Misc):**

| # | Test Case | Expected |
|---|-----------|----------|
| 6.20 | "Add Item" button | Blank row appended |
| 6.21 | Fields per row | Description, Qty, Unit Price, GST %, Total |
| 6.22 | Delete row | Remove button |

**Special Entry Mode (Customer Refunds):**

| # | Test Case | Expected |
|---|-----------|----------|
| 6.23 | "Add Refund" button | Blank refund card |
| 6.24 | Fields per card | Customer Name*, Order Number, Refund Amount*, Refund Mode*, Reason* |
| 6.25 | Refund modes | Bank Transfer, Store Credit, Original Payment Method |

**Actions:**

| # | Test Case | Expected |
|---|-----------|----------|
| 6.26 | Save as Draft | Creates PO, redirects to `/purchase-orders` |
| 6.27 | Save & Submit | Creates PO, then calls submit, redirects |
| 6.28 | Cancel | `router.back()` |

### AddLineItemDialog (Cascading Dropdowns)

| # | Test Case | Expected |
|---|-----------|----------|
| 6.29 | **Finished Products**: Category → Style → Color → Size | 4-step cascade, product found on complete |
| 6.30 | **Fabric**: Material → Color → Design → Work | 4-step cascade |
| 6.31 | **Raw Material**: Type → Color | 2-step cascade |
| 6.32 | **Packaging**: Type → Channel → Dimensions | 3-step cascade |
| 6.33 | Vendor pricing indicator | Shows if supplier has pricing configured |
| 6.34 | Job Work pricing (rawMaterialMode=raw_materials_issued) | Uses `jobWorkRate` if available |
| 6.35 | Direct Purchase pricing | Uses `directPurchaseRate` if available |
| 6.36 | Fallback pricing | Falls back to product's `costPrice` |
| 6.37 | Product not found | Error panel displayed |
| 6.38 | Upstream selection change | Downstream selections cleared |
| 6.39 | Quantity input | Min=1, integer enforced |
| 6.40 | "Add Line Item" disabled until product loaded | Prevents double-add |

### PO Detail (`/purchase-orders/[id]`)

| # | Test Case | Expected |
|---|-----------|----------|
| 6.41 | View PO summary | PO#, type, entry mode, status badge, supplier, entity, dates |
| 6.42 | Catalog items table | **BUG**: SKU/Description always show "-" (no product relation on POLineItem) |
| 6.43 | Free text items table | Description, Qty, Unit Price, Tax, Total |
| 6.44 | Refund items table | Customer Name, Order Number, Reason, Amount |
| 6.45 | Approve button (Super Admin + pending_approval) | Opens approve AlertDialog |
| 6.46 | Reject button (Super Admin + pending_approval) | Opens reject AlertDialog with required reason |
| 6.47 | Submit for Approval (draft only) | Status → pending_approval |
| 6.48 | Edit button (draft only) | Navigate to edit page |
| 6.49 | Reconcile button (goods_received only) | Navigate to reconciliation |
| 6.50 | Print button | `window.print()` (no print-specific CSS) |
| 6.51 | Approval/rejection info displayed | Date, user name, rejection reason if applicable |

### PO Edit (`/purchase-orders/[id]/edit`)

| # | Test Case | Expected |
|---|-----------|----------|
| 6.52 | Only draft POs can be edited | Non-draft → alert + redirect to detail |
| 6.53 | Pre-populated form | All existing data loaded |
| 6.54 | Purchase type disabled in edit | Cannot change type |
| 6.55 | Save updates | Deletes all existing items, recreates |

### 14 Purchase Types Reference

| Type | Entry Mode | Prefix |
|------|-----------|--------|
| Finished Goods | catalog | FIN |
| Fabric | catalog | FAB |
| Raw Materials | catalog | RAW |
| Packaging | catalog | PKG |
| Corporate Assets | catalog (uses ProductSearch, not AddLineItemDialog) | AST |
| Samples | link_finished | SMP |
| Influencer Samples | link_finished | INF |
| Transportation | free_text | TRN |
| Advertisement | free_text | ADV |
| Office Expenses | free_text | OFF |
| Software | free_text | SFT |
| Feedback | free_text | FBK |
| Miscellaneous | free_text | MSC |
| Customer Refunds | special | REF |

### Status Workflow

```
draft → pending_approval → approved → (GRN flow) → goods_received → payment_pending → payment_approved → paid
                        → rejected (terminal - cannot re-submit)
```

### Known Issues

- [ ] **PODetail shows "-" for all catalog item SKUs/names** - POLineItem has no product relation
- [ ] PUT handler bypasses Zod validation (reads raw body)
- [ ] `approvePOSchema` defined but never used
- [ ] Empty POs allowed (zero line items pass validation)
- [ ] `rawMaterialMode` not required by Zod even though UI marks it required for Finished
- [ ] No permission check in create/update/delete (only auth check)
- [ ] `PurchaseTypeConfig` model exists in schema but is unused
- [ ] No print-specific CSS (prints full page with navigation)
- [ ] Rejected POs cannot be re-submitted
- [ ] RM issuances and GRNs fetched in detail but not rendered
- [ ] Duplicate approval endpoints with different field names (`reason` vs `notes`)
- [ ] Error handling uses `alert()` not toast

---

## 7. Inventory & GRN

### Stock Overview (`/inventory`)

| # | Test Case | Expected |
|---|-----------|----------|
| 7.1 | Summary cards | Total SKUs, Low Stock (<10), Out of Stock (0), By Type breakdown |
| 7.2 | Search by SKU or batch number | Reactive filter |
| 7.3 | Product type filter | All/Fabric/Raw Material/Packaging/Finished |
| 7.4 | Expand row | Shows batch details (batch#, qty, created date) |
| 7.5 | Export CSV | stock-overview-YYYY-MM-DD.csv |
| 7.6 | Status badges | Out of Stock (red) / Low Stock (yellow) / In Stock (green) |
| 7.7 | Empty state (no data) | EmptyState: "No inventory data" |
| 7.8 | Empty state (with filters) | "No stock matches your filters" |

### GRN List (`/inventory/grn`)

| # | Test Case | Expected |
|---|-----------|----------|
| 7.9 | View list | GRN#, PO# (link), Supplier, Items count, Received By, Date, View button |
| 7.10 | Search by GRN or PO number | Server-side filter |
| 7.11 | Pagination (20 per page) | Previous/Next buttons |
| 7.12 | Click "New GRN" | Navigate to `/inventory/grn/new` |
| 7.13 | Empty state | "No goods receipts" with "Create GRN" button |

### GRN Create (`/inventory/grn/new`)

| # | Test Case | Expected |
|---|-----------|----------|
| 7.14 | PO selection dropdown | Eligible POs (approved, partially_received, rm_issued_pending_goods) |
| 7.15 | No eligible POs | Message: "No approved purchase orders available" |
| 7.16 | PO info panel after selection | PO#, Supplier, Type, Status |
| 7.17 | Line items table | Product ID (truncated UUID), Ordered, Prev Received, Pending, inputs |
| 7.18 | Received Qty auto-defaults | Defaults to remaining (pending) qty |
| 7.19 | Accepted auto-calculates | When Received changes: Accepted = Received, Rejected = 0 |
| 7.20 | Rejected auto-calculates | When Accepted changes: Rejected = Received - Accepted |
| 7.21 | Condition dropdown | Good / Damaged / Defective (default: Good) |
| 7.22 | Summary bar | Total Receiving, Accepted (green), Rejected (red) |
| 7.23 | Submit with at least 1 item | GRN created, barcode modal opens |
| 7.24 | Received qty > pending | Client-side alert blocks submission |
| 7.25 | Accepted + Rejected > Received | Client-side alert blocks |
| 7.26 | All items rejected (0 accepted) | No inventory batches, redirect to GRN list |

### GRN Detail (`/inventory/grn/[id]`)

| # | Test Case | Expected |
|---|-----------|----------|
| 7.27 | View GRN details | GRN#, PO link, Supplier, Items count, Date, Notes |
| 7.28 | Line items table | Product (truncated UUID), Received, Accepted, Rejected, Condition, Batch, Notes |
| 7.29 | Not found | "GRN Not Found" page |

### Barcode Label Printing

| # | Test Case | Expected |
|---|-----------|----------|
| 7.30 | Modal opens after GRN creation | Shows per-item quantity controls |
| 7.31 | Adjust label quantities | Number input per item, total count updates |
| 7.32 | Preview labels | Rendered in white div |
| 7.33 | Print button | `react-to-print` with 50mm x 25mm page size |
| 7.34 | Skip button | Close modal, navigate to GRN list |
| 7.35 | Fabric labels | CODE128 barcode + SKU, date, batch, material, color, design, work |
| 7.36 | Raw Material labels | CODE128 barcode + SKU, date, type, color, batch |
| 7.37 | Packaging labels | CODE128 barcode + SKU, date, type, batch, dimensions |
| 7.38 | Finished Product labels | "thevasa.in" brand + MRP + barcode + name + batch + date + size/color |

### Stock Ledger (`/inventory/ledger`)

| # | Test Case | Expected |
|---|-----------|----------|
| 7.39 | View ledger | Date, SKU, Type, Movement, Reference, Qty (colored), SKU Balance, Notes |
| 7.40 | Search filter | sku, referenceNumber, notes |
| 7.41 | Product type filter | All/Fabric/Raw Material/Packaging/Finished |
| 7.42 | Movement type filter | GRN/Sale/Production In/Production Out/Manual Adjustment/Return |
| 7.43 | SKU filter | Text input |
| 7.44 | Date range filter | Start + End date (both required for filter to apply) |
| 7.45 | "Clear All" button | Visible only with active filters |
| 7.46 | Pagination (50 per page) | Previous/Next buttons |
| 7.47 | Export CSV | stock-ledger-YYYY-MM-DD.csv |
| 7.48 | Qty badges | Green with ArrowDown for inflow, Red with ArrowUp for outflow |

### Stub Pages

| # | Test Case | Expected |
|---|-----------|----------|
| 7.49 | `/inventory/outflow` | EmptyState: "No outflow records" |
| 7.50 | `/inventory/adjustments` | EmptyState: "No adjustments" |

### Known Issues

- [ ] **`skuBalance` incorrect for multiple GRNs** - set to `acceptedQty` instead of querying existing balance
- [ ] No batch number input in GRN form (defaults to GRN number)
- [ ] No expiry date input in GRN form (schema supports it)
- [ ] `receivedBy` hardcoded to "System" (not actual user name)
- [ ] `deliveryChallan` and `vehicleNumber` not captured in UI
- [ ] Product columns show truncated UUID, not SKU or product name
- [ ] Low stock threshold hardcoded at 10 (not configurable)
- [ ] No pagination on stock overview
- [ ] No re-print barcodes from GRN detail page
- [ ] Finished product label has hardcoded brand "thevasa.in"
- [ ] Movement type filter incomplete (missing: sample, rm_issued_to_vendor, adjustment_add, adjustment_reduce, write_off, opening)
- [ ] `inventory-service.ts` largely unused (API routes query Prisma directly)

---

## 8. Production

### Production Dashboard (`/production`)

| # | Test Case | Expected |
|---|-----------|----------|
| 8.1 | Summary cards | In-House Orders, Job Work POs, Completed, At Vendor |
| 8.2 | In-House tab | Production#, Product, Planned Qty, Actual Qty, Status, Target Date |
| 8.3 | Job Work tab | PO#, Supplier, Items, Amount, Status, RM Issued badge |
| 8.4 | "Issue RM" button (job work) | Navigate to issue form (only if not already issued) |
| 8.5 | "View" button (job work) | Navigate to PO detail |

### In-House Production List (`/production/in-house`)

| # | Test Case | Expected |
|---|-----------|----------|
| 8.6 | View list | Production#, Product+SKU, Planned Qty, Actual Qty, Status, Target Date, Created By |
| 8.7 | Search (number, product, SKU) | Submit via Enter or button, page resets to 1 |
| 8.8 | Pagination (20 per page) | Previous/Next |
| 8.9 | Click row arrow | Navigate to detail page |
| 8.10 | Empty state | "Start Production" button |

### Create Production Order (`/production/in-house/new`)

| # | Test Case | Expected |
|---|-----------|----------|
| 8.11 | Required fields | SKU, Product Name, Planned Qty, Target Date (client-side only) |
| 8.12 | Optional fields | Production Line, Location, Notes |
| 8.13 | Submit | Creates production with number `PRD-YYMM-NNNN`, navigates to detail |
| 8.14 | Cancel | `router.back()` |
| 8.15 | Error | Alert with API error message |

### Production Detail (`/production/in-house/[id]`)

| # | Test Case | Expected |
|---|-----------|----------|
| 8.16 | Order Details section | Production#, Status, Product, SKU, Line, Location, Created By/At |
| 8.17 | Quantities section | Planned, Actual, Rejected, Waste, Target Date, Completion Date |
| 8.18 | Cost Summary (completed only) | Material, Labor, Overhead, Total, Cost/Unit |
| 8.19 | Materials section | Product name/SKU, Quantity, Batch ID (truncated) |
| 8.20 | Notes section | Shown only if notes exist |
| 8.21 | "Complete Production" button | Visible for: planned, materials_issued, in_progress |
| 8.22 | Button hidden for completed/cancelled | Not rendered |

### Complete Production Dialog

| # | Test Case | Expected |
|---|-----------|----------|
| 8.23 | Actual Qty (required, pre-filled with planned qty) | Number input, step 0.001, min 0 |
| 8.24 | Rejected Qty (default 0) | Number input |
| 8.25 | Waste Qty (default 0) | Number input |
| 8.26 | Labor Cost (optional) | Number input, step 0.01 |
| 8.27 | Overhead Cost (optional) | Number input, step 0.01 |
| 8.28 | Notes (optional) | Textarea |
| 8.29 | Submit completion | Updates production, creates stock ledger entries |
| 8.30 | actualQty = 0 | Valid submission, no output batch created |

### Job Work List (`/production/job-work`)

| # | Test Case | Expected |
|---|-----------|----------|
| 8.31 | View list | PO#, Supplier, Items, Amount, Status, RM Issued badge |
| 8.32 | "Issue RM" button | Only when `!rmIssued` |
| 8.33 | "View PO" button | When already issued |
| 8.34 | Empty state | "Create Job Work PO" link |

### Issue Raw Materials (`/production/job-work/issue`)

| # | Test Case | Expected |
|---|-----------|----------|
| 8.35 | PO selector (pre-selected via `?poId=`) | Dropdown of eligible POs |
| 8.36 | PO details panel | PO#, Supplier, Items, Amount |
| 8.37 | Batch dropdown | All active batches with `currentQty > 0` |
| 8.38 | Add batch with quantity | Validates qty <= available |
| 8.39 | Prevent duplicate batch | Alert if batchId already added |
| 8.40 | Line items table | SKU, Batch, Available, Issue Qty, Remove |
| 8.41 | Summary row | Total items + total qty |
| 8.42 | Submit | Creates PORmIssuance, decrements batch qty, PO → rm_issued_pending_goods |
| 8.43 | Success | Alert with issuance number, navigate to job work list |

### Status Workflow

```
In-House: planned → (materials_issued → in_progress →) completed
          Note: no UI for intermediate transitions; only create → complete

Job Work: PO approved → issue RM → rm_issued_pending_goods → (GRN) → goods_received
```

### Known Issues

- [ ] **No cancel functionality** (cancelled status exists but no UI path)
- [ ] **No edit functionality** for production orders (no PUT endpoint)
- [ ] **`outputProductId` not in create form** - output batch never created via UI
- [ ] **`materialCost` sums quantities, not prices** (commented as "simplified")
- [ ] **No materials input in create form** (materials array never populated from UI)
- [ ] **`skuBalance` always 0** for production_out stock entries
- [ ] **Negative inventory risk** - no server-side check for batch qty before consuming
- [ ] **Dashboard stats capped at 50** production orders
- [ ] **Available batches fetched unfiltered** - shows all types including finished products
- [ ] **Duplicate completion logic** in `completeProduction` and `updateProductionStatus`
- [ ] **`completedBy` and `completedById`** are redundant fields
- [ ] **Job work creates no Production record** - only PORmIssuance
- [ ] All error handling uses `alert()` instead of toast

---

## 9. Finance

### Finance Dashboard (`/finance`)

| # | Test Case | Expected |
|---|-----------|----------|
| 9.1 | View hub page | 4 cards: Reconciliation, Payments, Settlements (stub), Invoices (stub) |

### Reconciliation List (`/finance/reconciliation`)

| # | Test Case | Expected |
|---|-----------|----------|
| 9.2 | View list | PO#, Type, Supplier, PO Amount, GRN Amount, Variance, GRN count, Date |
| 9.3 | Search by PO number or supplier name | Server-side filter |
| 9.4 | Variance badge | Secondary if 0, Warning if non-zero |
| 9.5 | "Reconcile" button per row | Navigate to `/finance/reconciliation/[poId]` |
| 9.6 | Eligible POs only | status=goods_received AND reconciledAt=NULL |

### Reconciliation Form (`/finance/reconciliation/[poId]`)

| # | Test Case | Expected |
|---|-----------|----------|
| 9.7 | PO details display | PO#, Vendor, Type, Date, PO Value, GRN count |
| 9.8 | Three-way match panel | PO Amount vs GRN Amount vs Invoice Amount with variance colors |
| 9.9 | Invoice Value (pre-filled with grandTotal) | Required, number |
| 9.10 | Entity dropdown (from entities API) | Required |
| 9.11 | Invoice Number | Required, text |
| 9.12 | Invoice Date (pre-filled today) | Required, date |
| 9.13 | Other/Transport Charges | Optional, number |
| 9.14 | Amount Payable | Live calc: invoice + transport |
| 9.15 | Invoice file upload | **BUG**: Only filename stored, no actual file upload |
| 9.16 | Signed GRN file upload | **BUG**: Only filename stored + `grnAttachment` field doesn't exist in DB |
| 9.17 | Line items (read-only) | Description, Cost/Unit, GST, Qty, Qty Received |
| 9.18 | Supplier bank details | Shown if available |
| 9.19 | GRN history | GRN numbers, dates, line counts, receiver names |
| 9.20 | Submit for Payment | Creates Payment record, navigates to `/finance/payments` |
| 9.21 | Disabled without entity or invoice# | Submit button disabled |

### Payments List (`/finance/payments`)

| # | Test Case | Expected |
|---|-----------|----------|
| 9.22 | View list | Payment#, PO#, Supplier, Entity, Status, Amount, Date |
| 9.23 | Search filter | Payment#, PO#, supplier name |
| 9.24 | Status filter | All + 7 statuses |
| 9.25 | Pagination (20 per page) | Previous/Next |

### Payment Detail (`/finance/payments/[id]`)

| # | Test Case | Expected |
|---|-----------|----------|
| 9.26 | Payment summary | Payment#, Entity, Supplier, Invoice Amount, Invoice# |
| 9.27 | Linked PO card | PO#, PO Amount, GRN count |
| 9.28 | Supplier bank details | If available |
| 9.29 | Approve button (Super Admin + pending_approval) | Opens approve dialog |
| 9.30 | Reject button (Super Admin + pending_approval) | Opens reject dialog with required reason |
| 9.31 | "Execute Payment" link (approved) | Navigate to execute page |
| 9.32 | Execution details (executed) | Payment Mode, Reference, Amount, TDS, Net, Remarks, Executed By |
| 9.33 | Rejection card (rejected) | Shows rejection reason |

### Payment Execute (`/finance/payments/[id]/execute`)

| # | Test Case | Expected |
|---|-----------|----------|
| 9.34 | Only approved payments | Non-approved → "Cannot Execute" error page |
| 9.35 | Payment Mode dropdown | Entity's active payment modes |
| 9.36 | Transaction Reference (required) | Text input |
| 9.37 | Amount Paid (pre-filled) | Number, min 0.01 |
| 9.38 | TDS Deducted (default 0) | Number |
| 9.39 | Net Amount display | Live calc: amountPaid - tdsDeducted |
| 9.40 | Remarks (optional) | Textarea |
| 9.41 | Submit execution | Payment → executed, PO → paid |
| 9.42 | No payment modes configured | Helper text shown |

### Entity Payment Pages

| # | Test Case | Expected |
|---|-----------|----------|
| 9.43 | `/finance/fulton` | Payments filtered by Fulton entity |
| 9.44 | `/finance/mse` | Payments filtered by MSE entity |
| 9.45 | `/finance/sna` | Payments filtered by SNA entity |
| 9.46 | Entity name mismatch | "Entity not found" error message |
| 9.47 | Same filters as main list | Search + status |

### Admin Approvals

| # | Test Case | Expected |
|---|-----------|----------|
| 9.48 | PO Approvals (`/admin/approvals/po`) | All pending_approval POs, approve/reject dialogs |
| 9.49 | Payment Approvals (`/admin/approvals/payments`) | All pending_approval payments |
| 9.50 | Approve PO | Optional notes |
| 9.51 | Reject PO | Required reason |
| 9.52 | Approve Payment | No reason required |
| 9.53 | Reject Payment | Required reason |
| 9.54 | Approvals hub (`/admin/approvals`) | **BUG**: Shows hardcoded "0 Pending" (not dynamic) |

### Payment Status Workflow

```
(Reconciliation submit) → pending_approval
    → approve → approved → execute → executed (PO → paid)
    → reject → rejected (PO stays at payment_pending)
```

### Stub Pages

| # | Test Case | Expected |
|---|-----------|----------|
| 9.55 | `/finance/settlements` | EmptyState stub |
| 9.56 | `/finance/invoices` | EmptyState stub |
| 9.57 | `/finance/credits` | EmptyState stub |

### Known Issues

- [ ] **File uploads are non-functional** - only filename string stored, no actual upload
- [ ] **`grnAttachment` field doesn't exist in DB** - silently dropped
- [ ] **`paymentProof` not in execute form UI** (schema supports it)
- [ ] **Execute route has no role guard** - any authenticated user can execute payments
- [ ] **Entity name matching is fragile** - case-insensitive exact name match
- [ ] **Rejected payments cannot be re-reconciled** (PO stays at payment_pending but `reconciledAt` is set)
- [ ] **Approval notes not stored on Payment** - only in AuditLog
- [ ] **Admin approvals max 100 results** with no pagination
- [ ] **PO approval page no success alert** (inconsistent with payment approvals)
- [ ] **`supplierId` filter not exposed in payments API** (service supports it)
- [ ] `getMarketplaceSettlements` function exists in service but no API/UI
- [ ] Invoice date UTC timezone conversion may shift dates near midnight

---

## 10. Admin Settings

### Sales Channels (`/admin/settings/sales-channels`)

| # | Test Case | Expected |
|---|-----------|----------|
| 10.1 | Access guard | Super Admin only (redirects to `/dashboard` otherwise) |
| 10.2 | View list | Name, Code (monospace), Status, Actions |
| 10.3 | Add channel | Dialog: Name (required), Code (required, auto-lowercase) |
| 10.4 | Edit channel | Pre-populated dialog |
| 10.5 | Deactivate channel | `window.confirm()`, soft delete |
| 10.6 | Activate channel | RotateCcw button for inactive channels |
| 10.7 | Duplicate code check | Server-side validation |

### Entities (`/admin/settings/entities`)

| # | Test Case | Expected |
|---|-----------|----------|
| 10.8 | View list (accordion) | Name, Type (In-House/External), Status, Payment Modes count |
| 10.9 | Expand entity | Shows payment modes list |
| 10.10 | Add entity | Dialog: Name (required), Type (In-House/External) |
| 10.11 | Edit entity | Pre-populated dialog |
| 10.12 | Deactivate entity | `window.confirm()`, soft delete |
| 10.13 | Activate entity | PUT with `{isActive: true}` |
| 10.14 | Add payment mode | Dialog: Name only |
| 10.15 | Delete payment mode | `window.confirm()`, **hard delete** |
| 10.16 | Duplicate entity name | Server-side check |

### Company Information (`/admin/settings/company`)

| # | Test Case | Expected |
|---|-----------|----------|
| 10.17 | View form | Company Name (hardcoded "Thevasa"), GST, Address, Email, Phone |
| 10.18 | Submit | **NOT IMPLEMENTED** - `alert('saving is not yet implemented')` |

### Purchase Types (`/admin/settings/purchase-types`)

| # | Test Case | Expected |
|---|-----------|----------|
| 10.19 | View page | **PLACEHOLDER** - "Purchase type configuration coming soon..." |

### Known Issues

- [ ] Settings index has no auth guard (any user can see nav cards)
- [ ] No edit UI for payment modes (only create and hard-delete)
- [ ] Payment mode delete may orphan referenced Payment records
- [ ] Entity type can be changed (External ↔ In-House) without safeguards
- [ ] Company Information not functional
- [ ] Purchase Types not implemented

---

## 11. Navigation, Sidebar & Layout

### Sidebar

| # | Test Case | Expected |
|---|-----------|----------|
| 11.1 | Collapse/expand sidebar | w-64 ↔ w-16, icons only when collapsed |
| 11.2 | Super Admin sees all items | Full navigation tree visible |
| 11.3 | Non-Super Admin: module-gated items | Hidden if no view permission |
| 11.4 | Admin section | Only visible to Super Admins |
| 11.5 | Expandable sections (Inventory, Production, Finance, etc.) | Chevron toggle |
| 11.6 | Active route highlighting | Current path highlighted |
| 11.7 | Logo links to `/dashboard` | Package icon + "ERP System" text |

### Header

| # | Test Case | Expected |
|---|-----------|----------|
| 11.8 | User menu (avatar + dropdown) | Profile link, Log out action |
| 11.9 | Search field | **NOT FUNCTIONAL** - renders but no handler |
| 11.10 | Notifications bell | **NOT FUNCTIONAL** - renders but no handler |
| 11.11 | Hamburger (mobile) | Toggles sidebar on small screens |

### Dashboard (`/dashboard`)

| # | Test Case | Expected |
|---|-----------|----------|
| 11.12 | View dashboard | **PLACEHOLDER** - All stats hardcoded to "0" |
| 11.13 | Recent Activity | "No recent activity" |
| 11.14 | Quick Actions | "Set up your first..." guidance |

### Permission-Based Visibility

| Module | Permission Key | Sub-modules |
|--------|---------------|-------------|
| Purchase Orders | `purchase_orders` | - |
| Suppliers | `supplier_management` | - |
| Products | `product_information` | - |
| Inventory | `inventory_management` | - |
| Production | `production` | `in_house_production`, `job_work_issue_materials` |
| Finance | `finance` | `fulton` only (MSE/SNA unprotected) |
| External Vendors | `external_vendors` | `shivaang` |
| Admin Approvals | `admin_approvals` | `po_approvals`, `payment_approvals` |

### Known Issues

- [ ] MSE and SNA nav items have no sub-module permission gate
- [ ] `adminOnly` flag is dead code (same as `superAdminOnly`)
- [ ] Sidebar doesn't auto-expand when navigating to a child route
- [ ] Dashboard is entirely placeholder with no real data
- [ ] Header search is non-functional
- [ ] Header notifications is non-functional

---

## 12. External Vendors

### Vendors Hub (`/external-vendors`)

| # | Test Case | Expected |
|---|-----------|----------|
| 12.1 | View hub | Single card: "Shivaang - External production partner" |

### Shivaang Dashboard (`/external-vendors/shivaang`)

| # | Test Case | Expected |
|---|-----------|----------|
| 12.2 | Overview cards | Total Orders, Pending Orders, Completed Orders, Total Paid |
| 12.3 | Overview tab | Summary + Quick Actions (Create Job Work, View Reconciliations, View Payments) |
| 12.4 | Transactions tab | Interleaved feed (last 5 POs + 5 payments, max 10) |
| 12.5 | Pending Orders tab | Table: PO#, Supplier, Items, Amount, Status, Date |
| 12.6 | Payment History tab | Table: Payment#, PO#, Supplier, Amount, Paid, Status, Date |
| 12.7 | Loading state | Full-page spinner |
| 12.8 | Error state | Card with error message |

### Known Issues

- [ ] Entity lookup uses `contains: 'Shivaang'` (could match "Shivaang Trading" etc.)
- [ ] No pagination on any tab
- [ ] Transactions limited to 5+5 recent items
- [ ] No date range or filter controls
- [ ] Any authenticated user can access (no Super Admin restriction)

---

## 13. Known Bugs (Priority Fix List)

### Critical

| # | Bug | Location |
|---|-----|----------|
| B1 | **PODetail shows "-" for all catalog item SKUs/names** - POLineItem has no product relation | `po-detail.tsx` |
| B2 | **File uploads non-functional** - only filename stored, no actual upload to storage | `reconciliation-form.tsx` |
| B3 | **`skuBalance` incorrect** for subsequent GRNs of same SKU (set to `acceptedQty`, not running total) | `grn-service.ts` |
| B4 | **`grnAttachment` field doesn't exist in DB** - accepted by form/validator but silently dropped | `reconciliation-service.ts` |
| B5 | **`materialCost` sums quantities, not prices** in production completion | `production-service.ts` |

### High

| # | Bug | Location |
|---|-----|----------|
| B6 | Execute payment API has no role guard - any authenticated user can execute | `payments/[id]/execute/route.ts` |
| B7 | `/profile` not in protected paths - accessible unauthenticated | `middleware.ts` |
| B8 | Tenant isolation missing on `GET /api/users/[id]` - cross-tenant fetch possible | `users/[id]/route.ts` |
| B9 | Super Admin can demote themselves via edit page | `admin/users/[id]/page.tsx` |
| B10 | PUT PO handler bypasses Zod validation | `purchase-orders/[id]/route.ts` |
| B11 | Negative inventory possible - no server check before batch decrement | `production-service.ts` |

### Medium

| # | Bug | Location |
|---|-----|----------|
| B12 | Approval hub shows hardcoded "0 Pending" | `admin/approvals/page.tsx` |
| B13 | Entity payment pages use fragile name matching | `entity-payment-list.tsx` |
| B14 | Rejected payments cannot be re-reconciled | `reconciliation-service.ts` |
| B15 | Debug `console.log` statements in production API routes | Multiple files |
| B16 | Fabric "None" string vs null mismatch in lookups | `product-info-service.ts` |
| B17 | `skuBalance` always 0 for production stock entries | `production-service.ts` |
| B18 | Contact sync errors not surfaced to user | `suppliers/[id]/page.tsx` |
| B19 | Password generation uses `Math.random()` (not cryptographically secure) | `user-service.ts` |

---

## 14. Missing / Incomplete Features

### Not Implemented (Stub Pages or No UI)

| Feature | Status |
|---------|--------|
| Forgot Password | No page, no API |
| Dashboard data | All stats hardcoded to 0 |
| Header search | No handler |
| Header notifications | No handler |
| Inventory Outflow | Stub page, no API |
| Inventory Adjustments | Stub page, no API |
| Finance Settlements | Stub page, service function exists |
| Finance Invoices | Stub page |
| Finance Credits / Store Credits | Stub page |
| Company Information (save) | Form renders but submit does nothing |
| Purchase Type Configuration | Placeholder page |
| Channel-specific product data (Amazon, Myntra, etc.) | Schema ready, no UI |
| Bulk operations / CSV import for products | Not implemented |
| Print-specific CSS for PO print | Uses `window.print()` with full page |

### Partially Implemented

| Feature | What's Missing |
|---------|---------------|
| Style measurements | 19 fields in schema but no form input (sizes 42-50, waist, shoulder, etc.) |
| Production order editing | Validator exists but no PUT endpoint or UI |
| Production cancel | Enum value exists but no UI or API path |
| Production materials input | Form field not exposed in create UI |
| Production output product | `outputProductId` not in form (output batch never created) |
| Status transitions (production) | planned→materials_issued→in_progress have no UI |
| Payment mode editing | PUT endpoint exists but no UI |
| Payment proof upload | Schema field exists but not in execute form |
| Re-activate products | `activate()` service exists but no route or UI button |
| Supplier pricing dates | `validFrom`/`validTo` in schema but never exposed |
| Product status management | No dropdown to change status in any product form |
| MSE/SNA permission gating | No sub-module defined, visible to all Finance users |
| API permission checks | PO create/update/delete and several other routes only check auth, not module permissions |

### Data Display Gaps

| Issue | Location |
|-------|----------|
| Product ID shown as truncated UUID (not SKU/name) | GRN create/detail pages |
| Batch ID shown as truncated CUID (not batch number) | Production detail materials |
| No product name in PO detail catalog items | POLineItem has no product relation |
| Pricing table shows truncated productId | Supplier edit page |

---

*This checklist covers 200+ test cases across all modules. Use it to systematically verify each feature.*
