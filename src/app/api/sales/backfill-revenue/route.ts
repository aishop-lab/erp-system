import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/api-auth'

/**
 * POST /api/sales/backfill-revenue
 * Creates SalesRevenue records for orders that don't have one.
 * Fixes the dashboard graph missing data for orders imported before
 * the sync process started creating revenue records.
 */
export async function POST() {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const tenantId = auth.user.tenantId

    // Find orders missing a SalesRevenue record
    const ordersWithoutRevenue = await prisma.salesOrder.findMany({
      where: {
        tenantId,
        salesRevenue: { is: null },
      },
      select: {
        id: true,
        orderNumber: true,
        platformId: true,
        totalAmount: true,
        orderedAt: true,
      },
    })

    let created = 0
    let skipped = 0

    for (const order of ordersWithoutRevenue) {
      const grossRevenue = Number(order.totalAmount || 0)

      // Skip orders with no amount and no date
      if (!order.orderedAt) {
        skipped++
        continue
      }

      try {
        await prisma.salesRevenue.create({
          data: {
            tenantId,
            orderId: order.id,
            platformId: order.platformId,
            grossRevenue,
            netRevenue: grossRevenue,
            date: order.orderedAt,
          },
        })
        created++
      } catch {
        // Unique constraint violation — already exists
        skipped++
      }
    }

    return NextResponse.json({
      message: `Created ${created} revenue records (${skipped} skipped)`,
      totalMissing: ordersWithoutRevenue.length,
      created,
      skipped,
    })
  } catch (error: any) {
    console.error('Error backfilling revenue:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
