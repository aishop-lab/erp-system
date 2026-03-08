import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { getAvailableBatches } from '@/services/production-service'

export const dynamic = 'force-dynamic'

// GET /api/production/available-batches
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const params = {
      productType: searchParams.get('productType') || undefined,
      productId: searchParams.get('productId') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const data = await getAvailableBatches(auth.user.tenantId, params)
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching available batches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available batches' },
      { status: 500 }
    )
  }
}
