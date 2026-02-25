import { prisma } from '@/lib/prisma'
import { POStatus } from '@prisma/client'
import { PO_NUMBER_PREFIXES } from '@/lib/constants'
import type { CreatePurchaseOrderInput } from '@/validators/purchase-order'

export async function getPurchaseOrders(tenantId: string, params?: {
  search?: string
  status?: POStatus
  purchaseType?: string
  page?: number
  pageSize?: number
}) {
  const { search, status, purchaseType, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(status && { status }),
    ...(purchaseType && { purchaseType: purchaseType as any }),
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
        supplier: true,
        entity: true,
        createdBy: true,
        _count: {
          select: {
            lineItems: true,
            freeTextItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  return {
    data: purchaseOrders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getPurchaseOrderById(id: string, tenantId: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: {
      supplier: true,
      entity: true,
      createdBy: true,
      approvedBy: true,
      lineItems: true,
      freeTextItems: true,
      refundItems: true,
      rmIssuances: {
        include: {
          items: {
            include: {
              inventoryBatch: true,
            },
          },
        },
      },
      grns: true,
      payments: true,
    },
  })

  if (!po) return null

  // Enrich line items with product names from catalog tables
  const enrichedLineItems = await Promise.all(
    po.lineItems.map(async (item) => {
      if (!item.productId) return { ...item, productName: null, productSku: null }

      let productName: string | null = null
      let productSku: string | null = null

      try {
        switch (item.productType) {
          case 'finished': {
            const p = await prisma.finishedProduct.findUnique({
              where: { id: item.productId },
              select: { title: true, childSku: true },
            })
            productName = p?.title || null
            productSku = p?.childSku || null
            break
          }
          case 'fabric': {
            const p = await prisma.fabric.findUnique({
              where: { id: item.productId },
              select: { material: true, color: true, fabricSku: true },
            })
            productName = p ? `${p.material} - ${p.color}` : null
            productSku = p?.fabricSku || null
            break
          }
          case 'raw_material': {
            const p = await prisma.rawMaterial.findUnique({
              where: { id: item.productId },
              select: { rmType: true, color: true, rmSku: true },
            })
            productName = p ? `${p.rmType}${p.color ? ` - ${p.color}` : ''}` : null
            productSku = p?.rmSku || null
            break
          }
          case 'packaging': {
            const p = await prisma.packaging.findUnique({
              where: { id: item.productId },
              select: { pkgType: true, dimensions: true, pkgSku: true },
            })
            productName = p ? `${p.pkgType}${p.dimensions ? ` (${p.dimensions})` : ''}` : null
            productSku = p?.pkgSku || null
            break
          }
          default: {
            // Try FinishedProduct as fallback
            const p = await prisma.finishedProduct.findUnique({
              where: { id: item.productId },
              select: { title: true, childSku: true },
            }).catch(() => null)
            productName = p?.title || null
            productSku = p?.childSku || null
          }
        }
      } catch {
        // Product may have been deleted
      }

      return { ...item, productName, productSku }
    })
  )

  return { ...po, lineItems: enrichedLineItems }
}

export async function generatePONumber(tenantId: string, purchaseType: string) {
  const prefix = PO_NUMBER_PREFIXES[purchaseType] || 'PO'
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')

  const lastPO = await prisma.purchaseOrder.findFirst({
    where: {
      tenantId,
      poNumber: {
        startsWith: `${prefix}-${year}${month}`,
      },
    },
    orderBy: { poNumber: 'desc' },
  })

  let sequence = 1
  if (lastPO) {
    const lastSequence = parseInt(lastPO.poNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  return `${prefix}-${year}${month}-${sequence.toString().padStart(4, '0')}`
}

export async function createPurchaseOrder(
  tenantId: string,
  userId: string,
  data: CreatePurchaseOrderInput
) {
  const { lineItems, freeTextItems, refundItems, ...poData } = data

  const poNumber = await generatePONumber(tenantId, data.purchaseType)

  // Calculate totals
  let totalAmount = 0
  let taxAmount = 0

  if (lineItems) {
    for (const item of lineItems) {
      const itemTotal = item.quantity * item.unitPrice
      const itemTax = itemTotal * ((item.taxRate || 0) / 100)
      totalAmount += itemTotal
      taxAmount += itemTax
    }
  }

  if (freeTextItems) {
    for (const item of freeTextItems) {
      const itemTotal = (item.quantity || 1) * item.unitPrice
      const itemTax = itemTotal * ((item.taxRate || 0) / 100)
      totalAmount += itemTotal
      taxAmount += itemTax
    }
  }

  if (refundItems) {
    for (const item of refundItems) {
      totalAmount += item.amount
    }
  }

  return prisma.purchaseOrder.create({
    data: {
      ...poData,
      tenantId,
      poNumber,
      createdById: userId,
      totalAmount,
      taxAmount,
      grandTotal: totalAmount + taxAmount,
      lineItems: lineItems ? {
        create: lineItems.map((item) => ({
          productId: item.productId,
          productType: data.purchaseType,  // ✅ ADD THIS
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          taxAmount: item.quantity * item.unitPrice * ((item.taxRate || 0) / 100),
          totalAmount: item.quantity * item.unitPrice * (1 + (item.taxRate || 0) / 100),
        })),
      } : undefined,
      freeTextItems: freeTextItems ? {
        create: freeTextItems.map((item) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          taxAmount: (item.quantity || 1) * item.unitPrice * ((item.taxRate || 0) / 100),
          totalAmount: (item.quantity || 1) * item.unitPrice * (1 + (item.taxRate || 0) / 100),
        })),
      } : undefined,
      refundItems: refundItems ? {
        create: refundItems,
      } : undefined,
    },
    include: {
      supplier: true,
      entity: true,
      createdBy: true,
      lineItems: true,
      freeTextItems: true,
      refundItems: true,
    },
  })
}

export async function submitForApproval(id: string, tenantId: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId, status: POStatus.draft },
  })

  if (!po) {
    throw new Error('Purchase order not found or already submitted')
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: POStatus.pending_approval },
  })
}

export async function approvePurchaseOrder(
  id: string,
  tenantId: string,
  userId: string,
  action: 'approve' | 'reject',
  reason?: string
) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId, status: POStatus.pending_approval },
  })

  if (!po) {
    throw new Error('Purchase order not found or not pending approval')
  }

  const newStatus = action === 'approve' ? POStatus.approved : POStatus.rejected

  return prisma.$transaction([
    prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: userId,
        approvedAt: new Date(),
        rejectionReason: action === 'reject' ? reason : null,
      },
    }),
    prisma.approvalAuditLog.create({
      data: {
        tenantId,
        approvalType: 'po_approval',
        referenceId: id,
        action: action === 'approve' ? 'approved' : 'rejected',
        userId,
        reason,
      },
    }),
  ])
}