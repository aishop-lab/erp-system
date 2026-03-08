import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createGRNSchema } from '@/validators/grn'
import { createGRN, getGRNs } from '@/services/grn-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/inventory/grn - List all GRNs with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const params = {
      search: searchParams.get('search') || undefined,
      poId: searchParams.get('poId') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20') || 20)),
    }

    const result = await getGRNs(auth.user.tenantId, params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching GRNs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GRNs' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/grn - Create a new GRN
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createGRNSchema.parse(body)

    const grn = await createGRN(
      auth.user.tenantId,
      auth.user.id,
      validatedData
    )

    return NextResponse.json(grn, { status: 201 })
  } catch (error) {
    console.error('Error creating GRN:', error)

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
      { error: 'Failed to create GRN' },
      { status: 500 }
    )
  }
}
