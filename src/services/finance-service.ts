import { prisma } from '@/lib/prisma'
import { PaymentStatus } from '@prisma/client'
import type { CreatePaymentInput } from '@/validators/payment'

export async function getPayments(tenantId: string, params?: {
  status?: PaymentStatus
  supplierId?: string
  entityId?: string
  page?: number
  pageSize?: number
}) {
  const { status, supplierId, entityId, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(status && { status }),
    ...(supplierId && { supplierId }),
    ...(entityId && { entityId }),
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        purchaseOrder: true,
        supplier: true,
        entity: true,
        paymentMode: true,
        externalVendor: true,
        createdBy: true,
        approvedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ])

  return {
    data: payments,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getPaymentById(id: string, tenantId: string) {
  return prisma.payment.findFirst({
    where: { id, tenantId },
    include: {
      purchaseOrder: {
        include: {
          supplier: true,
          entity: true,
        },
      },
      supplier: true,
      entity: true,
      paymentMode: true,
      externalVendor: true,
      createdBy: true,
      approvedBy: true,
    },
  })
}

export async function createPayment(tenantId: string, userId: string, data: CreatePaymentInput) {
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

  return prisma.payment.create({
    data: {
      tenantId,
      paymentNumber,
      purchaseOrderId: data.purchaseOrderId,
      supplierId: data.supplierId,
      entityId: data.entityId,
      paymentModeId: data.paymentModeId,
      externalVendorId: data.externalVendorId,
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      status: PaymentStatus.pending,
      reference: data.reference,
      notes: data.notes,
      createdById: userId,
    },
    include: {
      purchaseOrder: true,
      supplier: true,
      entity: true,
      paymentMode: true,
      createdBy: true,
    },
  })
}

export async function approvePayment(
  id: string,
  tenantId: string,
  userId: string,
  action: 'approve' | 'reject',
  reason?: string
) {
  const payment = await prisma.payment.findFirst({
    where: { id, tenantId, status: PaymentStatus.pending },
  })

  if (!payment) {
    throw new Error('Payment not found or not pending approval')
  }

  return prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id },
      data: {
        status: action === 'approve' ? PaymentStatus.paid : PaymentStatus.pending,
        approvedById: action === 'approve' ? userId : null,
        approvedAt: action === 'approve' ? new Date() : null,
      },
    })

    // Log the approval action
    await tx.approvalAuditLog.create({
      data: {
        tenantId,
        approvalType: 'payment_approval',
        referenceId: id,
        action: action === 'approve' ? 'approved' : 'rejected',
        userId,
        reason,
      },
    })

    // If payment approved and linked to PO, update PO status
    if (action === 'approve' && payment.purchaseOrderId) {
      await tx.purchaseOrder.update({
        where: { id: payment.purchaseOrderId },
        data: { status: 'paid' },
      })
    }

    return updatedPayment
  })
}

export async function getMarketplaceSettlements(tenantId: string, params?: {
  salesChannelId?: string
  page?: number
  pageSize?: number
}) {
  const { salesChannelId, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(salesChannelId && { salesChannelId }),
  }

  const [settlements, total] = await Promise.all([
    prisma.marketplaceSettlement.findMany({
      where,
      include: {
        salesChannel: true,
      },
      orderBy: { settlementDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.marketplaceSettlement.count({ where }),
  ])

  return {
    data: settlements,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getEntities(tenantId: string) {
  return prisma.entity.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' },
  })
}

export async function getPaymentModes(entityId: string) {
  return prisma.paymentMode.findMany({
    where: { entityId, isActive: true },
    orderBy: { name: 'asc' },
  })
}
