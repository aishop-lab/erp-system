import { NextRequest, NextResponse } from 'next/server'
import { FabricService } from '@/services/product-info-service'
import { updateFabricSchema } from '@/validators/product-info'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const fabric = await FabricService.getById(id, auth.user.tenantId)
    if (!fabric) {
      return NextResponse.json({ error: 'Fabric not found' }, { status: 404 })
    }

    return NextResponse.json({ fabric })
  } catch (error) {
    console.error('Error fetching fabric:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fabric' },
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

    const body = await request.json()
    const validatedData = updateFabricSchema.parse(body)

    const fabric = await FabricService.update(id, auth.user.tenantId, validatedData)
    return NextResponse.json({ fabric })
  } catch (error: any) {
    console.error('Error updating fabric:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update fabric' },
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

    await FabricService.deactivate(id, auth.user.tenantId)
    return NextResponse.json({ message: 'Fabric deactivated' })
  } catch (error: any) {
    console.error('Error deactivating fabric:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate fabric' },
      { status: 400 }
    )
  }
}
