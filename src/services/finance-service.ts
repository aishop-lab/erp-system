import { prisma } from '@/lib/prisma'
import { PaymentStatus, POStatus } from '@prisma/client'
import type { CreatePaymentInput, ExecutePaymentInput } from '@/validators/payment'

export async function getPayments(tenantId: string, params?: {
  search?: string
  status?: PaymentStatus
  supplierId?: string
  entityId?: string
  page?: number
  pageSize?: number
}) {
  const { search, status, supplierId, entityId, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(status && { status }),
    ...(supplierId && { supplierId }),
    ...(entityId && { entityId }),
    ...(search && {
      OR: [
        { paymentNumber: { contains: search, mode: 'insensitive' as const } },
        { purchaseOrder: { poNumber: { contains: search, mode: 'insensitive' as const } } },
        { supplier: { name: { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        purchaseOrder: {
          select: { id: true, poNumber: true, purchaseType: true, grandTotal: true },
        },
        supplier: {
          select: { id: true, code: true, name: true },
        },
        entity: {
          select: { id: true, name: true },
        },
        paymentMode: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
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
          lineItems: true,
          grns: {
            select: { id: true, grnNumber: true, grnDate: true },
          },
        },
      },
      supplier: true,
      entity: {
        include: {
          paymentModes: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      },
      paymentMode: true,
      externalVendor: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      executedBy: { select: { id: true, name: true } },
    },
  })
}

export async function createPayment(tenantId: string, userId: string, data: CreatePaymentInput) {
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
    where: {
      id,
      tenantId,
      status: { in: [PaymentStatus.pending, PaymentStatus.pending_approval] },
    },
  })

  if (!payment) {
    throw new Error('Payment not found or not pending approval')
  }

  return prisma.$transaction(async (tx) => {
    const newStatus = action === 'approve'
      ? PaymentStatus.approved
      : PaymentStatus.rejected

    const updatedPayment = await tx.payment.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: action === 'approve' ? userId : null,
        approvedAt: action === 'approve' ? new Date() : null,
        rejectionReason: action === 'reject' ? reason : null,
      },
    })

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

    // Update PO status based on action
    if (payment.purchaseOrderId) {
      if (action === 'approve') {
        await tx.purchaseOrder.update({
          where: { id: payment.purchaseOrderId },
          data: { status: POStatus.payment_approved },
        })
      }
      // If rejected, PO stays at payment_pending for re-reconciliation
    }

    return updatedPayment
  })
}

export async function executePayment(
  id: string,
  tenantId: string,
  userId: string,
  data: ExecutePaymentInput
) {
  const payment = await prisma.payment.findFirst({
    where: { id, tenantId, status: PaymentStatus.approved },
  })

  if (!payment) {
    throw new Error('Payment not found or not approved for execution')
  }

  const netAmount = data.amountPaid - (data.tdsDeducted || 0)

  return prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id },
      data: {
        paymentModeId: data.paymentModeId,
        transactionReference: data.transactionReference,
        amountPaid: data.amountPaid,
        tdsDeducted: data.tdsDeducted || 0,
        netAmountPaid: netAmount,
        paymentProof: data.paymentProof,
        invoiceAttachment: data.invoiceAttachment || undefined,
        executionRemarks: data.remarks,
        executedById: userId,
        executedAt: new Date(),
        status: PaymentStatus.executed,
      },
    })

    // Close the PO
    if (payment.purchaseOrderId) {
      await tx.purchaseOrder.update({
        where: { id: payment.purchaseOrderId },
        data: { status: POStatus.paid },
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
