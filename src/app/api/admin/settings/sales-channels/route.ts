import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { createSalesChannelSchema } from '@/validators/settings'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
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

    const channels = await SettingsService.getAllSalesChannels(currentUser.tenantId)
    return NextResponse.json(channels)
  } catch (error) {
    console.error('Error fetching sales channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales channels' },
      { status: 500 }
    )
  }
}

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

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createSalesChannelSchema.parse(body)

    const channel = await SettingsService.createSalesChannel(currentUser.tenantId, validatedData)
    return NextResponse.json(channel, { status: 201 })
  } catch (error: any) {
    console.error('Error creating sales channel:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create sales channel' },
      { status: 400 }
    )
  }
}
