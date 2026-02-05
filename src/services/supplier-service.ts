import { prisma } from '@/lib/prisma'
import type { CreateSupplierInput, UpdateSupplierInput, ContactInput, PricingRowInput } from '@/validators/supplier'

export class SupplierService {
  // Generate next supplier code (SUP001, SUP002, etc.)
  static async generateCode(tenantId: string): Promise<string> {
    const lastSupplier = await prisma.supplier.findFirst({
      where: { tenantId },
      orderBy: { code: 'desc' },
      select: { code: true },
    })

    if (!lastSupplier || !lastSupplier.code.startsWith('SUP')) {
      return 'SUP001'
    }

    const lastNumber = parseInt(lastSupplier.code.replace('SUP', ''))
    const nextNumber = lastNumber + 1
    return `SUP${nextNumber.toString().padStart(3, '0')}`
  }

  // List suppliers with filters
  static async getAllSuppliers(
    tenantId: string,
    filters?: {
      isActive?: boolean
      search?: string
      purchaseType?: string
      page?: number
      pageSize?: number
    }
  ) {
    const { search, page = 1, pageSize = 10, isActive, purchaseType } = filters || {}

    const where: any = { tenantId }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    // Filter by purchase type (suppliers that can supply this type)
    if (purchaseType) {
      where.supplyCategories = {
        has: purchaseType,
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          contacts: true,
          _count: {
            select: { pricings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supplier.count({ where }),
    ])

    return {
      data: suppliers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // Get active suppliers for dropdowns
  static async getActiveSuppliers(tenantId: string, purchaseType?: string) {
    const where: any = { tenantId, isActive: true }

    if (purchaseType) {
      where.supplyCategories = {
        has: purchaseType,
      }
    }

    return prisma.supplier.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        supplyCategories: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  // Get suppliers by purchase type (for PO vendor dropdown)
  static async getSuppliersByPurchaseType(tenantId: string, purchaseType: string) {
    return prisma.supplier.findMany({
      where: {
        tenantId,
        isActive: true,
        supplyCategories: {
          has: purchaseType,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        supplyCategories: true,
        email: true,
        gstNumber: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  // Get single supplier
  static async getSupplierById(id: string, tenantId: string) {
    return prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        contacts: true,
        pricings: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    })
  }

  // Create supplier
  static async createSupplier(tenantId: string, data: CreateSupplierInput) {
    const code = await this.generateCode(tenantId)

    const { contacts, ...supplierData } = data

    const supplier = await prisma.supplier.create({
      data: {
        code,
        tenantId,
        name: supplierData.name,
        email: supplierData.email || null,
        phone: supplierData.phone || null,
        address: supplierData.address || null,
        gstNumber: supplierData.gstNumber || null,
        panNumber: supplierData.panNumber || null,
        bankName: supplierData.bankName || null,
        bankAccountNumber: supplierData.bankAccountNumber || null,
        bankIfscCode: supplierData.bankIfscCode || null,
        paymentTerms: supplierData.paymentTerms || null,
        supplyCategories: supplierData.supplyCategories || [],
        isActive: supplierData.isActive ?? true,
        contacts: contacts?.length
          ? {
              create: contacts.map(c => ({
                name: c.name,
                email: c.email || null,
                phone: c.phone || null,
                isPrimary: c.isPrimary || false,
              })),
            }
          : undefined,
      },
      include: {
        contacts: true,
      },
    })

    return supplier
  }

  // Update supplier
  static async updateSupplier(id: string, tenantId: string, data: UpdateSupplierInput) {
    // Verify supplier belongs to tenant
    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Supplier not found')
    }

    const { contacts, ...updateData } = data

    // Build update object with only defined fields
    const updateFields: any = {}
    if (updateData.name !== undefined) updateFields.name = updateData.name
    if (updateData.email !== undefined) updateFields.email = updateData.email || null
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone || null
    if (updateData.address !== undefined) updateFields.address = updateData.address || null
    if (updateData.gstNumber !== undefined) updateFields.gstNumber = updateData.gstNumber || null
    if (updateData.panNumber !== undefined) updateFields.panNumber = updateData.panNumber || null
    if (updateData.bankName !== undefined) updateFields.bankName = updateData.bankName || null
    if (updateData.bankAccountNumber !== undefined) updateFields.bankAccountNumber = updateData.bankAccountNumber || null
    if (updateData.bankIfscCode !== undefined) updateFields.bankIfscCode = updateData.bankIfscCode || null
    if (updateData.paymentTerms !== undefined) updateFields.paymentTerms = updateData.paymentTerms || null
    if (updateData.supplyCategories !== undefined) updateFields.supplyCategories = updateData.supplyCategories
    if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive

    return prisma.supplier.update({
      where: { id },
      data: updateFields,
      include: {
        contacts: true,
      },
    })
  }

  // Deactivate supplier (soft delete)
  static async deactivateSupplier(id: string, tenantId: string) {
    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Supplier not found')
    }

    return prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    })
  }

  // Activate supplier
  static async activateSupplier(id: string, tenantId: string) {
    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Supplier not found')
    }

    return prisma.supplier.update({
      where: { id },
      data: { isActive: true },
    })
  }

  // Add contact
  static async addContact(supplierId: string, contactData: ContactInput, tenantId: string) {
    // Verify supplier belongs to tenant
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    })

    if (!supplier) {
      throw new Error('Supplier not found')
    }

    // If this contact is primary, unset other primary contacts
    if (contactData.isPrimary) {
      await prisma.supplierContact.updateMany({
        where: { supplierId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    return prisma.supplierContact.create({
      data: {
        supplierId,
        name: contactData.name,
        email: contactData.email || null,
        phone: contactData.phone || null,
        isPrimary: contactData.isPrimary || false,
      },
    })
  }

  // Update contact
  static async updateContact(contactId: string, contactData: ContactInput, tenantId: string) {
    // Verify contact belongs to tenant's supplier
    const contact = await prisma.supplierContact.findFirst({
      where: {
        id: contactId,
        supplier: { tenantId },
      },
      include: { supplier: true },
    })

    if (!contact) {
      throw new Error('Contact not found')
    }

    // If this contact is becoming primary, unset other primary contacts
    if (contactData.isPrimary && !contact.isPrimary) {
      await prisma.supplierContact.updateMany({
        where: { supplierId: contact.supplierId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    return prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        name: contactData.name,
        email: contactData.email || null,
        phone: contactData.phone || null,
        isPrimary: contactData.isPrimary || false,
      },
    })
  }

  // Delete contact
  static async deleteContact(contactId: string, tenantId: string) {
    const contact = await prisma.supplierContact.findFirst({
      where: {
        id: contactId,
        supplier: { tenantId },
      },
    })

    if (!contact) {
      throw new Error('Contact not found')
    }

    return prisma.supplierContact.delete({
      where: { id: contactId },
    })
  }

  // Upload pricing catalog (upsert)
  static async uploadPricingCatalog(
    supplierId: string,
    pricing: PricingRowInput[],
    tenantId: string
  ) {
    // Verify supplier
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    })

    if (!supplier) {
      throw new Error('Supplier not found')
    }

    // Verify all products exist and belong to tenant
    const productIds = pricing.map(p => p.productId)
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        id: { in: productIds },
      },
      select: { id: true },
    })

    const validProductIds = new Set(products.map(p => p.id))
    const invalidProducts = productIds.filter(id => !validProductIds.has(id))

    if (invalidProducts.length > 0) {
      throw new Error(`Invalid product IDs: ${invalidProducts.join(', ')}`)
    }

    // Upsert each pricing row
    const results = await Promise.all(
      pricing.map(async (row) => {
        return prisma.supplierPricing.upsert({
          where: {
            supplierId_productId: {
              supplierId,
              productId: row.productId,
            },
          },
          create: {
            supplierId,
            productId: row.productId,
            unitPrice: row.unitPrice,
            currency: row.currency || 'INR',
            minQty: row.minQty || null,
            validFrom: row.validFrom ? new Date(row.validFrom) : null,
            validTo: row.validTo ? new Date(row.validTo) : null,
          },
          update: {
            unitPrice: row.unitPrice,
            currency: row.currency || 'INR',
            minQty: row.minQty || null,
            validFrom: row.validFrom ? new Date(row.validFrom) : null,
            validTo: row.validTo ? new Date(row.validTo) : null,
          },
        })
      })
    )

    return results
  }

  // Upload pricing from CSV (by SKU)
  static async uploadPricingFromCsv(
    supplierId: string,
    rows: { sku: string; unitPrice: number; currency?: string; minQty?: number }[],
    tenantId: string
  ) {
    // Verify supplier
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    })

    if (!supplier) {
      throw new Error('Supplier not found')
    }

    // Get all SKUs from CSV
    const skus = rows.map(r => r.sku)

    // Find products by SKU
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        sku: { in: skus },
      },
      select: { id: true, sku: true },
    })

    const skuToProductId = new Map(products.map(p => [p.sku, p.id]))
    const results: any[] = []
    const errors: string[] = []

    for (const row of rows) {
      const productId = skuToProductId.get(row.sku)
      if (!productId) {
        errors.push(`SKU "${row.sku}" not found`)
        continue
      }

      const result = await prisma.supplierPricing.upsert({
        where: {
          supplierId_productId: {
            supplierId,
            productId,
          },
        },
        create: {
          supplierId,
          productId,
          unitPrice: row.unitPrice,
          currency: row.currency || 'INR',
          minQty: row.minQty || null,
        },
        update: {
          unitPrice: row.unitPrice,
          currency: row.currency || 'INR',
          minQty: row.minQty || null,
        },
      })

      results.push(result)
    }

    return { results, errors }
  }

  // Get pricing for supplier
  static async getPricing(supplierId: string, tenantId: string) {
    // Verify supplier belongs to tenant
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    })

    if (!supplier) {
      throw new Error('Supplier not found')
    }

    return prisma.supplierPricing.findMany({
      where: { supplierId },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
          },
        },
      },
      orderBy: { product: { sku: 'asc' } },
    })
  }

  // Delete pricing
  static async deletePricing(pricingId: string, tenantId: string) {
    const pricing = await prisma.supplierPricing.findFirst({
      where: {
        id: pricingId,
        supplier: { tenantId },
      },
    })

    if (!pricing) {
      throw new Error('Pricing not found')
    }

    return prisma.supplierPricing.delete({
      where: { id: pricingId },
    })
  }
}

// Export functions for backwards compatibility
export async function getSuppliers(tenantId: string, params?: {
  search?: string
  page?: number
  pageSize?: number
  isActive?: boolean
}) {
  return SupplierService.getAllSuppliers(tenantId, params)
}

export async function getSupplierById(id: string, tenantId: string) {
  return SupplierService.getSupplierById(id, tenantId)
}

export async function createSupplier(tenantId: string, data: CreateSupplierInput) {
  return SupplierService.createSupplier(tenantId, data)
}

export async function updateSupplier(id: string, tenantId: string, data: UpdateSupplierInput) {
  return SupplierService.updateSupplier(id, tenantId, data)
}

export async function deleteSupplier(id: string, tenantId: string) {
  return SupplierService.deactivateSupplier(id, tenantId)
}
