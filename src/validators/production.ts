import { z } from 'zod'
import { ProductionType, ProductionStatus } from '@/types/enums'

export const productionMaterialSchema = z.object({
  productId: z.string().cuid('Invalid product'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  batchId: z.string().cuid().optional().nullable(),
})

export const createProductionSchema = z.object({
  productionType: z.nativeEnum(ProductionType),
  outputProductId: z.string().cuid().optional().nullable(),
  outputQuantity: z.coerce.number().int().min(1).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional(),
  materials: z.array(productionMaterialSchema).optional(),
})

export const updateProductionSchema = createProductionSchema.partial().extend({
  id: z.string().cuid(),
  status: z.nativeEnum(ProductionStatus).optional(),
})

export const rmIssuanceSchema = z.object({
  purchaseOrderId: z.string().cuid('Purchase order is required'),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    productId: z.string().cuid('Invalid product'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
    batchId: z.string().cuid().optional().nullable(),
  })).min(1, 'At least one item is required'),
})

export type CreateProductionInput = z.infer<typeof createProductionSchema>
export type UpdateProductionInput = z.infer<typeof updateProductionSchema>
export type RMIssuanceInput = z.infer<typeof rmIssuanceSchema>
