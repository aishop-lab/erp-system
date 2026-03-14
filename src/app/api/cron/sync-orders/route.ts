import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncAmazonOrders } from '@/lib/amazon/orders'

/**
 * Cron job: Sync orders from Amazon every 4 hours.
 * Triggered by Vercel Cron.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fix #7: Prevent concurrent syncs
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
  const runningSync = await prisma.syncLog.findFirst({
    where: { syncType: 'amazon_orders', status: 'running', startedAt: { gte: thirtyMinAgo } },
  })
  if (runningSync) {
    return NextResponse.json({ message: 'Sync already in progress', syncLogId: runningSync.id })
  }

  try {
    // Get all tenants with active Amazon platforms
    const platforms = await prisma.salesPlatform.findMany({
      where: { name: 'amazon', isActive: true },
      select: { tenantId: true },
    })

    const results = []

    for (const platform of platforms) {
      try {
        const result = await syncAmazonOrders(platform.tenantId, 3) // Last 3 days
        results.push({ tenantId: platform.tenantId, ...result })
      } catch (err: any) {
        results.push({ tenantId: platform.tenantId, status: 'failed', errorMessage: err.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Cron sync-orders error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
