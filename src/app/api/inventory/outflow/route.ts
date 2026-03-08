import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createOutflowSchema } from '@/validators/inventory'
import { getOutflows, createOutflow } from '@/services/outflow-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/inventory/outflow
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const params = {
      outflowType: searchParams.get('outflowType') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20') || 20)),
    }

    const result = await getOutflows(auth.user.tenantId, params)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching outflows:', error)
    return NextResponse.json({ error: 'Failed to fetch outflows' }, { status: 500 })
  }
}

// POST /api/inventory/outflow
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createOutflowSchema.parse(body)

    const outflow = await createOutflow(
      auth.user.tenantId,
      auth.user.id,
      auth.user.name,
      validatedData
    )

    return NextResponse.json({ outflow, message: 'Outflow created successfully' }, { status: 201 })
  } catch (error) {
    console.error('Error creating outflow:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to create outflow' }, { status: 500 })
  }
}
