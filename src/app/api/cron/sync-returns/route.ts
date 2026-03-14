import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncAmazonReturns } from '@/lib/amazon/returns'

/**
 * Cron job: Sync returns from Amazon every 4 hours.
 * Uses the Reports API to get actual return data since
 * the Orders API doesn't have a "Returned" status.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fix #7: Prevent concurrent syncs
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
  const runningSync = await prisma.syncLog.findFirst({
    where: { syncType: 'amazon_returns', status: 'running', startedAt: { gte: thirtyMinAgo } },
  })
  if (runningSync) {
    return NextResponse.json({ message: 'Sync already in progress', syncLogId: runningSync.id })
  }

  try {
    const platforms = await prisma.salesPlatform.findMany({
      where: { name: 'amazon', isActive: true },
      select: { tenantId: true },
    })

    const results = []

    for (const platform of platforms) {
      try {
        const result = await syncAmazonReturns(platform.tenantId, 90)
        results.push({ tenantId: platform.tenantId, ...result })
      } catch (err: any) {
        results.push({ tenantId: platform.tenantId, status: 'failed', errorMessage: err.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Cron sync-returns error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
