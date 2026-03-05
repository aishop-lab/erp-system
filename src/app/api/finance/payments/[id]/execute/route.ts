import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { executePaymentSchema } from '@/validators/payment'
import { executePayment } from '@/services/finance-service'
import { z } from 'zod'

// POST /api/finance/payments/[id]/execute - Execute an approved payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = executePaymentSchema.parse(body)

    const result = await executePayment(
      id,
      auth.user.tenantId,
      auth.user.id,
      validatedData
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error executing payment:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to execute payment' },
      { status: 500 }
    )
  }
}
