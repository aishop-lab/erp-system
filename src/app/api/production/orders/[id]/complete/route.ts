import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { completeProductionSchema } from '@/validators/production'
import { completeProduction } from '@/services/production-service'
import { z } from 'zod'

// POST /api/production/orders/[id]/complete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = completeProductionSchema.parse(body)

    const result = await completeProduction(
      id,
      auth.user.tenantId,
      auth.user.id,
      validatedData
    )

    return NextResponse.json({
      ...result,
      message: 'Production completed successfully',
    })
  } catch (error) {
    console.error('Error completing production:', error)

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
      { error: 'Failed to complete production' },
      { status: 500 }
    )
  }
}
