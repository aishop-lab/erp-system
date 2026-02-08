import { z } from 'zod'

// ============================================
// Style Library Validators
// ============================================

export const createStyleSchema = z.object({
  styleCode: z.string().min(1, 'Style code is required').max(20),
  styleName: z.string().min(1, 'Style name is required').max(255),
  gender: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  sleeves: z.string().max(100).optional().nullable(),
  neckShape: z.string().max(100).optional().nullable(),
  backShape: z.string().max(100).optional().nullable(),
  openMechanism: z.string().max(100).optional().nullable(),
  padding: z.string().max(100).optional().nullable(),
  // Chest measurements
  chest32: z.number().optional().nullable(),
  chest34: z.number().optional().nullable(),
  chest36: z.number().optional().nullable(),
  chest38: z.number().optional().nullable(),
  chest40: z.number().optional().nullable(),
  chest42: z.number().optional().nullable(),
  chest44: z.number().optional().nullable(),
  chest46: z.number().optional().nullable(),
  chest48: z.number().optional().nullable(),
  chest50: z.number().optional().nullable(),
  // Length measurements
  length32: z.number().optional().nullable(),
  length34: z.number().optional().nullable(),
  length36: z.number().optional().nullable(),
  length38: z.number().optional().nullable(),
  length40: z.number().optional().nullable(),
  length42: z.number().optional().nullable(),
  length44: z.number().optional().nullable(),
  length46: z.number().optional().nullable(),
  length48: z.number().optional().nullable(),
  length50: z.number().optional().nullable(),
  // Waist measurements
  waist32: z.number().optional().nullable(),
  waist34: z.number().optional().nullable(),
  waist36: z.number().optional().nullable(),
  waist38: z.number().optional().nullable(),
  waist40: z.number().optional().nullable(),
  waist42: z.number().optional().nullable(),
  waist44: z.number().optional().nullable(),
  waist46: z.number().optional().nullable(),
  waist48: z.number().optional().nullable(),
  waist50: z.number().optional().nullable(),
  // Other measurements
  shoulder: z.number().optional().nullable(),
  neckDepth: z.number().optional().nullable(),
  armhole: z.number().optional().nullable(),
  sleeveLength: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
})

export const updateStyleSchema = createStyleSchema.partial()

export type CreateStyleInput = z.infer<typeof createStyleSchema>
export type UpdateStyleInput = z.infer<typeof updateStyleSchema>

// ============================================
// Fabric Library Validators
// ============================================

export const createFabricSchema = z.object({
  fabricSku: z.string().min(1, 'Fabric SKU is required').max(50),
  material: z.string().min(1, 'Material is required').max(100),
  color: z.string().min(1, 'Color is required').max(100),
  design: z.string().max(100).optional().nullable(),
  work: z.string().max(100).optional().nullable(),
  widthCm: z.number().positive().optional().nullable(),
  weightPerMeter: z.number().positive().optional().nullable(),
  costAmount: z.number().positive('Cost must be positive'),
  gstRatePct: z.number().min(0).max(100).default(5),
  hsnCode: z.string().max(20).optional().nullable(),
  uom: z.string().max(20).default('Meters'),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
})

export const updateFabricSchema = createFabricSchema.partial()

export type CreateFabricInput = z.infer<typeof createFabricSchema>
export type UpdateFabricInput = z.infer<typeof updateFabricSchema>

// ============================================
// Raw Material Library Validators
// ============================================

export const createRawMaterialSchema = z.object({
  rmSku: z.string().min(1, 'RM SKU is required').max(50),
  rmType: z.string().min(1, 'RM Type is required').max(100),
  color: z.string().max(100).optional().nullable(),
  measurementUnit: z.string().min(1, 'Measurement unit is required').max(50),
  unitsPerQuantity: z.number().int().positive('Units must be positive'),
  costPerSku: z.number().positive('Cost must be positive'),
  gstRatePct: z.number().min(0).max(100).default(5),
  hsnCode: z.string().max(20).optional().nullable(),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
})

export const updateRawMaterialSchema = createRawMaterialSchema.partial()

export type CreateRawMaterialInput = z.infer<typeof createRawMaterialSchema>
export type UpdateRawMaterialInput = z.infer<typeof updateRawMaterialSchema>

// ============================================
// Packaging Library Validators
// ============================================

export const createPackagingSchema = z.object({
  pkgSku: z.string().min(1, 'Package SKU is required').max(50),
  pkgType: z.string().min(1, 'Package type is required').max(100),
  description: z.string().max(500).optional().nullable(),
  channel: z.string().max(100).optional().nullable(),
  dimensions: z.string().max(100).optional().nullable(),
  measurementUnit: z.string().min(1, 'Measurement unit is required').max(50),
  unitsPerQuantity: z.number().int().positive('Units must be positive'),
  costPerUnit: z.number().positive('Cost must be positive'),
  gstRatePct: z.number().min(0).max(100).default(5),
  hsnCode: z.string().max(20).optional().nullable(),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
})

export const updatePackagingSchema = createPackagingSchema.partial()

export type CreatePackagingInput = z.infer<typeof createPackagingSchema>
export type UpdatePackagingInput = z.infer<typeof updatePackagingSchema>

// ============================================
// Finished Product Library Validators
// ============================================

export const createFinishedProductSchema = z.object({
  parentSku: z.string().min(1, 'Parent SKU is required').max(50),
  childSku: z.string().min(1, 'Child SKU is required').max(50),
  styleId: z.string().min(1, 'Style is required'),
  fabricId: z.string().min(1, 'Fabric is required'),
  entityId: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(500),
  color: z.string().min(1, 'Color is required').max(100),
  size: z.string().min(1, 'Size is required').max(50),
  costAmount: z.number().positive('Cost must be positive'),
  sellingPrice: z.number().positive().optional().nullable(),
  mrp: z.number().positive().optional().nullable(),
  gstRatePct: z.number().min(0).max(100).default(5),
  currency: z.string().max(10).default('INR'),
  sellingChannels: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
})

export const updateFinishedProductSchema = createFinishedProductSchema.partial()

export type CreateFinishedProductInput = z.infer<typeof createFinishedProductSchema>
export type UpdateFinishedProductInput = z.infer<typeof updateFinishedProductSchema>

// ============================================
// Media File Validators
// ============================================

export const createMediaFileSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  fileType: z.string().min(1),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  thumbnailPath: z.string().optional().nullable(),
})

export type CreateMediaFileInput = z.infer<typeof createMediaFileSchema>
