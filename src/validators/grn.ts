import { z } from 'zod'
import { GoodsCondition } from '@/types/enums'

export const grnLineItemSchema = z.object({
  poLineItemId: z.string().cuid('Invalid PO line item'),
  receivedQty: z.coerce.number().int().min(0, 'Received quantity must be non-negative'),
  acceptedQty: z.coerce.number().int().min(0, 'Accepted quantity must be non-negative'),
  rejectedQty: z.coerce.number().int().min(0).default(0),
  condition: z.nativeEnum(GoodsCondition).default(GoodsCondition.GOOD),
  batchNumber: z.string().max(100).optional(),
  expiryDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional(),
})

export const createGRNSchema = z.object({
  purchaseOrderId: z.string().cuid('Purchase order is required'),
  notes: z.string().max(1000).optional(),
  closePO: z.boolean().default(false),
  lineItems: z.array(grnLineItemSchema).min(1, 'At least one line item is required'),
})

export type CreateGRNInput = z.infer<typeof createGRNSchema>
export type GRNLineItemInput = z.infer<typeof grnLineItemSchema>
