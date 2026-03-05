import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { createSalesChannelSchema } from '@/validators/settings'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const channels = await SettingsService.getAllSalesChannels(auth.user.tenantId)
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
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createSalesChannelSchema.parse(body)

    const channel = await SettingsService.createSalesChannel(auth.user.tenantId, validatedData)
    return NextResponse.json(channel, { status: 201 })
  } catch (error: any) {
    console.error('Error creating sales channel:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create sales channel' },
      { status: 400 }
    )
  }
}
