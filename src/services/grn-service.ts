import { prisma } from '@/lib/prisma'
import { POStatus, MovementType, GoodsCondition } from '@prisma/client'
import type { CreateGRNInput } from '@/validators/grn'

export async function generateGRNNumber(tenantId: string) {
  const year = new Date().getFullYear()

  const lastGRN = await prisma.gRN.findFirst({
    where: {
      tenantId,
      grnNumber: {
        startsWith: `GRN-${year}`,
      },
    },
    orderBy: { grnNumber: 'desc' },
  })

  let sequence = 1
  if (lastGRN) {
    const lastSequence = parseInt(lastGRN.grnNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  return `GRN-${year}-${sequence.toString().padStart(4, '0')}`
}

export async function getEligiblePOs(tenantId: string, params?: {
  search?: string
  page?: number
  pageSize?: number
}) {
  const { search, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    status: {
      in: [POStatus.approved, POStatus.partially_received, POStatus.rm_issued_pending_goods] as POStatus[],
    },
    // Only catalog-based POs have line items for GRN
    lineItems: {
      some: {},
    },
    ...(search && {
      OR: [
        { poNumber: { contains: search, mode: 'insensitive' as const } },
        { supplier: { name: { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
        lineItems: {
          include: {
            product: {
              select: { id: true, sku: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  // Add remaining quantity info
  const data = purchaseOrders.map(po => ({
    ...po,
    lineItems: po.lineItems.map(item => ({
      ...item,
      remainingQty: item.quantity - item.receivedQty,
    })),
    hasRemainingItems: po.lineItems.some(item => item.quantity > item.receivedQty),
  }))

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getPOForGRN(poId: string, tenantId: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: {
      id: poId,
      tenantId,
      status: {
        in: [POStatus.approved, POStatus.partially_received, POStatus.rm_issued_pending_goods],
      },
    },
    include: {
      supplier: {
        select: { id: true, code: true, name: true },
      },
      lineItems: {
        include: {
          product: {
            select: { id: true, sku: true, name: true },
          },
          grnLineItems: {
            select: {
              receivedQty: true,
              acceptedQty: true,
              rejectedQty: true,
            },
          },
        },
      },
    },
  })

  if (!po) return null

  // Calculate remaining quantities per line item
  const lineItems = po.lineItems.map(item => {
    const totalReceived = item.grnLineItems.reduce(
      (sum, grn) => sum + grn.receivedQty, 0
    )
    return {
      id: item.id,
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      receivedQty: totalReceived,
      remainingQty: item.quantity - totalReceived,
    }
  })

  return {
    id: po.id,
    poNumber: po.poNumber,
    purchaseType: po.purchaseType,
    status: po.status,
    supplier: po.supplier,
    lineItems: lineItems.filter(item => item.remainingQty > 0),
    allLineItems: lineItems,
  }
}

export async function createGRN(
  tenantId: string,
  userId: string,
  data: CreateGRNInput
) {
  const { purchaseOrderId, notes, lineItems } = data

  // Validate PO exists and is eligible
  const po = await prisma.purchaseOrder.findFirst({
    where: {
      id: purchaseOrderId,
      tenantId,
      status: {
        in: [POStatus.approved, POStatus.partially_received, POStatus.rm_issued_pending_goods],
      },
    },
    include: {
      lineItems: true,
    },
  })

  if (!po) {
    throw new Error('Purchase order not found or not eligible for GRN')
  }

  // Validate line items against PO
  for (const item of lineItems) {
    const poLine = po.lineItems.find(li => li.id === item.poLineItemId)
    if (!poLine) {
      throw new Error(`PO line item ${item.poLineItemId} not found`)
    }

    const remaining = poLine.quantity - poLine.receivedQty
    if (item.receivedQty > remaining) {
      throw new Error(
        `Received qty (${item.receivedQty}) exceeds remaining qty (${remaining}) for item ${poLine.id}`
      )
    }

    if (item.acceptedQty + item.rejectedQty > item.receivedQty) {
      throw new Error(
        `Accepted (${item.acceptedQty}) + Rejected (${item.rejectedQty}) cannot exceed Received (${item.receivedQty})`
      )
    }
  }

  const grnNumber = await generateGRNNumber(tenantId)

  // Execute in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create GRN with line items
    const grn = await tx.gRN.create({
      data: {
        tenantId,
        grnNumber,
        purchaseOrderId,
        notes,
        createdById: userId,
        lineItems: {
          create: lineItems.map(item => ({
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

    // 2. Update PO line item receivedQty values
    for (const item of lineItems) {
      await tx.pOLineItem.update({
        where: { id: item.poLineItemId },
        data: {
          receivedQty: {
            increment: item.receivedQty,
          },
        },
      })
    }

    // 3. Create inventory batches and stock ledger entries for accepted items
    for (const item of lineItems) {
      if (item.acceptedQty <= 0) continue

      const poLine = po.lineItems.find(li => li.id === item.poLineItemId)!
      const batchNumber = item.batchNumber || grnNumber

      // Upsert inventory batch (may receive same product in multiple GRNs)
      const batch = await tx.inventoryBatch.upsert({
        where: {
          tenantId_productId_batchNumber: {
            tenantId,
            productId: poLine.productId,
            batchNumber,
          },
        },
        update: {
          quantity: {
            increment: item.acceptedQty,
          },
        },
        create: {
          tenantId,
          productId: poLine.productId,
          batchNumber,
          quantity: item.acceptedQty,
          costPrice: poLine.unitPrice,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        },
      })

      // Stock ledger entry
      await tx.stockLedger.create({
        data: {
          tenantId,
          productId: poLine.productId,
          batchId: batch.id,
          movementType: MovementType.grn,
          quantity: item.acceptedQty,
          referenceId: grn.id,
          referenceType: 'grn',
          notes: `GRN ${grnNumber} - Accepted ${item.acceptedQty} units`,
        },
      })
    }

    // 4. Determine new PO status
    const updatedPOLineItems = await tx.pOLineItem.findMany({
      where: { purchaseOrderId },
    })

    const allFullyReceived = updatedPOLineItems.every(
      li => li.receivedQty >= li.quantity
    )
    const someReceived = updatedPOLineItems.some(li => li.receivedQty > 0)

    let newPOStatus: POStatus
    if (allFullyReceived) {
      newPOStatus = POStatus.goods_received
    } else if (someReceived) {
      newPOStatus = POStatus.partially_received
    } else {
      newPOStatus = po.status // Keep current status (shouldn't reach here)
    }

    if (newPOStatus !== po.status) {
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newPOStatus },
      })
    }

    return grn
  })

  // Return full GRN with relations
  return getGRNById(result.id, tenantId)
}

export async function getGRNs(tenantId: string, params?: {
  search?: string
  poId?: string
  page?: number
  pageSize?: number
}) {
  const { search, poId, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(poId && { purchaseOrderId: poId }),
    ...(search && {
      OR: [
        { grnNumber: { contains: search, mode: 'insensitive' as const } },
        { purchaseOrder: { poNumber: { contains: search, mode: 'insensitive' as const } } },
        { purchaseOrder: { supplier: { name: { contains: search, mode: 'insensitive' as const } } } },
      ],
    }),
  }

  const [grns, total] = await Promise.all([
    prisma.gRN.findMany({
      where,
      include: {
        purchaseOrder: {
          include: {
            supplier: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { lineItems: true },
        },
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

export async function getGRNById(id: string, tenantId: string) {
  return prisma.gRN.findFirst({
    where: { id, tenantId },
    include: {
      purchaseOrder: {
        include: {
          supplier: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true },
      },
      lineItems: {
        include: {
          poLineItem: {
            include: {
              product: {
                select: { id: true, sku: true, name: true },
              },
            },
          },
        },
      },
    },
  })
}
