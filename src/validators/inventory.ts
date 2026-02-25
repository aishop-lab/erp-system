import { z } from 'zod'

export const outflowLineItemSchema = z.object({
  batchId: z.string().cuid('Invalid batch'),
  quantity: z.coerce.number().min(0.001, 'Quantity must be positive'),
  reason: z.string().max(1000).optional(),
})

export const createOutflowSchema = z.object({
  outflowType: z.enum([
    'sale', 'sample', 'production_consumption', 'marketing',
    'damage', 'return_to_supplier', 'internal_use', 'theft_loss', 'other',
  ]),
  recipientName: z.string().max(200).optional(),
  recipientType: z.enum(['customer', 'influencer', 'supplier', 'internal']).optional(),
  outflowDate: z.string().min(1, 'Date is required'),
  notes: z.string().max(1000).optional(),
  lineItems: z.array(outflowLineItemSchema).min(1, 'At least one item is required'),
})

export const createAdjustmentSchema = z.object({
  batchId: z.string().cuid('Invalid batch'),
  actualQuantity: z.coerce.number().min(0, 'Actual quantity cannot be negative'),
  reason: z.enum(['physical_count', 'data_error', 'damage_found', 'system_migration', 'other']),
  adjustmentDate: z.string().min(1, 'Date is required'),
  notes: z.string().max(1000).optional(),
})

export type CreateOutflowInput = z.infer<typeof createOutflowSchema>
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>
