import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rmIssuanceSchema } from '@/validators/production'
import { issueRawMaterials } from '@/services/production-service'
import { z } from 'zod'

// POST /api/production/job-work/issue-rm
export async function POST(request: NextRequest) {
  try {
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
    const validatedData = rmIssuanceSchema.parse(body)

    const issuance = await issueRawMaterials(
      currentUser.tenantId,
      currentUser.id,
      validatedData
    )

    return NextResponse.json({
      issuance,
      message: 'RM issued successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error issuing RM:', error)

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
      { error: 'Failed to issue RM' },
      { status: 500 }
    )
  }
}
