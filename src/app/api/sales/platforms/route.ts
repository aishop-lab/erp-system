import { NextRequest, NextResponse } from 'next/server'
import { getSalesPlatforms } from '@/services/sales-service'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const platforms = await getSalesPlatforms(auth.user.tenantId)

    return cachedJsonResponse(platforms, 120)
  } catch (error: any) {
    console.error('Error fetching sales platforms:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
