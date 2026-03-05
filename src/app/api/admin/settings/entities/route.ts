import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/services/settings-service'
import { createEntitySchema } from '@/validators/settings'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const entities = await SettingsService.getAllEntities(auth.user.tenantId)
    return NextResponse.json(entities)
  } catch (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
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
    const validatedData = createEntitySchema.parse(body)

    const entity = await SettingsService.createEntity(auth.user.tenantId, validatedData)
    return NextResponse.json(entity, { status: 201 })
  } catch (error: any) {
    console.error('Error creating entity:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create entity' },
      { status: 400 }
    )
  }
}
