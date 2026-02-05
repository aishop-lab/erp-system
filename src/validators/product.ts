import { z } from 'zod'

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().max(1000).optional(),
  categoryId: z.string().cuid().optional().nullable(),
  unit: z.string().max(20).default('pcs'),
  hsnCode: z.string().max(20).optional(),
  gstRate: z.coerce.number().min(0).max(100).optional(),
})

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().cuid(),
})

export const productCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  level: z.number().int().min(1).max(5).default(1),
  parentId: z.string().cuid().optional().nullable(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductCategoryInput = z.infer<typeof productCategorySchema>
