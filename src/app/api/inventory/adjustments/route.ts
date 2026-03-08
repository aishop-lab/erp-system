import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createAdjustmentSchema } from '@/validators/inventory'
import { getAdjustments, createAdjustment } from '@/services/adjustment-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/inventory/adjustments
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const params = {
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20') || 20)),
    }

    const result = await getAdjustments(auth.user.tenantId, params)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching adjustments:', error)
    return NextResponse.json({ error: 'Failed to fetch adjustments' }, { status: 500 })
  }
}

// POST /api/inventory/adjustments
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createAdjustmentSchema.parse(body)

    const adjustment = await createAdjustment(
      auth.user.tenantId,
      auth.user.id,
      auth.user.name,
      validatedData
    )

    return NextResponse.json({ adjustment, message: 'Stock adjusted successfully' }, { status: 201 })
  } catch (error) {
    console.error('Error creating adjustment:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to create adjustment' }, { status: 500 })
  }
}
