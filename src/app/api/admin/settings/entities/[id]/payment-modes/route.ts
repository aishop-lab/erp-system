import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { createPaymentModeSchema } from '@/validators/settings'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entityId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const modes = await SettingsService.getPaymentModesByEntity(entityId, auth.user.tenantId)
    return NextResponse.json(modes)
  } catch (error: any) {
    console.error('Error fetching payment modes:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment modes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entityId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createPaymentModeSchema.parse(body)

    const mode = await SettingsService.createPaymentMode(entityId, auth.user.tenantId, validatedData)
    return NextResponse.json(mode, { status: 201 })
  } catch (error: any) {
    console.error('Error creating payment mode:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment mode' },
      { status: 400 }
    )
  }
}
