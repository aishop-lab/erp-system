import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { getPOForReconciliation } from '@/services/reconciliation-service'

// GET /api/finance/reconciliation/[poId] - Get PO detail for reconciliation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poId: string }> }
) {
  try {
    const { poId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const po = await getPOForReconciliation(poId, auth.user.tenantId)

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase order not found or not eligible for reconciliation' },
        { status: 404 }
      )
    }

    return NextResponse.json(po)
  } catch (error) {
    console.error('Error fetching PO for reconciliation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase order details' },
      { status: 500 }
    )
  }
}
