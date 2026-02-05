import type {
  Tenant,
  User,
  UserPermission,
  PurchaseTypeConfig,
  SalesChannel,
  Entity,
  PaymentMode,
  ExternalVendor,
  Supplier,
  SupplierContact,
  SupplierPricing,
  ProductCategory,
  Product,
  PurchaseOrder,
  POLineItem,
  POLineItemFreetext,
  POLineItemRefund,
  PORmIssuance,
  PORmIssuanceItem,
  GRN,
  GRNLineItem,
  InventoryBatch,
  StockLedger,
  InventoryOutflow,
  OutflowItem,
  OutflowPackaging,
  StockAdjustment,
  Production,
  ProductionMaterial,
  Payment,
  MarketplaceSettlement,
  CustomerInvoice,
  CustomerInvoiceItem,
  CustomerCredit,
  CreditTransaction,
  ApprovalAuditLog,
} from '@prisma/client'

// Re-export Prisma types
export type {
  Tenant,
  User,
  UserPermission,
  PurchaseTypeConfig,
  SalesChannel,
  Entity,
  PaymentMode,
  ExternalVendor,
  Supplier,
  SupplierContact,
  SupplierPricing,
  ProductCategory,
  Product,
  PurchaseOrder,
  POLineItem,
  POLineItemFreetext,
  POLineItemRefund,
  PORmIssuance,
  PORmIssuanceItem,
  GRN,
  GRNLineItem,
  InventoryBatch,
  StockLedger,
  InventoryOutflow,
  OutflowItem,
  OutflowPackaging,
  StockAdjustment,
  Production,
  ProductionMaterial,
  Payment,
  MarketplaceSettlement,
  CustomerInvoice,
  CustomerInvoiceItem,
  CustomerCredit,
  CreditTransaction,
  ApprovalAuditLog,
}

// Extended types with relations
export type UserWithPermissions = User & {
  permissions: UserPermission[]
}

export type SupplierWithContacts = Supplier & {
  contacts: SupplierContact[]
}

export type SupplierWithPricing = Supplier & {
  pricings: (SupplierPricing & { product: Product })[]
}

export type ProductWithCategory = Product & {
  category: ProductCategory | null
}

export type PurchaseOrderWithRelations = PurchaseOrder & {
  supplier: Supplier | null
  entity: Entity
  createdBy: User
  approvedBy: User | null
  lineItems: (POLineItem & { product: Product })[]
  freeTextItems: POLineItemFreetext[]
  refundItems: POLineItemRefund[]
  rmIssuances: (PORmIssuance & { items: PORmIssuanceItem[] })[]
}

export type GRNWithRelations = GRN & {
  purchaseOrder: PurchaseOrder
  createdBy: User
  lineItems: (GRNLineItem & { poLineItem: POLineItem })[]
}

export type InventoryOutflowWithRelations = InventoryOutflow & {
  entity: Entity
  salesChannel: SalesChannel | null
  createdBy: User
  items: (OutflowItem & { product: Product; inventoryBatch: InventoryBatch | null })[]
  packaging: OutflowPackaging[]
}

export type ProductionWithRelations = Production & {
  createdBy: User
  materials: (ProductionMaterial & { product: Product })[]
}

export type PaymentWithRelations = Payment & {
  purchaseOrder: PurchaseOrder | null
  supplier: Supplier | null
  entity: Entity
  paymentMode: PaymentMode | null
  externalVendor: ExternalVendor | null
  createdBy: User
  approvedBy: User | null
}

export type CustomerInvoiceWithItems = CustomerInvoice & {
  items: CustomerInvoiceItem[]
}

export type CustomerCreditWithTransactions = CustomerCredit & {
  transactions: CreditTransaction[]
}
