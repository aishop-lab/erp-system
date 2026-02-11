import { PurchaseType, POStatus, PaymentStatus, ProductionStatus, EntryMode, RawMaterialMode } from '@/types/enums'
import type { NavItem, StatusMap } from '@/types'

export const MODULES = {
  PURCHASE_ORDERS: 'purchase_orders',
  SUPPLIER_MANAGEMENT: 'supplier_management',
  PRODUCT_INFORMATION: 'product_information',
  INVENTORY_MANAGEMENT: 'inventory_management',
  PRODUCTION: 'production',
  FINANCE: 'finance',
  EXTERNAL_VENDORS: 'external_vendors',
  ADMIN_APPROVALS: 'admin_approvals',
} as const

export const SUB_MODULES = {
  PRODUCTION: {
    IN_HOUSE: 'in_house_production',
    JOB_WORK: 'job_work_issue_materials',
  },
  FINANCE: {
    FULTON: 'fulton',
  },
  EXTERNAL_VENDORS: {
    SHIVAANG: 'shivaang',
  },
  ADMIN_APPROVALS: {
    PO_APPROVALS: 'po_approvals',
    PAYMENT_APPROVALS: 'payment_approvals',
  },
} as const

export const PERMISSION_LEVELS = {
  NONE: 'none',
  VIEW: 'view',
  EDIT: 'edit',
} as const

export const MODULE_CONFIG = [
  {
    module: MODULES.PURCHASE_ORDERS,
    label: 'Purchase Orders',
    subModules: null
  },
  {
    module: MODULES.SUPPLIER_MANAGEMENT,
    label: 'Supplier Management',
    subModules: null
  },
  {
    module: MODULES.PRODUCT_INFORMATION,
    label: 'Product Information',
    subModules: null
  },
  {
    module: MODULES.INVENTORY_MANAGEMENT,
    label: 'Inventory Management',
    subModules: null
  },
  {
    module: MODULES.PRODUCTION,
    label: 'Production',
    subModules: [
      { key: SUB_MODULES.PRODUCTION.IN_HOUSE, label: 'In-House Production' },
      { key: SUB_MODULES.PRODUCTION.JOB_WORK, label: 'Job Work - Issue Materials' },
    ]
  },
  {
    module: MODULES.FINANCE,
    label: 'Finance',
    subModules: [
      { key: SUB_MODULES.FINANCE.FULTON, label: 'Fulton' },
    ]
  },
  {
    module: MODULES.EXTERNAL_VENDORS,
    label: 'External Vendors',
    subModules: [
      { key: SUB_MODULES.EXTERNAL_VENDORS.SHIVAANG, label: 'Shivaang' },
    ]
  },
  {
    module: MODULES.ADMIN_APPROVALS,
    label: 'Admin Approvals',
    subModules: [
      { key: SUB_MODULES.ADMIN_APPROVALS.PO_APPROVALS, label: 'PO Approvals' },
      { key: SUB_MODULES.ADMIN_APPROVALS.PAYMENT_APPROVALS, label: 'Payment Approvals' },
    ]
  },
] as const

export const DEFAULT_ENTITIES = [
  { name: 'Fulton', type: 'in_house', isExternal: false },
  { name: 'Shivaang', type: 'external', isExternal: true },
  { name: 'MSE', type: 'in_house', isExternal: false },
  { name: 'SNA', type: 'in_house', isExternal: false },
]

export const DEFAULT_SALES_CHANNELS = [
  { name: 'Amazon', code: 'amazon' },
  { name: 'Myntra', code: 'myntra' },
  { name: 'Nykaa', code: 'nykaa' },
  { name: 'Thevasa', code: 'thevasa' },
  { name: 'Free Sample', code: 'free_sample' },
  { name: 'Amz FC', code: 'amz_fc' },
]

export const PO_NUMBER_PREFIXES: Record<string, string> = {
  [PurchaseType.FINISHED]: 'FIN',
  [PurchaseType.FABRIC]: 'FAB',
  [PurchaseType.RAW_MATERIAL]: 'RAW',
  [PurchaseType.PACKAGING]: 'PKG',
  [PurchaseType.CORPORATE_ASSETS]: 'AST',
  [PurchaseType.SAMPLES]: 'SMP',
  [PurchaseType.INFLUENCER_SAMPLES]: 'INF',
  [PurchaseType.TRANSPORTATION]: 'TRN',
  [PurchaseType.ADVERTISEMENT]: 'ADV',
  [PurchaseType.OFFICE_EXPENSES]: 'OFF',
  [PurchaseType.SOFTWARE]: 'SFT',
  [PurchaseType.FEEDBACK]: 'FBK',
  [PurchaseType.MISC]: 'MSC',
  [PurchaseType.CUSTOMER_REFUNDS]: 'REF',
}

export const PURCHASE_TYPE_LABELS: Record<string, string> = {
  [PurchaseType.FINISHED]: 'Finished Goods',
  [PurchaseType.FABRIC]: 'Fabric',
  [PurchaseType.RAW_MATERIAL]: 'Raw Materials',
  [PurchaseType.PACKAGING]: 'Packaging',
  [PurchaseType.CORPORATE_ASSETS]: 'Corporate Assets',
  [PurchaseType.SAMPLES]: 'Samples',
  [PurchaseType.INFLUENCER_SAMPLES]: 'Influencer Samples',
  [PurchaseType.TRANSPORTATION]: 'Transportation',
  [PurchaseType.ADVERTISEMENT]: 'Advertisement',
  [PurchaseType.OFFICE_EXPENSES]: 'Office Expenses',
  [PurchaseType.SOFTWARE]: 'Software',
  [PurchaseType.FEEDBACK]: 'Feedback',
  [PurchaseType.MISC]: 'Miscellaneous',
  [PurchaseType.CUSTOMER_REFUNDS]: 'Customer Refunds',
}

export const ENTRY_MODE_LABELS: Record<string, string> = {
  [EntryMode.CATALOG]: 'Catalog Entry',
  [EntryMode.FREE_TEXT]: 'Free Text Entry',
  [EntryMode.LINK_FINISHED]: 'Linked to Finished Products',
  [EntryMode.SPECIAL]: 'Special Entry',
}

export const RAW_MATERIAL_MODE_LABELS: Record<string, string> = {
  [RawMaterialMode.DIRECT_PURCHASE]: 'Direct Purchase',
  [RawMaterialMode.RAW_MATERIALS_ISSUED]: 'Raw Materials Issued (Job Work)',
}

export const PO_STATUS_MAP: StatusMap = {
  [POStatus.DRAFT]: { label: 'Draft', variant: 'secondary' },
  [POStatus.PENDING_APPROVAL]: { label: 'Pending Approval', variant: 'warning' },
  [POStatus.APPROVED]: { label: 'Approved', variant: 'success' },
  [POStatus.APPROVED_PENDING_RM_ISSUANCE]: { label: 'Pending RM Issuance', variant: 'warning' },
  [POStatus.RM_ISSUED_PENDING_GOODS]: { label: 'RM Issued', variant: 'default' },
  [POStatus.REJECTED]: { label: 'Rejected', variant: 'destructive' },
  [POStatus.PARTIALLY_RECEIVED]: { label: 'Partially Received', variant: 'warning' },
  [POStatus.GOODS_RECEIVED]: { label: 'Goods Received', variant: 'success' },
  [POStatus.PAYMENT_PENDING]: { label: 'Payment Pending', variant: 'warning' },
  [POStatus.PAYMENT_APPROVED]: { label: 'Payment Approved', variant: 'success' },
  [POStatus.PAID]: { label: 'Paid', variant: 'success' },
}

export const PAYMENT_STATUS_MAP: StatusMap = {
  [PaymentStatus.PENDING]: { label: 'Pending', variant: 'secondary' },
  [PaymentStatus.PENDING_APPROVAL]: { label: 'Pending Approval', variant: 'warning' },
  [PaymentStatus.APPROVED]: { label: 'Approved', variant: 'success' },
  [PaymentStatus.EXECUTED]: { label: 'Executed', variant: 'success' },
  [PaymentStatus.REJECTED]: { label: 'Rejected', variant: 'destructive' },
  [PaymentStatus.PAID]: { label: 'Paid', variant: 'success' },
  [PaymentStatus.COD]: { label: 'COD', variant: 'secondary' },
}

export const PRODUCTION_STATUS_MAP: StatusMap = {
  [ProductionStatus.PLANNED]: { label: 'Planned', variant: 'secondary' },
  [ProductionStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'warning' },
  [ProductionStatus.COMPLETED]: { label: 'Completed', variant: 'success' },
  [ProductionStatus.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
}

export const NAVIGATION: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    module: null,
  },
  {
    title: 'Purchase Orders',
    href: '/purchase-orders',
    icon: 'ShoppingCart',
    module: MODULES.PURCHASE_ORDERS,
  },
  {
    title: 'Suppliers',
    href: '/suppliers',
    icon: 'Truck',
    module: MODULES.SUPPLIER_MANAGEMENT,
  },
  {
    title: 'Products',
    href: '/products',
    icon: 'Package',
    module: MODULES.PRODUCT_INFORMATION,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: 'Warehouse',
    module: MODULES.INVENTORY_MANAGEMENT,
    children: [
      { title: 'Stock Overview', href: '/inventory' },
      { title: 'Goods Receipt', href: '/inventory/grn' },
      { title: 'Outflow', href: '/inventory/outflow' },
      { title: 'Adjustments', href: '/inventory/adjustments' },
      { title: 'Stock Ledger', href: '/inventory/ledger' },
    ],
  },
  {
    title: 'Production',
    href: '/production',
    icon: 'Factory',
    module: MODULES.PRODUCTION,
    children: [
      { title: 'In-House', href: '/production/in-house', subModule: SUB_MODULES.PRODUCTION.IN_HOUSE },
      { title: 'Job Work', href: '/production/job-work', subModule: SUB_MODULES.PRODUCTION.JOB_WORK },
    ],
  },
  {
    title: 'Finance',
    href: '/finance',
    icon: 'Wallet',
    module: MODULES.FINANCE,
    children: [
      { title: 'Reconciliation', href: '/finance/reconciliation' },
      { title: 'Payments', href: '/finance/payments' },
      { title: 'Fulton', href: '/finance/fulton', subModule: SUB_MODULES.FINANCE.FULTON },
      { title: 'MSE', href: '/finance/mse' },
      { title: 'SNA', href: '/finance/sna' },
      { title: 'Settlements', href: '/finance/settlements' },
      { title: 'Invoices', href: '/finance/invoices' },
    ],
  },
  {
    title: 'External Vendors',
    href: '/external-vendors',
    icon: 'Building2',
    module: MODULES.EXTERNAL_VENDORS,
    children: [
      { title: 'Shivaang', href: '/external-vendors/shivaang', subModule: SUB_MODULES.EXTERNAL_VENDORS.SHIVAANG },
    ],
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: 'Shield',
    superAdminOnly: true,
    children: [
      { title: 'PO Approvals', href: '/admin/approvals/po', module: MODULES.ADMIN_APPROVALS, subModule: SUB_MODULES.ADMIN_APPROVALS.PO_APPROVALS },
      { title: 'Payment Approvals', href: '/admin/approvals/payments', module: MODULES.ADMIN_APPROVALS, subModule: SUB_MODULES.ADMIN_APPROVALS.PAYMENT_APPROVALS },
      { title: 'User Management', href: '/admin/users' },
      { title: 'Settings', href: '/admin/settings' },
    ],
  },
]

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
