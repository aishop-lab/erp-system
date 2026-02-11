import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = submitReconciliationSchema.parse(body)

    const payment = await submitReconciliation(
      poId,
      currentUser.tenantId,
      currentUser.id,
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
