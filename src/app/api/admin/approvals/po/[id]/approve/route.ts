import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { approvePurchaseOrder } from '@/services/po-service'

// POST /api/admin/approvals/po/[id]/approve - Approve or reject a PO
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Only super admins can approve POs
    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, notes } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !notes) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const result = await approvePurchaseOrder(
      id,
      auth.user.tenantId,
      auth.user.id,
      action,
      notes
    )

    return NextResponse.json({
      purchaseOrder: result[0],
      message: `Purchase order ${action}ed successfully`,
    })
  } catch (error) {
    console.error('Error approving/rejecting PO:', error)
    const message = error instanceof Error ? error.message : 'Failed to process approval'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
