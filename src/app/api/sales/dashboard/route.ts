import { NextRequest, NextResponse } from 'next/server'
import { getSalesDashboard } from '@/services/sales-service'
import { authenticateRequest } from '@/lib/api-auth'
import { cached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const cacheKey = `sales-dash:${auth.user.tenantId}:${startDate || ''}:${endDate || ''}`
    const dashboard = await cached(cacheKey, 3 * 60 * 1000, () =>
      getSalesDashboard(auth.user.tenantId, { startDate, endDate })
    )

    return NextResponse.json(dashboard)
  } catch (error: any) {
    console.error('Error fetching sales dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
