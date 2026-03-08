import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncFbaInventory } from '@/lib/amazon/inventory'

/**
 * Cron job: Sync FBA inventory from Amazon every 4 hours.
 * Triggered by Vercel Cron.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET env var is not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const platforms = await prisma.salesPlatform.findMany({
      where: { name: 'amazon', isActive: true },
      select: { tenantId: true },
    })

    const results = []

    for (const platform of platforms) {
      try {
        const result = await syncFbaInventory(platform.tenantId)
        results.push({ tenantId: platform.tenantId, ...result })
      } catch (err: any) {
        results.push({ tenantId: platform.tenantId, status: 'failed', errorMessage: err.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Cron sync-inventory error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
