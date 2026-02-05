import { prisma } from '@/lib/prisma'
import { MovementType, GoodsCondition } from '@prisma/client'
import type { CreateGRNInput } from '@/validators/grn'

export async function getInventoryStock(tenantId: string, params?: {
  search?: string
  page?: number
  pageSize?: number
}) {
  const { search, page = 1, pageSize = 10 } = params || {}

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      inventoryBatches: {
        select: {
          quantity: true,
        },
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const stockData = products.map((product) => ({
    ...product,
    totalStock: product.inventoryBatches.reduce((sum, batch) => sum + batch.quantity, 0),
  }))

  return {
    data: stockData,
    page,
    pageSize,
  }
}

export async function getStockLedger(tenantId: string, params?: {
  productId?: string
  movementType?: MovementType
  page?: number
  pageSize?: number
}) {
  const { productId, movementType, page = 1, pageSize = 20 } = params || {}

  const where = {
    tenantId,
    ...(productId && { productId }),
    ...(movementType && { movementType }),
  }

  const [entries, total] = await Promise.all([
    prisma.stockLedger.findMany({
      where,
      include: {
        product: true,
        inventoryBatch: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockLedger.count({ where }),
  ])

  return {
    data: entries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function createGRN(tenantId: string, userId: string, data: CreateGRNInput) {
  const { lineItems, ...grnData } = data

  // Verify PO exists and is in correct status
  const po = await prisma.purchaseOrder.findFirst({
    where: {
      id: data.purchaseOrderId,
      tenantId,
      status: { in: ['approved', 'partially_received', 'rm_issued_pending_goods'] },
    },
    include: {
      lineItems: true,
    },
  })

  if (!po) {
    throw new Error('Purchase order not found or not ready for goods receipt')
  }

  // Generate GRN number
  const lastGRN = await prisma.gRN.findFirst({
    where: { tenantId },
    orderBy: { grnNumber: 'desc' },
  })

  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  let sequence = 1

  if (lastGRN && lastGRN.grnNumber.includes(`GRN-${year}${month}`)) {
    const lastSequence = parseInt(lastGRN.grnNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  const grnNumber = `GRN-${year}${month}-${sequence.toString().padStart(4, '0')}`

  return prisma.$transaction(async (tx) => {
    // Create GRN
    const grn = await tx.gRN.create({
      data: {
        tenantId,
        grnNumber,
        purchaseOrderId: data.purchaseOrderId,
        notes: grnData.notes,
        createdById: userId,
        lineItems: {
          create: lineItems.map((item) => ({
            poLineItemId: item.poLineItemId,
            receivedQty: item.receivedQty,
            acceptedQty: item.acceptedQty,
            rejectedQty: item.rejectedQty || 0,
            condition: (item.condition as GoodsCondition) || GoodsCondition.good,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            notes: item.notes,
          })),
        },
      },
      include: {
        lineItems: true,
      },
    })

    // Update PO line items received quantities
    for (const item of lineItems) {
      await tx.pOLineItem.update({
        where: { id: item.poLineItemId },
        data: {
          receivedQty: { increment: item.acceptedQty },
        },
      })
    }

    // Create or update inventory batches and stock ledger entries
    for (const item of lineItems) {
      const poLineItem = po.lineItems.find((li) => li.id === item.poLineItemId)
      if (!poLineItem || item.acceptedQty <= 0) continue

      const batchNumber = item.batchNumber || `${grnNumber}-${item.poLineItemId.slice(-4)}`

      // Create or update inventory batch
      const existingBatch = await tx.inventoryBatch.findFirst({
        where: {
          tenantId,
          productId: poLineItem.productId,
          batchNumber,
        },
      })

      if (existingBatch) {
        await tx.inventoryBatch.update({
          where: { id: existingBatch.id },
          data: {
            quantity: { increment: item.acceptedQty },
          },
        })
      } else {
        await tx.inventoryBatch.create({
          data: {
            tenantId,
            productId: poLineItem.productId,
            batchNumber,
            quantity: item.acceptedQty,
            costPrice: poLineItem.unitPrice,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          },
        })
      }

      // Create stock ledger entry
      await tx.stockLedger.create({
        data: {
          tenantId,
          productId: poLineItem.productId,
          movementType: MovementType.grn,
          quantity: item.acceptedQty,
          referenceId: grn.id,
          referenceType: 'grn',
        },
      })
    }

    // Check if all items are fully received
    const updatedPO = await tx.purchaseOrder.findFirst({
      where: { id: po.id },
      include: { lineItems: true },
    })

    const allReceived = updatedPO?.lineItems.every(
      (item) => item.receivedQty >= item.quantity
    )

    // Update PO status
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: allReceived ? 'goods_received' : 'partially_received',
      },
    })

    return grn
  })
}

export async function getGRNs(tenantId: string, params?: {
  purchaseOrderId?: string
  page?: number
  pageSize?: number
}) {
  const { purchaseOrderId, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(purchaseOrderId && { purchaseOrderId }),
  }

  const [grns, total] = await Promise.all([
    prisma.gRN.findMany({
      where,
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
          },
        },
        createdBy: true,
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gRN.count({ where }),
  ])

  return {
    data: grns,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
