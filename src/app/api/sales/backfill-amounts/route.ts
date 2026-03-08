import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/api-auth'

/**
 * POST /api/sales/backfill-amounts
 * Backfills totalAmount for orders that have 0 amount but have items with prices.
 * One-time fix for orders synced before item-based total computation was added.
 */
export async function POST() {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const tenantId = auth.user.tenantId

    // Find orders with 0 totalAmount that have items
    const zeroOrders = await prisma.salesOrder.findMany({
      where: {
        tenantId,
        totalAmount: 0,
      },
      select: { id: true, orderNumber: true },
    })

    let updated = 0

    for (const order of zeroOrders) {
      const itemsTotal = await prisma.salesOrderItem.aggregate({
        where: { orderId: order.id },
        _sum: { total: true },
      })

      const computed = Number(itemsTotal._sum.total || 0)
      if (computed > 0) {
        await prisma.salesOrder.update({
          where: { id: order.id },
          data: { totalAmount: computed, subtotal: computed },
        })
        updated++
      }
    }

    return NextResponse.json({
      message: `Backfilled ${updated} of ${zeroOrders.length} zero-amount orders`,
      totalZeroOrders: zeroOrders.length,
      updated,
    })
  } catch (error: any) {
    console.error('Error backfilling amounts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
