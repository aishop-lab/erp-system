import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { getPOForGRN } from '@/services/grn-service'

// GET /api/inventory/grn/po/[poId] - Get PO details for GRN creation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poId: string }> }
) {
  try {
    const { poId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const poData = await getPOForGRN(poId, auth.user.tenantId)

    if (!poData) {
      return NextResponse.json(
        { error: 'Purchase order not found or not eligible for GRN' },
        { status: 404 }
      )
    }

    return cachedJsonResponse(poData, 30)
  } catch (error) {
    console.error('Error fetching PO for GRN:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase order details' },
      { status: 500 }
    )
  }
}
