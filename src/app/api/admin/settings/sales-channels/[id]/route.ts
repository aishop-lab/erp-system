import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { updateSalesChannelSchema } from '@/validators/settings'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
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

    const channel = await SettingsService.getSalesChannelById(id, auth.user.tenantId)
    if (!channel) {
      return NextResponse.json({ error: 'Sales channel not found' }, { status: 404 })
    }

    return NextResponse.json(channel)
  } catch (error) {
    console.error('Error fetching sales channel:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales channel' },
      { status: 500 }
    )
  }
}

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
    const validatedData = updateSalesChannelSchema.parse(body)

    const channel = await SettingsService.updateSalesChannel(id, auth.user.tenantId, validatedData)
    return NextResponse.json(channel)
  } catch (error: any) {
    console.error('Error updating sales channel:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update sales channel' },
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

    await SettingsService.deactivateSalesChannel(id, auth.user.tenantId)
    return NextResponse.json({ message: 'Sales channel deactivated' })
  } catch (error: any) {
    console.error('Error deactivating sales channel:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate sales channel' },
      { status: 400 }
    )
  }
}
