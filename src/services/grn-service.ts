import { prisma } from '@/lib/prisma'
import { POStatus, GoodsCondition } from '@prisma/client'
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
            grnLineItems: {
              select: { receivedQty: true },
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

  // Add remaining quantity info (computed from GRNLineItem aggregation)
  const data = purchaseOrders.map(po => ({
    ...po,
    lineItems: po.lineItems.map(item => {
      const receivedQty = item.grnLineItems.reduce((sum, g) => sum + g.receivedQty, 0)
      return {
        ...item,
        receivedQty,
        remainingQty: Number(item.quantity) - receivedQty,
      }
    }),
    hasRemainingItems: po.lineItems.some(item => {
      const received = item.grnLineItems.reduce((sum, g) => sum + g.receivedQty, 0)
      return Number(item.quantity) > received
    }),
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

  // Calculate remaining quantities per line item from GRNLineItem aggregation
  const lineItems = po.lineItems.map(item => {
    const totalReceived = item.grnLineItems.reduce(
      (sum, grn) => sum + grn.receivedQty, 0
    )
    return {
      id: item.id,
      productId: item.productId,
      productType: item.productType,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      receivedQty: totalReceived,
      remainingQty: Number(item.quantity) - totalReceived,
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
      lineItems: {
        include: {
          grnLineItems: {
            select: { receivedQty: true },
          },
        },
      },
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

    const previouslyReceived = poLine.grnLineItems.reduce((sum, g) => sum + g.receivedQty, 0)
    const remaining = Number(poLine.quantity) - previouslyReceived
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
        poNumber: po.poNumber,
        supplierId: po.supplierId || undefined,
        grnDate: new Date(),
        receivedBy: 'System',
        deliveryChallan: null,
        vehicleNumber: null,
        status: 'completed',
        notes,
        createdBy: userId,
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

    // 2. Create inventory batches and stock ledger entries for accepted items
    const createdBatches: Array<{
      id: string
      sku: string | null
      productType: string | null
      productId: string | null
      batchNumber: string
      initialQty: number
      createdAt: Date
    }> = []

    for (const item of lineItems) {
      if (item.acceptedQty <= 0) continue

      const poLine = po.lineItems.find(li => li.id === item.poLineItemId)!
      if (!poLine.productId) continue

      const batchNumber = item.batchNumber || grnNumber

      // Fetch SKU based on product type
      let sku: string | null = null
      if (poLine.productType === 'fabric') {
        const fabric = await tx.fabric.findUnique({
          where: { id: poLine.productId },
          select: { fabricSku: true }
        })
        sku = fabric?.fabricSku || null
      } else if (poLine.productType === 'raw_material') {
        const rawMaterial = await tx.rawMaterial.findUnique({
          where: { id: poLine.productId },
          select: { rmSku: true }
        })
        sku = rawMaterial?.rmSku || null
      } else if (poLine.productType === 'packaging') {
        const packaging = await tx.packaging.findUnique({
          where: { id: poLine.productId },
          select: { pkgSku: true }
        })
        sku = packaging?.pkgSku || null
      } else if (poLine.productType === 'finished') {
        const finished = await tx.finishedProduct.findUnique({
          where: { id: poLine.productId },
          select: { childSku: true }
        })
        sku = finished?.childSku || null
      }

      // Create inventory batch
      const batch = await tx.inventoryBatch.create({
        data: {
          tenantId,
          productId: poLine.productId,
          productType: poLine.productType,
          sku,
          batchNumber,
          grnId: grn.id,
          initialQty: item.acceptedQty,
          currentQty: item.acceptedQty,
          status: 'active',
        },
      })

      createdBatches.push({
        id: batch.id,
        sku,
        productType: poLine.productType,
        productId: poLine.productId,
        batchNumber,
        initialQty: item.acceptedQty,
        createdAt: batch.createdAt,
      })

      // Stock ledger entry
      await tx.stockLedger.create({
        data: {
          tenantId,
          productId: poLine.productId,
          productType: poLine.productType,
          sku,
          batchId: batch.id,
          batchNumber,
          movementType: 'grn',
          referenceType: 'grn',
          referenceId: grn.id,
          referenceNumber: grnNumber,
          qtyIn: item.acceptedQty,
          qtyOut: 0,
          batchBalance: item.acceptedQty,
          skuBalance: item.acceptedQty,
          notes: `GRN ${grnNumber} - Accepted ${item.acceptedQty} units`,
          createdBy: userId,
        },
      })
    }

    // 3. Determine new PO status by aggregating GRNLineItems for all PO line items
    const allPoLineItems = await tx.pOLineItem.findMany({
      where: { poId: purchaseOrderId },
      include: {
        grnLineItems: {
          select: { receivedQty: true },
        },
      },
    })

    const allFullyReceived = allPoLineItems.every(li => {
      const totalReceived = li.grnLineItems.reduce((sum, g) => sum + g.receivedQty, 0)
      return totalReceived >= Number(li.quantity)
    })
    const someReceived = allPoLineItems.some(li => {
      const totalReceived = li.grnLineItems.reduce((sum, g) => sum + g.receivedQty, 0)
      return totalReceived > 0
    })

    let newPOStatus: POStatus
    if (allFullyReceived) {
      newPOStatus = POStatus.goods_received
    } else if (someReceived) {
      newPOStatus = POStatus.partially_received
    } else {
      newPOStatus = po.status
    }

    if (newPOStatus !== po.status) {
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newPOStatus },
      })
    }

    return { grn, createdBatches }
  })

  // Enrich batches with product details for barcode printing
  const batchesWithDetails = await Promise.all(
    result.createdBatches.map(async (batch) => {
      let productDetails: Record<string, unknown> | null = null

      if (batch.productId) {
        switch (batch.productType) {
          case 'fabric':
            productDetails = await prisma.fabric.findUnique({
              where: { id: batch.productId },
              select: { material: true, color: true, design: true, work: true },
            })
            break
          case 'raw_material':
            productDetails = await prisma.rawMaterial.findUnique({
              where: { id: batch.productId },
              select: { rmType: true, color: true },
            })
            break
          case 'packaging':
            productDetails = await prisma.packaging.findUnique({
              where: { id: batch.productId },
              select: { pkgType: true, dimensions: true },
            })
            break
          case 'finished':
            productDetails = await prisma.finishedProduct.findUnique({
              where: { id: batch.productId },
              select: { title: true, size: true, color: true, mrp: true },
            })
            break
        }
      }

      return { ...batch, productDetails }
    })
  )

  // Return full GRN with relations + batch details for barcode labels
  const grnData = await getGRNById(result.grn.id, tenantId)
  return { ...grnData, inventoryBatches: batchesWithDetails }
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
        user: {
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

  // Map user → createdBy for API consistency
  const data = grns.map(grn => ({
    ...grn,
    createdByUser: grn.user,
  }))

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getGRNById(id: string, tenantId: string) {
  const grn = await prisma.gRN.findFirst({
    where: { id, tenantId },
    include: {
      purchaseOrder: {
        include: {
          supplier: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      user: {
        select: { id: true, name: true },
      },
      lineItems: {
        include: {
          poLineItem: true,
        },
      },
    },
  })

  if (!grn) return null

  // Map user → createdByUser for API consistency
  return {
    ...grn,
    createdByUser: grn.user,
  }
}
