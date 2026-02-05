export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchParams extends PaginationParams {
  search?: string
  filters?: Record<string, unknown>
}

// Form submission types
export interface CreateSupplierInput {
  name: string
  code: string
  email?: string
  phone?: string
  address?: string
  gstNumber?: string
  panNumber?: string
  bankName?: string
  bankAccountNumber?: string
  bankIfscCode?: string
  paymentTerms?: string
  contacts?: {
    name: string
    email?: string
    phone?: string
    isPrimary?: boolean
  }[]
}

export interface UpdateSupplierInput extends Partial<CreateSupplierInput> {
  id: string
}

export interface CreateProductInput {
  sku: string
  name: string
  description?: string
  categoryId?: string
  unit?: string
  hsnCode?: string
  gstRate?: number
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string
}

export interface CreatePurchaseOrderInput {
  purchaseType: string
  supplierId?: string
  entityId: string
  entryMode: string
  rawMaterialMode?: string
  notes?: string
  expectedDelivery?: string
  lineItems?: {
    productId: string
    quantity: number
    unitPrice: number
    taxRate?: number
  }[]
  freeTextItems?: {
    description: string
    quantity?: number
    unitPrice: number
    taxRate?: number
  }[]
  refundItems?: {
    customerName: string
    orderNumber?: string
    reason: string
    amount: number
    refundMode?: string
  }[]
}

export interface UpdatePurchaseOrderInput extends Partial<CreatePurchaseOrderInput> {
  id: string
}

export interface CreateGRNInput {
  purchaseOrderId: string
  notes?: string
  lineItems: {
    poLineItemId: string
    receivedQty: number
    acceptedQty: number
    rejectedQty?: number
    condition?: string
    batchNumber?: string
    expiryDate?: string
    notes?: string
  }[]
}

export interface CreatePaymentInput {
  purchaseOrderId?: string
  supplierId?: string
  entityId: string
  paymentModeId?: string
  externalVendorId?: string
  amount: number
  paymentDate: string
  reference?: string
  notes?: string
}

export interface CreateProductionInput {
  productionType: string
  outputProductId?: string
  outputQuantity?: number
  startDate?: string
  endDate?: string
  notes?: string
  materials?: {
    productId: string
    quantity: number
    batchId?: string
  }[]
}

export interface CreateOutflowInput {
  outflowType: string
  entityId: string
  salesChannelId?: string
  orderReference?: string
  notes?: string
  items: {
    productId: string
    batchId?: string
    quantity: number
  }[]
  packaging?: {
    description: string
    quantity: number
  }[]
}

export interface CreateAdjustmentInput {
  adjustmentType: string
  productId: string
  batchId?: string
  quantity: number
  reason: string
}
