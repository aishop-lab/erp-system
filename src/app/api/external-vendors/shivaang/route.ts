import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { PaymentStatus } from '@prisma/client'

// GET /api/external-vendors/shivaang
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Find the Shivaang entity (type: external)
    const shivaangEntity = await prisma.entity.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        name: { contains: 'Shivaang', mode: 'insensitive' },
      },
    })

    if (!shivaangEntity) {
      return NextResponse.json({ error: 'Shivaang entity not found' }, { status: 404 })
    }

    // Fetch POs and Payments in parallel
    const [purchaseOrders, payments] = await Promise.all([
      // POs assigned to Shivaang entity (set during reconciliation)
      prisma.purchaseOrder.findMany({
        where: {
          tenantId: auth.user.tenantId,
          entityId: shivaangEntity.id,
        },
        include: {
          supplier: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { lineItems: true, freeTextItems: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // All payments routed through Shivaang entity
      prisma.payment.findMany({
        where: {
          tenantId: auth.user.tenantId,
          entityId: shivaangEntity.id,
        },
        include: {
          purchaseOrder: {
            select: { id: true, poNumber: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Calculate overview stats
    const totalOrders = purchaseOrders.length
    const pendingOrders = purchaseOrders.filter(po =>
      ['approved', 'approved_pending_rm_issuance', 'rm_issued_pending_goods',
       'partially_received', 'goods_received', 'payment_pending', 'payment_approved'].includes(po.status)
    )
    const completedOrders = purchaseOrders.filter(po => po.status === 'paid')

    const executedPayments = payments.filter(p => p.status === PaymentStatus.executed)
    const totalPaid = executedPayments.reduce((sum, p) => sum + Number(p.amountPaid || p.amount), 0)

    const pendingPaymentsList = payments.filter(p =>
      p.status === PaymentStatus.pending ||
      p.status === PaymentStatus.pending_approval ||
      p.status === PaymentStatus.approved
    )
    const pendingPaymentsAmount = pendingPaymentsList.reduce((sum, p) => sum + Number(p.amount), 0)

    // Build recent transactions: interleave POs and payments, sorted by date
    const transactions = [
      ...purchaseOrders.slice(0, 5).map(po => ({
        type: 'order' as const,
        id: po.id,
        date: po.createdAt.toISOString(),
        description: `Job Work Order ${po.poNumber}`,
        amount: Number(po.grandTotal),
        status: po.status,
      })),
      ...payments.slice(0, 5).map(p => ({
        type: 'payment' as const,
        id: p.id,
        date: p.createdAt.toISOString(),
        description: `Payment ${p.paymentNumber}${p.purchaseOrder ? ` for ${p.purchaseOrder.poNumber}` : ''}`,
        amount: Number(p.amountPaid || p.amount),
        status: p.status,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    return NextResponse.json({
      overview: {
        totalOrders,
        pendingOrders: pendingOrders.length,
        completedOrders: completedOrders.length,
        totalPaid: Math.round(totalPaid * 100) / 100,
        pendingPayments: Math.round(pendingPaymentsAmount * 100) / 100,
      },
      transactions,
      pendingOrders: pendingOrders.map(po => ({
        id: po.id,
        poNumber: po.poNumber,
        purchaseType: po.purchaseType,
        status: po.status,
        grandTotal: Number(po.grandTotal),
        createdAt: po.createdAt.toISOString(),
        supplierName: po.supplier?.name || null,
        supplierCode: po.supplier?.code || null,
        itemCount: po._count.lineItems + po._count.freeTextItems,
      })),
      paymentHistory: payments.map(p => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        poNumber: p.purchaseOrder?.poNumber || null,
        poId: p.purchaseOrder?.id || null,
        supplierName: p.supplier?.name || null,
        amount: Number(p.amount),
        amountPaid: p.amountPaid ? Number(p.amountPaid) : null,
        tdsDeducted: p.tdsDeducted ? Number(p.tdsDeducted) : null,
        netAmountPaid: p.netAmountPaid ? Number(p.netAmountPaid) : null,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        executedAt: p.executedAt?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching Shivaang data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Shivaang data' },
      { status: 500 }
    )
  }
}
