import { z } from 'zod'

export const submitReconciliationSchema = z.object({
  entityId: z.string().cuid('Entity is required'),
  invoiceNumber: z.string().max(100).optional(),
  invoiceDate: z.string().datetime('Invalid invoice date'),
  invoiceAmount: z.coerce.number().min(0.01, 'Invoice amount must be positive'),
  transportCharges: z.coerce.number().min(0).default(0),
  invoiceAttachment: z.string().optional(),
  grnAttachment: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

export type SubmitReconciliationInput = z.infer<typeof submitReconciliationSchema>
