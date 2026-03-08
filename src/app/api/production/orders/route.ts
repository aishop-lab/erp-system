import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createProductionSchema } from '@/validators/production'
import { getProductions, createProduction } from '@/services/production-service'
import { ProductionType, ProductionStatus } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/production/orders - List production orders
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const params = {
      productionType: searchParams.get('productionType') as ProductionType | undefined,
      status: searchParams.get('status') as ProductionStatus | undefined,
      search: searchParams.get('search') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20') || 20)),
    }

    const result = await getProductions(auth.user.tenantId, params)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching production orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production orders' },
      { status: 500 }
    )
  }
}

// POST /api/production/orders - Create production order
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createProductionSchema.parse(body)

    const production = await createProduction(
      auth.user.tenantId,
      auth.user.id,
      validatedData
    )

    return NextResponse.json(production, { status: 201 })
  } catch (error) {
    console.error('Error creating production order:', error)

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
      { error: 'Failed to create production order' },
      { status: 500 }
    )
  }
}
