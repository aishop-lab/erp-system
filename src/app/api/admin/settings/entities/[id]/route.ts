import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { updateEntitySchema } from '@/validators/settings'
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

    const entity = await SettingsService.getEntityById(id, auth.user.tenantId)
    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    return NextResponse.json(entity)
  } catch (error) {
    console.error('Error fetching entity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entity' },
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
    const validatedData = updateEntitySchema.parse(body)

    const entity = await SettingsService.updateEntity(id, auth.user.tenantId, validatedData)
    return NextResponse.json(entity)
  } catch (error: any) {
    console.error('Error updating entity:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update entity' },
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

    await SettingsService.deactivateEntity(id, auth.user.tenantId)
    return NextResponse.json({ message: 'Entity deactivated' })
  } catch (error: any) {
    console.error('Error deactivating entity:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate entity' },
      { status: 400 }
    )
  }
}
