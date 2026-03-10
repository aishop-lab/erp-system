import { NextRequest, NextResponse } from 'next/server'
import { getProductPerformance } from '@/services/analytics-service'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { cached } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const cacheKey = `products:${auth.user.tenantId}:${startDate || ''}:${endDate || ''}`
    const data = await cached(cacheKey, 15 * 60 * 1000, () =>
      getProductPerformance(auth.user.tenantId, { startDate, endDate })
    )
    return cachedJsonResponse(data, 900)
  } catch (error: any) {
    console.error('Error fetching product performance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
