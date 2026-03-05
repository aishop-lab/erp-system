import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { getProductionById } from '@/services/production-service'

// GET /api/production/orders/[id] - Get single production order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const production = await getProductionById(id, auth.user.tenantId)

    if (!production) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 })
    }

    return cachedJsonResponse(production, 30)
  } catch (error) {
    console.error('Error fetching production order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production order' },
      { status: 500 }
    )
  }
}
