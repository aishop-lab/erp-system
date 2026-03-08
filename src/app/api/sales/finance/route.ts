import { NextRequest, NextResponse } from 'next/server'
import { getFinanceAnalytics } from '@/services/analytics-service'
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

    const cacheKey = `finance:${auth.user.tenantId}:${startDate || ''}:${endDate || ''}`
    const data = await cached(cacheKey, 5 * 60 * 1000, () =>
      getFinanceAnalytics(auth.user.tenantId, { startDate, endDate })
    )
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching finance analytics:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
