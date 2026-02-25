import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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
    const validatedData = completeProductionSchema.parse(body)

    const result = await completeProduction(
      id,
      currentUser.tenantId,
      currentUser.id,
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
