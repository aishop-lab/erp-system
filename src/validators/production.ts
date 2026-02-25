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
  sku: z.string().max(100).optional().nullable(),
  productName: z.string().max(200).optional().nullable(),
  plannedQty: z.coerce.number().min(0).optional().nullable(),
  targetDate: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  productionLine: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional(),
  materials: z.array(productionMaterialSchema).optional(),
})

export const updateProductionSchema = createProductionSchema.partial().extend({
  id: z.string().cuid(),
  status: z.nativeEnum(ProductionStatus).optional(),
})

export const completeProductionSchema = z.object({
  actualQty: z.coerce.number().min(0, 'Actual quantity is required'),
  rejectedQty: z.coerce.number().min(0).default(0),
  wasteQty: z.coerce.number().min(0).default(0),
  laborCost: z.coerce.number().min(0).optional().nullable(),
  overheadCost: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional(),
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
export type CompleteProductionInput = z.infer<typeof completeProductionSchema>
export type RMIssuanceInput = z.infer<typeof rmIssuanceSchema>
