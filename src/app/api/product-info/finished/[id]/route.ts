import { NextRequest, NextResponse } from 'next/server'
import { FinishedProductService } from '@/services/product-info-service'
import { updateFinishedProductSchema } from '@/validators/product-info'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const product = await FinishedProductService.getById(id, auth.user.tenantId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching finished product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch finished product' },
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
    const validatedData = updateFinishedProductSchema.parse(body)

    const product = await FinishedProductService.update(id, auth.user.tenantId, validatedData)
    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('Error updating finished product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update finished product' },
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

    await FinishedProductService.deactivate(id, auth.user.tenantId)
    return NextResponse.json({ message: 'Product deactivated' })
  } catch (error: any) {
    console.error('Error deactivating finished product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate finished product' },
      { status: 400 }
    )
  }
}
