import { prisma } from '@/lib/prisma'
import { ProductionStatus, ProductionType, MovementType } from '@prisma/client'
import type { CreateProductionInput, RMIssuanceInput } from '@/validators/production'

export async function getProductions(tenantId: string, params?: {
  productionType?: ProductionType
  status?: ProductionStatus
  page?: number
  pageSize?: number
}) {
  const { productionType, status, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(productionType && { productionType }),
    ...(status && { status }),
  }

  const [productions, total] = await Promise.all([
    prisma.production.findMany({
      where,
      include: {
        createdBy: true,
        materials: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.production.count({ where }),
  ])

  return {
    data: productions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getProductionById(id: string, tenantId: string) {
  return prisma.production.findFirst({
    where: { id, tenantId },
    include: {
      createdBy: true,
      materials: {
        include: {
          product: true,
        },
      },
    },
  })
}

export async function createProduction(tenantId: string, userId: string, data: CreateProductionInput) {
  const { materials, ...productionData } = data

  // Generate production number
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const prefix = data.productionType === 'in_house' ? 'PRD' : 'JWK'

  const lastProduction = await prisma.production.findFirst({
    where: {
      tenantId,
      productionNumber: { startsWith: `${prefix}-${year}${month}` },
    },
    orderBy: { productionNumber: 'desc' },
  })

  let sequence = 1
  if (lastProduction) {
    const lastSequence = parseInt(lastProduction.productionNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  const productionNumber = `${prefix}-${year}${month}-${sequence.toString().padStart(4, '0')}`

  return prisma.production.create({
    data: {
      ...productionData,
      tenantId,
      productionNumber,
      productionType: data.productionType as ProductionType,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdById: userId,
      materials: materials ? {
        create: materials.map((m) => ({
          productId: m.productId,
          quantity: m.quantity,
          batchId: m.batchId,
        })),
      } : undefined,
    },
    include: {
      createdBy: true,
      materials: {
        include: { product: true },
      },
    },
  })
}

export async function updateProductionStatus(
  id: string,
  tenantId: string,
  status: ProductionStatus
) {
  const production = await prisma.production.findFirst({
    where: { id, tenantId },
    include: { materials: true },
  })

  if (!production) {
    throw new Error('Production not found')
  }

  return prisma.$transaction(async (tx) => {
    // If completing production, update stock ledger
    if (status === ProductionStatus.completed && production.status !== ProductionStatus.completed) {
      // Record materials consumed
      for (const material of production.materials) {
        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: material.productId,
            batchId: material.batchId,
            movementType: MovementType.production_out,
            quantity: -material.quantity,
            referenceId: production.id,
            referenceType: 'production',
          },
        })

        // Update batch quantity if specified
        if (material.batchId) {
          await tx.inventoryBatch.update({
            where: { id: material.batchId },
            data: {
              quantity: { decrement: material.quantity },
            },
          })
        }
      }

      // Record output product if specified
      if (production.outputProductId && production.outputQuantity) {
        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: production.outputProductId,
            movementType: MovementType.production_in,
            quantity: production.outputQuantity,
            referenceId: production.id,
            referenceType: 'production',
          },
        })
      }
    }

    return tx.production.update({
      where: { id },
      data: { status },
    })
  })
}

export async function issueRawMaterials(tenantId: string, data: RMIssuanceInput) {
  const po = await prisma.purchaseOrder.findFirst({
    where: {
      id: data.purchaseOrderId,
      tenantId,
      rawMaterialMode: 'raw_materials_issued',
      status: { in: ['approved', 'approved_pending_rm_issuance'] },
    },
  })

  if (!po) {
    throw new Error('Purchase order not found or not eligible for RM issuance')
  }

  // Generate issuance number
  const issuanceNumber = `RMI-${po.poNumber}-${Date.now().toString().slice(-6)}`

  return prisma.$transaction(async (tx) => {
    const issuance = await tx.pORmIssuance.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        issuanceNumber,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            batchId: item.batchId,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    })

    // Create stock ledger entries and update batches
    for (const item of data.items) {
      await tx.stockLedger.create({
        data: {
          tenantId,
          productId: item.productId,
          batchId: item.batchId,
          movementType: MovementType.rm_issued_to_vendor,
          quantity: -item.quantity,
          referenceId: issuance.id,
          referenceType: 'rm_issuance',
        },
      })

      if (item.batchId) {
        await tx.inventoryBatch.update({
          where: { id: item.batchId },
          data: {
            quantity: { decrement: item.quantity },
          },
        })
      }
    }

    // Update PO status
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'rm_issued_pending_goods' },
    })

    return issuance
  })
}
