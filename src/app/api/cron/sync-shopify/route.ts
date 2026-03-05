import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncShopifyOrders } from '@/lib/shopify/orders'
import { syncShopifyInventory } from '@/lib/shopify/inventory'

/**
 * Cron job: Sync Shopify orders and inventory every 4 hours.
 * Triggered by Vercel Cron.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const platforms = await prisma.salesPlatform.findMany({
      where: { name: 'shopify', isActive: true },
      select: { tenantId: true },
    })

    const results = []

    for (const platform of platforms) {
      try {
        const ordersResult = await syncShopifyOrders(platform.tenantId, 3)
        const inventoryResult = await syncShopifyInventory(platform.tenantId)
        results.push({
          tenantId: platform.tenantId,
          orders: { status: ordersResult.status, processed: ordersResult.recordsProcessed },
          inventory: { status: inventoryResult.status, processed: inventoryResult.recordsProcessed },
        })
      } catch (err: any) {
        results.push({ tenantId: platform.tenantId, status: 'failed', errorMessage: err.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Cron sync-shopify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
