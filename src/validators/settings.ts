import { z } from 'zod'

// Sales Channel schemas
export const createSalesChannelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
})

export const updateSalesChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
})

// Entity schemas
export const createEntitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['in_house', 'external']),
  isExternal: z.boolean().default(false),
})

export const updateEntitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['in_house', 'external']).optional(),
  isExternal: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

// Payment Mode schemas
export const createPaymentModeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

export const updatePaymentModeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

// Type exports
export type CreateSalesChannelInput = z.infer<typeof createSalesChannelSchema>
export type UpdateSalesChannelInput = z.infer<typeof updateSalesChannelSchema>
export type CreateEntityInput = z.infer<typeof createEntitySchema>
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>
export type CreatePaymentModeInput = z.infer<typeof createPaymentModeSchema>
export type UpdatePaymentModeInput = z.infer<typeof updatePaymentModeSchema>
