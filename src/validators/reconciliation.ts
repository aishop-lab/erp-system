import { z } from 'zod'

export const submitReconciliationSchema = z.object({
  entityId: z.string().cuid('Entity is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100),
  invoiceDate: z.string().datetime('Invalid invoice date'),
  invoiceAmount: z.coerce.number().min(0.01, 'Invoice amount must be positive'),
  invoiceAttachment: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

export type SubmitReconciliationInput = z.infer<typeof submitReconciliationSchema>
