import { NextRequest, NextResponse } from 'next/server'
import { submitForApproval } from '@/services/po-service'
import { authenticateRequest } from '@/lib/api-auth'

// POST /api/purchase-orders/[id]/submit - Submit PO for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const updatedPO = await submitForApproval(id, auth.user.tenantId)

    return NextResponse.json(updatedPO)
  } catch (error: any) {
    console.error('Error submitting purchase order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit purchase order' },
      { status: 400 }
    )
  }
}
