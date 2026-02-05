import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { updatePaymentModeSchema } from '@/validators/settings'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
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

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updatePaymentModeSchema.parse(body)

    const mode = await SettingsService.updatePaymentMode(id, currentUser.tenantId, validatedData)
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
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    await SettingsService.deletePaymentMode(id, currentUser.tenantId)
    return NextResponse.json({ message: 'Payment mode deleted' })
  } catch (error: any) {
    console.error('Error deleting payment mode:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment mode' },
      { status: 400 }
    )
  }
}
