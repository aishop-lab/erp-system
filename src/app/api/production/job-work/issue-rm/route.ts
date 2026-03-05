import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { rmIssuanceSchema } from '@/validators/production'
import { issueRawMaterials } from '@/services/production-service'
import { z } from 'zod'

// POST /api/production/job-work/issue-rm
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = rmIssuanceSchema.parse(body)

    const issuance = await issueRawMaterials(
      auth.user.tenantId,
      auth.user.id,
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
