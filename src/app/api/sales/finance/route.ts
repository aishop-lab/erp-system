import { NextRequest } from 'next/server'
import { getFinanceAnalytics } from '@/services/analytics-service'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '365')

    const data = await getFinanceAnalytics(auth.user.tenantId, days)
    return cachedJsonResponse(data, 300)
  } catch (error: any) {
    console.error('Error fetching finance analytics:', error)
    return cachedJsonResponse({ error: error.message }, 0)
  }
}
