import { prisma } from '@/lib/prisma'
import { ProductionStatus, ProductionType } from '@prisma/client'
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
  status: ProductionStatus,
  userId?: string
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
      const createdBy = userId || production.createdById

      // Record materials consumed
      for (const material of production.materials) {
        // Get current batch balance for ledger entry
        let batchBalance = 0
        if (material.batchId) {
          const batch = await tx.inventoryBatch.findUnique({
            where: { id: material.batchId },
          })
          batchBalance = batch ? Number(batch.currentQty) - material.quantity : 0
        }

        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: material.productId,
            batchId: material.batchId,
            movementType: 'production_out',
            referenceType: 'production',
            referenceId: production.id,
            referenceNumber: production.productionNumber,
            qtyIn: 0,
            qtyOut: material.quantity,
            batchBalance: Math.max(batchBalance, 0),
            skuBalance: 0,
            notes: `Production ${production.productionNumber} - consumed ${material.quantity} units`,
            createdBy,
          },
        })

        // Update batch quantity if specified
        if (material.batchId) {
          await tx.inventoryBatch.update({
            where: { id: material.batchId },
            data: {
              currentQty: { decrement: material.quantity },
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
            movementType: 'production_in',
            referenceType: 'production',
            referenceId: production.id,
            referenceNumber: production.productionNumber,
            qtyIn: production.outputQuantity,
            qtyOut: 0,
            batchBalance: production.outputQuantity,
            skuBalance: production.outputQuantity,
            notes: `Production ${production.productionNumber} - produced ${production.outputQuantity} units`,
            createdBy,
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

export async function issueRawMaterials(tenantId: string, userId: string, data: RMIssuanceInput) {
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
      let batchBalance = 0
      if (item.batchId) {
        const batch = await tx.inventoryBatch.findUnique({
          where: { id: item.batchId },
        })
        batchBalance = batch ? Number(batch.currentQty) - item.quantity : 0
      }

      await tx.stockLedger.create({
        data: {
          tenantId,
          productId: item.productId,
          batchId: item.batchId,
          movementType: 'rm_issued_to_vendor',
          referenceType: 'rm_issuance',
          referenceId: issuance.id,
          referenceNumber: issuanceNumber,
          qtyIn: 0,
          qtyOut: item.quantity,
          batchBalance: Math.max(batchBalance, 0),
          skuBalance: 0,
          notes: `RM Issuance ${issuanceNumber} - issued ${item.quantity} units`,
          createdBy: userId,
        },
      })

      if (item.batchId) {
        await tx.inventoryBatch.update({
          where: { id: item.batchId },
          data: {
            currentQty: { decrement: item.quantity },
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
