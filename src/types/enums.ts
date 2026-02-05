export enum PurchaseType {
  FINISHED = 'finished',
  FABRIC = 'fabric',
  RAW_MATERIAL = 'raw_material',
  PACKAGING = 'packaging',
  CORPORATE_ASSETS = 'corporate_assets',
  SAMPLES = 'samples',
  INFLUENCER_SAMPLES = 'influencer_samples',
  TRANSPORTATION = 'transportation',
  ADVERTISEMENT = 'advertisement',
  OFFICE_EXPENSES = 'office_expenses',
  SOFTWARE = 'software',
  FEEDBACK = 'feedback',
  MISC = 'misc',
  CUSTOMER_REFUNDS = 'customer_refunds',
}

export enum EntryMode {
  CATALOG = 'catalog',
  FREE_TEXT = 'free_text',
  LINK_FINISHED = 'link_finished',
  SPECIAL = 'special',
}

export enum RawMaterialMode {
  DIRECT_PURCHASE = 'direct_purchase',
  RAW_MATERIALS_ISSUED = 'raw_materials_issued',
}

export enum POStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  APPROVED_PENDING_RM_ISSUANCE = 'approved_pending_rm_issuance',
  RM_ISSUED_PENDING_GOODS = 'rm_issued_pending_goods',
  REJECTED = 'rejected',
  PARTIALLY_RECEIVED = 'partially_received',
  GOODS_RECEIVED = 'goods_received',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_APPROVED = 'payment_approved',
  PAID = 'paid',
}

export enum MovementType {
  GRN = 'grn',
  SALE = 'sale',
  SAMPLE = 'sample',
  PRODUCTION_IN = 'production_in',
  PRODUCTION_OUT = 'production_out',
  RM_ISSUED_TO_VENDOR = 'rm_issued_to_vendor',
  ADJUSTMENT_ADD = 'adjustment_add',
  ADJUSTMENT_REDUCE = 'adjustment_reduce',
  WRITE_OFF = 'write_off',
  OPENING = 'opening',
}

export enum PermissionLevel {
  NONE = 'none',
  VIEW = 'view',
  EDIT = 'edit',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum GoodsCondition {
  GOOD = 'good',
  DAMAGED = 'damaged',
  DEFECTIVE = 'defective',
}

export enum AdjustmentType {
  ADDITION = 'addition',
  REDUCTION = 'reduction',
  WRITE_OFF_DAMAGED = 'write_off_damaged',
  WRITE_OFF_EXPIRED = 'write_off_expired',
  OPENING = 'opening',
}

export enum PaymentStatus {
  PAID = 'paid',
  PENDING = 'pending',
  COD = 'cod',
}

export enum ApprovalType {
  PO_APPROVAL = 'po_approval',
  PAYMENT_APPROVAL = 'payment_approval',
}

export enum ApprovalAction {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum EntityType {
  IN_HOUSE = 'in_house',
  EXTERNAL = 'external',
}

export enum ExternalVendorType {
  PAYMENT_PROCESSOR = 'payment_processor',
  LOGISTICS = 'logistics',
  OTHER = 'other',
}

export enum OutflowType {
  SALE = 'sale',
  SAMPLE = 'sample',
  PRODUCTION_CONSUMPTION = 'production_consumption',
  MARKETING = 'marketing',
  OTHER = 'other',
}

export enum ProductionType {
  IN_HOUSE = 'in_house',
  JOB_WORK = 'job_work',
}

export enum ProductionStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
