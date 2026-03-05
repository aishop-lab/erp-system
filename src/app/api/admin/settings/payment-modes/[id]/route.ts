import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { updatePaymentModeSchema } from '@/validators/settings'
import { authenticateRequest } from '@/lib/api-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updatePaymentModeSchema.parse(body)

    const mode = await SettingsService.updatePaymentMode(id, auth.user.tenantId, validatedData)
    return NextResponse.json(mode)
  } catch (error: any) {
    console.error('Error updating payment mode:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update payment mode' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    await SettingsService.deletePaymentMode(id, auth.user.tenantId)
    return NextResponse.json({ message: 'Payment mode deleted' })
  } catch (error: any) {
    console.error('Error deleting payment mode:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment mode' },
      { status: 400 }
    )
  }
}
