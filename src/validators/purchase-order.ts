import { z } from 'zod'
import { PurchaseType, EntryMode, RawMaterialMode } from '@/types/enums'

export const poLineItemSchema = z.object({
  productId: z.string().cuid('Invalid product'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be positive'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
})

export const poFreeTextItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0, 'Unit price must be positive'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
})

export const poRefundItemSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(255),
  orderNumber: z.string().max(100).optional(),
  reason: z.string().min(1, 'Reason is required').max(500),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  refundMode: z.string().max(50).optional(),
})

export const createPurchaseOrderSchema = z.object({
  purchaseType: z.nativeEnum(PurchaseType),
  supplierId: z.string().cuid().optional().nullable(),
  entryMode: z.nativeEnum(EntryMode),
  rawMaterialMode: z.nativeEnum(RawMaterialMode).optional().nullable(),
  notes: z.string().max(1000).optional(),
  expectedDelivery: z.string().datetime().optional().nullable(),
  lineItems: z.array(poLineItemSchema).optional(),
  freeTextItems: z.array(poFreeTextItemSchema).optional(),
  refundItems: z.array(poRefundItemSchema).optional(),
})

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial().extend({
  id: z.string().cuid(),
})

export const approvePOSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>
export type ApprovePOInput = z.infer<typeof approvePOSchema>
