import { NextRequest, NextResponse } from 'next/server'
import { RawMaterialService } from '@/services/product-info-service'
import { updateRawMaterialSchema } from '@/validators/product-info'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const rawMaterial = await RawMaterialService.getById(id, auth.user.tenantId)
    if (!rawMaterial) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 })
    }

    return NextResponse.json({ rawMaterial })
  } catch (error) {
    console.error('Error fetching raw material:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw material' },
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
    const validatedData = updateRawMaterialSchema.parse(body)

    const rawMaterial = await RawMaterialService.update(id, auth.user.tenantId, validatedData)
    return NextResponse.json({ rawMaterial })
  } catch (error: any) {
    console.error('Error updating raw material:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update raw material' },
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

    await RawMaterialService.deactivate(id, auth.user.tenantId)
    return NextResponse.json({ message: 'Raw material deactivated' })
  } catch (error: any) {
    console.error('Error deactivating raw material:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate raw material' },
      { status: 400 }
    )
  }
}
