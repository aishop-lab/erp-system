import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { createPaymentModeSchema } from '@/validators/settings'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entityId } = await params
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

    const modes = await SettingsService.getPaymentModesByEntity(entityId, currentUser.tenantId)
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
    const validatedData = createPaymentModeSchema.parse(body)

    const mode = await SettingsService.createPaymentMode(entityId, currentUser.tenantId, validatedData)
    return NextResponse.json(mode, { status: 201 })
  } catch (error: any) {
    console.error('Error creating payment mode:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment mode' },
      { status: 400 }
    )
  }
}
