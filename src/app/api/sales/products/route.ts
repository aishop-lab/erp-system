import { NextRequest } from 'next/server'
import { getProductPerformance } from '@/services/analytics-service'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '365')

    const data = await getProductPerformance(auth.user.tenantId, days)
    return cachedJsonResponse(data, 300)
  } catch (error: any) {
    console.error('Error fetching product performance:', error)
    return cachedJsonResponse({ error: error.message }, 0)
  }
}
