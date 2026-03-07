import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncAmazonOrders } from '@/lib/amazon/orders'

/**
 * GET /api/cron/backfill-orders?days=60
 * One-time backfill to sync older Amazon orders that were missed.
 * Auth via CRON_SECRET (same as other cron jobs).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const isAuthed = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    querySecret === process.env.CRON_SECRET
  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const daysBack = Number(request.nextUrl.searchParams.get('days') || '60')

  try {
    const platforms = await prisma.salesPlatform.findMany({
      where: { name: 'amazon', isActive: true },
      select: { tenantId: true },
    })

    const results = []
    for (const platform of platforms) {
      try {
        const result = await syncAmazonOrders(platform.tenantId, daysBack)
        results.push({ tenantId: platform.tenantId, ...result })
      } catch (err: any) {
        results.push({ tenantId: platform.tenantId, status: 'failed', errorMessage: err.message })
      }
    }

    return NextResponse.json({ success: true, daysBack, results })
  } catch (error: any) {
    console.error('Backfill orders error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
