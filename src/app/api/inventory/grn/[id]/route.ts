import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { getGRNById } from '@/services/grn-service'

// GET /api/inventory/grn/[id] - Get a single GRN
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const grn = await getGRNById(id, auth.user.tenantId)

    if (!grn) {
      return NextResponse.json(
        { error: 'GRN not found' },
        { status: 404 }
      )
    }

    return cachedJsonResponse(grn, 30)
  } catch (error) {
    console.error('Error fetching GRN:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GRN' },
      { status: 500 }
    )
  }
}
