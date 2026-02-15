import { z } from 'zod'

// Account type options
export const accountTypes = [
  'Savings',
  'Current',
  'OD',
  'Cash Credit',
  'NRE',
  'NRO',
] as const

// Supply categories match purchase_types codes
export const supplyCategories = [
  'finished',
  'fabric',
  'raw_material',
  'packaging',
  'corporate_assets',
  'samples',
  'influencer_samples',
  'transportation',
  'advertisement',
  'office_expenses',
  'software',
  'feedback',
  'misc',
  'customer_refunds',
] as const

// Contact schema (for additional contacts)
export const contactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isPrimary: z.boolean().default(false),
})

// Main supplier creation schema
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  gstNumber: z.string().max(15).optional().or(z.literal('')),
  panNumber: z.string().max(10).optional().or(z.literal('')),
  bankName: z.string().max(100).optional(),
  bankAccountNumber: z.string().max(50).optional(),
  bankIfscCode: z.string().max(11).optional(),
  paymentTerms: z.string().max(255).optional(),
  supplyCategories: z.array(z.enum(supplyCategories)).default([]),
  isActive: z.boolean().default(true),
  contacts: z.array(contactSchema).optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

// Product types for pricing
export const pricingProductTypes = ['finished', 'fabric', 'raw_material', 'packaging'] as const

// Pricing catalog row schema
export const pricingRowSchema = z.object({
  productId: z.string().min(1),
  productType: z.enum(pricingProductTypes).optional(),
  unitPrice: z.number().positive('Unit price must be positive').optional(),
  jobWorkRate: z.number().positive('Job work rate must be positive').optional(),
  directPurchaseRate: z.number().positive('Direct purchase rate must be positive').optional(),
  currency: z.string().default('INR'),
  minQty: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.productType === 'finished') {
      return (data.directPurchaseRate !== undefined && data.directPurchaseRate > 0) ||
             (data.jobWorkRate !== undefined && data.jobWorkRate > 0) ||
             (data.unitPrice !== undefined && data.unitPrice > 0)
    }
    return data.unitPrice !== undefined && data.unitPrice > 0
  },
  {
    message: 'Finished products need at least one rate (directPurchaseRate, jobWorkRate, or unitPrice). Other types require unitPrice.',
  }
)

export const uploadPricingSchema = z.object({
  pricing: z.array(pricingRowSchema),
})

// CSV pricing row schema (for parsing uploaded CSV)
export const csvPricingRowSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  productType: z.enum(pricingProductTypes).optional(),
  unitPrice: z.number().positive('Unit price must be positive').optional(),
  jobWorkRate: z.number().positive('Job work rate must be positive').optional(),
  directPurchaseRate: z.number().positive('Direct purchase rate must be positive').optional(),
  currency: z.string().default('INR'),
  minQty: z.number().int().positive().optional(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type PricingRowInput = z.infer<typeof pricingRowSchema>
export type CsvPricingRowInput = z.infer<typeof csvPricingRowSchema>
