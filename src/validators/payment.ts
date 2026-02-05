import { z } from 'zod'
import { PaymentStatus } from '@/types/enums'

export const createPaymentSchema = z.object({
  purchaseOrderId: z.string().cuid().optional().nullable(),
  supplierId: z.string().cuid().optional().nullable(),
  entityId: z.string().cuid('Entity is required'),
  paymentModeId: z.string().cuid().optional().nullable(),
  externalVendorId: z.string().cuid().optional().nullable(),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  paymentDate: z.string().datetime('Invalid payment date'),
  reference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
})

export const updatePaymentSchema = createPaymentSchema.partial().extend({
  id: z.string().cuid(),
  status: z.nativeEnum(PaymentStatus).optional(),
})

export const approvePaymentSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
})

export const settlementSchema = z.object({
  salesChannelId: z.string().cuid('Sales channel is required'),
  settlementDate: z.string().datetime('Invalid settlement date'),
  grossAmount: z.coerce.number().min(0, 'Gross amount must be non-negative'),
  fees: z.coerce.number().min(0).default(0),
  netAmount: z.coerce.number().min(0, 'Net amount must be non-negative'),
  reference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>
export type SettlementInput = z.infer<typeof settlementSchema>
