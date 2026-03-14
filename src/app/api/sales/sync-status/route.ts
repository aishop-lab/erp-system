import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const auth = await authenticateRequest()
  if (auth.response) return auth.response

  const syncTypes = ['amazon_orders', 'fba_inventory', 'amazon_returns', 'shopify_orders']

  const results: Record<string, string | null> = {}

  for (const syncType of syncTypes) {
    const lastSync = await prisma.syncLog.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        syncType,
        status: { in: ['completed', 'partial'] },
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    })
    results[syncType] = lastSync?.completedAt?.toISOString() ?? null
  }

  return NextResponse.json(results)
}
