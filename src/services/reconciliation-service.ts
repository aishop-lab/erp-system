import { prisma } from '@/lib/prisma'
import { POStatus, PaymentStatus } from '@prisma/client'
import type { SubmitReconciliationInput } from '@/validators/reconciliation'

export async function getPOsForReconciliation(tenantId: string, params?: {
  search?: string
  page?: number
  pageSize?: number
}) {
  const { search, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    status: POStatus.goods_received,
    reconciledAt: null,
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
        grns: {
          select: { id: true, grnNumber: true, grnDate: true },
        },
        lineItems: {
          include: {
            grnLineItems: {
              select: { acceptedQty: true },
            },
          },
        },
        freeTextItems: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  // Calculate GRN totals for each PO
  const data = purchaseOrders.map(po => {
    const grnTotal = po.lineItems.reduce((sum: number, item: any) => {
      const acceptedQty = item.grnLineItems.reduce((s: number, g: any) => s + g.acceptedQty, 0)
      return sum + acceptedQty * Number(item.unitPrice) * (1 + Number(item.taxRate) / 100)
    }, 0)

    return {
      ...po,
      grnTotal: Math.round(grnTotal * 100) / 100,
      variance: Math.round((Number(po.grandTotal) - grnTotal) * 100) / 100,
    }
  })

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getPOForReconciliation(poId: string, tenantId: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: {
      id: poId,
      tenantId,
      status: POStatus.goods_received,
    },
    include: {
      supplier: true,
      entity: true,
      createdBy: { select: { id: true, name: true } },
      lineItems: {
        include: {
          grnLineItems: {
            select: {
              receivedQty: true,
              acceptedQty: true,
              rejectedQty: true,
              condition: true,
            },
          },
        },
      },
      freeTextItems: true,
      refundItems: true,
      grns: {
        include: {
          user: { select: { id: true, name: true } },
          lineItems: {
            include: {
              poLineItem: true,
            },
          },
        },
      },
    },
  })

  if (!po) return null

  // Calculate three-way match data
  const lineItemsWithGRN = (po.lineItems as any[]).map((item: any) => {
    const totalAccepted = item.grnLineItems.reduce((s: number, g: any) => s + g.acceptedQty, 0)
    const totalReceived = item.grnLineItems.reduce((s: number, g: any) => s + g.receivedQty, 0)
    return {
      ...item,
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      taxAmount: Number(item.taxAmount),
      totalAmount: Number(item.totalAmount),
      totalReceived,
      totalAccepted,
    }
  })

  // Enrich line items with product names from catalog tables
  const enrichedLineItems = await Promise.all(
    lineItemsWithGRN.map(async (item: any) => {
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

  const poTotal = Number(po.grandTotal)
  const grnTotal = lineItemsWithGRN.reduce((sum: number, item: any) => {
    return sum + item.totalAccepted * item.unitPrice * (1 + item.taxRate / 100)
  }, 0)

  return {
    ...po,
    totalAmount: Number(po.totalAmount),
    taxAmount: Number(po.taxAmount),
    grandTotal: poTotal,
    lineItems: enrichedLineItems,
    grnTotal: Math.round(grnTotal * 100) / 100,
    variance: Math.round((poTotal - grnTotal) * 100) / 100,
  }
}

async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const prefix = `INV-${year}${month}`

  const lastPO = await prisma.purchaseOrder.findFirst({
    where: {
      tenantId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: 'desc' },
  })

  let sequence = 1
  if (lastPO?.invoiceNumber) {
    const lastSequence = parseInt(lastPO.invoiceNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`
}

export async function submitReconciliation(
  poId: string,
  tenantId: string,
  userId: string,
  data: SubmitReconciliationInput
) {
  // Validate PO eligibility
  const po = await prisma.purchaseOrder.findFirst({
    where: {
      id: poId,
      tenantId,
      status: POStatus.goods_received,
      reconciledAt: null,
    },
    include: { supplier: true },
  })

  if (!po) {
    throw new Error('Purchase order not found or not eligible for reconciliation')
  }

  // Validate entity belongs to tenant
  const entity = await prisma.entity.findFirst({
    where: { id: data.entityId, tenantId, isActive: true },
  })

  if (!entity) {
    throw new Error('Entity not found or inactive')
  }

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(tenantId)

  // Generate payment number
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')

  const lastPayment = await prisma.payment.findFirst({
    where: {
      tenantId,
      paymentNumber: { startsWith: `PAY-${year}${month}` },
    },
    orderBy: { paymentNumber: 'desc' },
  })

  let sequence = 1
  if (lastPayment) {
    const lastSequence = parseInt(lastPayment.paymentNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  const paymentNumber = `PAY-${year}${month}-${sequence.toString().padStart(4, '0')}`

  return prisma.$transaction(async (tx) => {
    // 1. Update PO with reconciliation data
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: {
        entityId: data.entityId,
        invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        invoiceAmount: data.invoiceAmount,
        invoiceAttachment: data.invoiceAttachment,
        grnAttachment: data.grnAttachment,
        transportCharges: data.transportCharges,
        reconciliationNotes: data.notes,
        reconciledById: userId,
        reconciledAt: new Date(),
        status: POStatus.payment_pending,
      },
    })

    // 2. Create payment record
    const payment = await tx.payment.create({
      data: {
        tenantId,
        paymentNumber,
        purchaseOrderId: poId,
        supplierId: po.supplierId,
        entityId: data.entityId,
        amount: data.invoiceAmount + (data.transportCharges || 0),
        invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        invoiceAmount: data.invoiceAmount,
        invoiceAttachment: data.invoiceAttachment,
        paymentDate: new Date(),
        status: PaymentStatus.pending_approval,
        notes: data.transportCharges
          ? `${data.notes || ''}${data.notes ? '\n' : ''}Transport/Other Charges: ₹${data.transportCharges}`
          : data.notes,
        createdById: userId,
      },
      include: {
        purchaseOrder: {
          select: { id: true, poNumber: true },
        },
        entity: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, code: true, name: true },
        },
      },
    })

    return payment
  })
}
