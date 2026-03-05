import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { approvePayment } from '@/services/finance-service'

// POST /api/finance/payments/[id]/approve - Approve or reject payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only admins can approve payments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for rejection' },
        { status: 400 }
      )
    }

    const result = await approvePayment(
      id,
      auth.user.tenantId,
      auth.user.id,
      action,
      reason
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing payment approval:', error)
    const message = error instanceof Error ? error.message : 'Failed to process payment'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
