import { prisma } from '@/lib/prisma'
import type {
  CreateStyleInput,
  UpdateStyleInput,
  CreateFabricInput,
  UpdateFabricInput,
  CreateRawMaterialInput,
  UpdateRawMaterialInput,
  CreatePackagingInput,
  UpdatePackagingInput,
  CreateFinishedProductInput,
  UpdateFinishedProductInput,
  CreateMediaFileInput,
} from '@/validators/product-info'

// ============================================
// Style Library Service
// ============================================

export class StyleService {
  static async getAll(tenantId: string, filters?: { status?: string; search?: string }) {
    const where: any = { tenantId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.search) {
      where.OR = [
        { styleCode: { contains: filters.search, mode: 'insensitive' } },
        { styleName: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return prisma.style.findMany({
      where,
      orderBy: { styleName: 'asc' },
    })
  }

  static async getById(id: string, tenantId: string) {
    return prisma.style.findFirst({
      where: { id, tenantId },
      include: {
        finishedProducts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  static async create(tenantId: string, data: CreateStyleInput) {
    // Check for duplicate styleCode
    const existing = await prisma.style.findFirst({
      where: { tenantId, styleCode: data.styleCode },
    })
    if (existing) {
      throw new Error('A style with this code already exists')
    }

    return prisma.style.create({
      data: {
        tenantId,
        ...data,
      },
    })
  }

  static async update(id: string, tenantId: string, data: UpdateStyleInput) {
    const existing = await prisma.style.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Style not found')
    }

    // Check for duplicate styleCode if changed
    if (data.styleCode && data.styleCode !== existing.styleCode) {
      const duplicate = await prisma.style.findFirst({
        where: { tenantId, styleCode: data.styleCode, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('A style with this code already exists')
      }
    }

    return prisma.style.update({
      where: { id, tenantId },
      data,
    })
  }

  static async deactivate(id: string, tenantId: string) {
    const existing = await prisma.style.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Style not found')
    }

    return prisma.style.update({
      where: { id, tenantId },
      data: { status: 'inactive' },
    })
  }

  static async activate(id: string, tenantId: string) {
    const existing = await prisma.style.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Style not found')
    }

    return prisma.style.update({
      where: { id, tenantId },
      data: { status: 'active' },
    })
  }
}

// ============================================
// Fabric Library Service
// ============================================

export class FabricService {
  static async getAll(tenantId: string, filters?: { status?: string; search?: string }) {
    const where: any = { tenantId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.search) {
      where.OR = [
        { fabricSku: { contains: filters.search, mode: 'insensitive' } },
        { material: { contains: filters.search, mode: 'insensitive' } },
        { color: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return prisma.fabric.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { fabricSku: 'asc' },
    })
  }

  static async getById(id: string, tenantId: string) {
    return prisma.fabric.findFirst({
      where: { id, tenantId },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
        finishedProducts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  static async create(tenantId: string, data: CreateFabricInput) {
    const existing = await prisma.fabric.findFirst({
      where: { tenantId, fabricSku: data.fabricSku },
    })
    if (existing) {
      throw new Error('A fabric with this SKU already exists')
    }

    return prisma.fabric.create({
      data: {
        tenantId,
        ...data,
      },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    })
  }

  static async update(id: string, tenantId: string, data: UpdateFabricInput) {
    const existing = await prisma.fabric.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Fabric not found')
    }

    if (data.fabricSku && data.fabricSku !== existing.fabricSku) {
      const duplicate = await prisma.fabric.findFirst({
        where: { tenantId, fabricSku: data.fabricSku, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('A fabric with this SKU already exists')
      }
    }

    return prisma.fabric.update({
      where: { id, tenantId },
      data,
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    })
  }

  static async deactivate(id: string, tenantId: string) {
    const existing = await prisma.fabric.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Fabric not found')
    }

    return prisma.fabric.update({
      where: { id, tenantId },
      data: { status: 'inactive' },
    })
  }
}

// ============================================
// Raw Material Library Service
// ============================================

export class RawMaterialService {
  static async getAll(tenantId: string, filters?: { status?: string; search?: string }) {
    const where: any = { tenantId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.search) {
      where.OR = [
        { rmSku: { contains: filters.search, mode: 'insensitive' } },
        { rmType: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return prisma.rawMaterial.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { rmSku: 'asc' },
    })
  }

  static async getById(id: string, tenantId: string) {
    return prisma.rawMaterial.findFirst({
      where: { id, tenantId },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    })
  }

  static async create(tenantId: string, data: CreateRawMaterialInput) {
    const existing = await prisma.rawMaterial.findFirst({
      where: { tenantId, rmSku: data.rmSku },
    })
    if (existing) {
      throw new Error('A raw material with this SKU already exists')
    }

    return prisma.rawMaterial.create({
      data: {
        tenantId,
        ...data,
      },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    })
  }

  static async update(id: string, tenantId: string, data: UpdateRawMaterialInput) {
    const existing = await prisma.rawMaterial.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Raw material not found')
    }

    if (data.rmSku && data.rmSku !== existing.rmSku) {
      const duplicate = await prisma.rawMaterial.findFirst({
        where: { tenantId, rmSku: data.rmSku, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('A raw material with this SKU already exists')
      }
    }

    return prisma.rawMaterial.update({
      where: { id, tenantId },
      data,
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    })
  }

  static async deactivate(id: string, tenantId: string) {
    const existing = await prisma.rawMaterial.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Raw material not found')
    }

    return prisma.rawMaterial.update({
      where: { id, tenantId },
      data: { status: 'inactive' },
    })
  }
}

// ============================================
// Packaging Library Service
// ============================================

export class PackagingService {
  static async getAll(tenantId: string, filters?: { status?: string; search?: string }) {
    const where: any = { tenantId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.search) {
      where.OR = [
        { pkgSku: { contains: filters.search, mode: 'insensitive' } },
        { pkgType: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return prisma.packaging.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { pkgSku: 'asc' },
    })
  }

  static async getById(id: string, tenantId: string) {
    return prisma.packaging.findFirst({
      where: { id, tenantId },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    })
  }

  static async create(tenantId: string, data: CreatePackagingInput) {
    const existing = await prisma.packaging.findFirst({
      where: { tenantId, pkgSku: data.pkgSku },
    })
    if (existing) {
      throw new Error('A packaging with this SKU already exists')
    }

    return prisma.packaging.create({
      data: {
        tenantId,
        ...data,
      },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    })
  }

  static async update(id: string, tenantId: string, data: UpdatePackagingInput) {
    const existing = await prisma.packaging.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Packaging not found')
    }

    if (data.pkgSku && data.pkgSku !== existing.pkgSku) {
      const duplicate = await prisma.packaging.findFirst({
        where: { tenantId, pkgSku: data.pkgSku, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('A packaging with this SKU already exists')
      }
    }

    return prisma.packaging.update({
      where: { id, tenantId },
      data,
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    })
  }

  static async deactivate(id: string, tenantId: string) {
    const existing = await prisma.packaging.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Packaging not found')
    }

    return prisma.packaging.update({
      where: { id, tenantId },
      data: { status: 'inactive' },
    })
  }
}

// ============================================
// Finished Product Library Service
// ============================================

export class FinishedProductService {
  static async getAll(tenantId: string, filters?: {
    status?: string
    search?: string
    styleId?: string
    fabricId?: string
  }) {
    const where: any = { tenantId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.styleId) {
      where.styleId = filters.styleId
    }

    if (filters?.fabricId) {
      where.fabricId = filters.fabricId
    }

    if (filters?.search) {
      where.OR = [
        { parentSku: { contains: filters.search, mode: 'insensitive' } },
        { childSku: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return prisma.finishedProduct.findMany({
      where,
      include: {
        style: {
          select: { id: true, styleCode: true, styleName: true },
        },
        fabric: {
          select: { id: true, fabricSku: true, material: true, color: true },
        },
        entity: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async getById(id: string, tenantId: string) {
    return prisma.finishedProduct.findFirst({
      where: { id, tenantId },
      include: {
        style: true,
        fabric: {
          include: {
            supplier: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        entity: true,
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        amazonData: true,
        myntraData: true,
        shopifyData: true,
        flipkartData: true,
        nykaaData: true,
      },
    })
  }

  static async create(tenantId: string, data: CreateFinishedProductInput) {
    // Check for duplicate childSku
    const existing = await prisma.finishedProduct.findFirst({
      where: { tenantId, childSku: data.childSku },
    })
    if (existing) {
      throw new Error('A product with this child SKU already exists')
    }

    // Verify style exists
    const style = await prisma.style.findFirst({
      where: { id: data.styleId, tenantId },
    })
    if (!style) {
      throw new Error('Style not found')
    }

    // Verify fabric exists
    const fabric = await prisma.fabric.findFirst({
      where: { id: data.fabricId, tenantId },
    })
    if (!fabric) {
      throw new Error('Fabric not found')
    }

    return prisma.finishedProduct.create({
      data: {
        tenantId,
        ...data,
        sellingChannels: data.sellingChannels || [],
      },
      include: {
        style: {
          select: { id: true, styleCode: true, styleName: true },
        },
        fabric: {
          select: { id: true, fabricSku: true, material: true, color: true },
        },
        entity: {
          select: { id: true, name: true },
        },
      },
    })
  }

  static async update(id: string, tenantId: string, data: UpdateFinishedProductInput) {
    const existing = await prisma.finishedProduct.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Product not found')
    }

    if (data.childSku && data.childSku !== existing.childSku) {
      const duplicate = await prisma.finishedProduct.findFirst({
        where: { tenantId, childSku: data.childSku, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('A product with this child SKU already exists')
      }
    }

    return prisma.finishedProduct.update({
      where: { id, tenantId },
      data,
      include: {
        style: {
          select: { id: true, styleCode: true, styleName: true },
        },
        fabric: {
          select: { id: true, fabricSku: true, material: true, color: true },
        },
        entity: {
          select: { id: true, name: true },
        },
      },
    })
  }

  static async deactivate(id: string, tenantId: string) {
    const existing = await prisma.finishedProduct.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Product not found')
    }

    return prisma.finishedProduct.update({
      where: { id, tenantId },
      data: { status: 'inactive' },
    })
  }
}

// ============================================
// Media File Service
// ============================================

export class MediaFileService {
  static async getByEntity(entityType: string, entityId: string, tenantId: string) {
    return prisma.mediaFile.findMany({
      where: { entityType, entityId, tenantId },
      orderBy: { sortOrder: 'asc' },
    })
  }

  static async create(tenantId: string, data: CreateMediaFileInput) {
    return prisma.mediaFile.create({
      data: {
        tenantId,
        ...data,
      },
    })
  }

  static async delete(id: string, tenantId: string) {
    const existing = await prisma.mediaFile.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Media file not found')
    }

    return prisma.mediaFile.delete({
      where: { id, tenantId },
    })
  }

  static async setPrimary(id: string, tenantId: string) {
    const file = await prisma.mediaFile.findFirst({
      where: { id, tenantId },
    })
    if (!file) {
      throw new Error('Media file not found')
    }

    // Remove primary flag from other files of same entity
    await prisma.mediaFile.updateMany({
      where: {
        entityType: file.entityType,
        entityId: file.entityId,
        tenantId,
        id: { not: id },
      },
      data: { isPrimary: false },
    })

    // Set this file as primary
    return prisma.mediaFile.update({
      where: { id, tenantId },
      data: { isPrimary: true },
    })
  }

  static async reorder(ids: string[], tenantId: string) {
    const updates = ids.map((id, index) =>
      prisma.mediaFile.update({
        where: { id, tenantId },
        data: { sortOrder: index },
      })
    )

    return prisma.$transaction(updates)
  }
}
