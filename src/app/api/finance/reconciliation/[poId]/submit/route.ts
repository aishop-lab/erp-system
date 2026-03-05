import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { submitReconciliationSchema } from '@/validators/reconciliation'
import { submitReconciliation } from '@/services/reconciliation-service'
import { z } from 'zod'

// POST /api/finance/reconciliation/[poId]/submit - Submit reconciliation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ poId: string }> }
) {
  try {
    const { poId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = submitReconciliationSchema.parse(body)

    const payment = await submitReconciliation(
      poId,
      auth.user.tenantId,
      auth.user.id,
      validatedData
    )

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error submitting reconciliation:', error)

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
      { error: 'Failed to submit reconciliation' },
      { status: 500 }
    )
  }
}
