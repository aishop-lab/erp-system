import { prisma } from '@/lib/prisma'
import type {
  CreateSalesChannelInput,
  UpdateSalesChannelInput,
  CreateEntityInput,
  UpdateEntityInput,
  CreatePaymentModeInput,
  UpdatePaymentModeInput,
} from '@/validators/settings'

export class SettingsService {
  // ============ Sales Channels ============

  static async getAllSalesChannels(tenantId: string) {
    return prisma.salesChannel.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  }

  static async getSalesChannelById(id: string, tenantId: string) {
    return prisma.salesChannel.findFirst({
      where: { id, tenantId },
    })
  }

  static async createSalesChannel(tenantId: string, data: CreateSalesChannelInput) {
    // Check for duplicate code
    const existing = await prisma.salesChannel.findFirst({
      where: { tenantId, code: data.code },
    })
    if (existing) {
      throw new Error('A sales channel with this code already exists')
    }

    return prisma.salesChannel.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        isActive: true,
      },
    })
  }

  static async updateSalesChannel(id: string, tenantId: string, data: UpdateSalesChannelInput) {
    const existing = await prisma.salesChannel.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Sales channel not found')
    }

    // Check for duplicate code if code is being updated
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.salesChannel.findFirst({
        where: { tenantId, code: data.code, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('A sales channel with this code already exists')
      }
    }

    return prisma.salesChannel.update({
      where: { id },
      data,
    })
  }

  static async deactivateSalesChannel(id: string, tenantId: string) {
    const existing = await prisma.salesChannel.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Sales channel not found')
    }

    return prisma.salesChannel.update({
      where: { id },
      data: { isActive: false },
    })
  }

  static async activateSalesChannel(id: string, tenantId: string) {
    const existing = await prisma.salesChannel.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Sales channel not found')
    }

    return prisma.salesChannel.update({
      where: { id },
      data: { isActive: true },
    })
  }

  // ============ Entities ============

  static async getAllEntities(tenantId: string) {
    return prisma.entity.findMany({
      where: { tenantId },
      include: {
        paymentModes: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  static async getEntityById(id: string, tenantId: string) {
    return prisma.entity.findFirst({
      where: { id, tenantId },
      include: {
        paymentModes: {
          orderBy: { name: 'asc' },
        },
      },
    })
  }

  static async createEntity(tenantId: string, data: CreateEntityInput) {
    // Check for duplicate name
    const existing = await prisma.entity.findFirst({
      where: { tenantId, name: data.name },
    })
    if (existing) {
      throw new Error('An entity with this name already exists')
    }

    return prisma.entity.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        isExternal: data.isExternal || false,
        isActive: true,
      },
      include: {
        paymentModes: true,
      },
    })
  }

  static async updateEntity(id: string, tenantId: string, data: UpdateEntityInput) {
    const existing = await prisma.entity.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Entity not found')
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.entity.findFirst({
        where: { tenantId, name: data.name, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('An entity with this name already exists')
      }
    }

    return prisma.entity.update({
      where: { id },
      data,
      include: {
        paymentModes: true,
      },
    })
  }

  static async deactivateEntity(id: string, tenantId: string) {
    const existing = await prisma.entity.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Entity not found')
    }

    return prisma.entity.update({
      where: { id },
      data: { isActive: false },
      include: {
        paymentModes: true,
      },
    })
  }

  static async activateEntity(id: string, tenantId: string) {
    const existing = await prisma.entity.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      throw new Error('Entity not found')
    }

    return prisma.entity.update({
      where: { id },
      data: { isActive: true },
      include: {
        paymentModes: true,
      },
    })
  }

  // ============ Payment Modes ============

  static async getPaymentModesByEntity(entityId: string, tenantId: string) {
    // First verify the entity belongs to the tenant
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, tenantId },
    })
    if (!entity) {
      throw new Error('Entity not found')
    }

    return prisma.paymentMode.findMany({
      where: { entityId },
      orderBy: { name: 'asc' },
    })
  }

  static async createPaymentMode(entityId: string, tenantId: string, data: CreatePaymentModeInput) {
    // Verify the entity belongs to the tenant
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, tenantId },
    })
    if (!entity) {
      throw new Error('Entity not found')
    }

    // Check for duplicate name within entity
    const existing = await prisma.paymentMode.findFirst({
      where: { entityId, name: data.name },
    })
    if (existing) {
      throw new Error('A payment mode with this name already exists for this entity')
    }

    return prisma.paymentMode.create({
      data: {
        entityId,
        tenantId,
        name: data.name,
        isActive: true,
      },
    })
  }

  static async updatePaymentMode(id: string, tenantId: string, data: UpdatePaymentModeInput) {
    // Get the payment mode and verify tenant ownership through entity
    const paymentMode = await prisma.paymentMode.findFirst({
      where: { id },
      include: { entity: true },
    })
    if (!paymentMode || paymentMode.entity.tenantId !== tenantId) {
      throw new Error('Payment mode not found')
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== paymentMode.name) {
      const duplicate = await prisma.paymentMode.findFirst({
        where: { entityId: paymentMode.entityId, name: data.name, id: { not: id } },
      })
      if (duplicate) {
        throw new Error('A payment mode with this name already exists for this entity')
      }
    }

    return prisma.paymentMode.update({
      where: { id },
      data,
    })
  }

  static async deletePaymentMode(id: string, tenantId: string) {
    // Get the payment mode and verify tenant ownership through entity
    const paymentMode = await prisma.paymentMode.findFirst({
      where: { id },
      include: { entity: true },
    })
    if (!paymentMode || paymentMode.entity.tenantId !== tenantId) {
      throw new Error('Payment mode not found')
    }

    return prisma.paymentMode.delete({
      where: { id },
    })
  }
}
