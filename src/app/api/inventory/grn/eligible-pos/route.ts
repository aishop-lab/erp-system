import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { getEligiblePOs } from '@/services/grn-service'

// GET /api/inventory/grn/eligible-pos - Get POs eligible for GRN creation
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const params = {
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    }

    const result = await getEligiblePOs(auth.user.tenantId, params)

    return cachedJsonResponse(result, 30)
  } catch (error) {
    console.error('Error fetching eligible POs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible purchase orders' },
      { status: 500 }
    )
  }
}
