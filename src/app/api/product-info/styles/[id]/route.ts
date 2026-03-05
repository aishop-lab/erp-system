import { NextRequest, NextResponse } from 'next/server'
import { StyleService } from '@/services/product-info-service'
import { updateStyleSchema } from '@/validators/product-info'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const style = await StyleService.getById(id, auth.user.tenantId)
    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    return NextResponse.json({ style })
  } catch (error) {
    console.error('Error fetching style:', error)
    return NextResponse.json(
      { error: 'Failed to fetch style' },
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
    const validatedData = updateStyleSchema.parse(body)

    const style = await StyleService.update(id, auth.user.tenantId, validatedData)
    return NextResponse.json({ style })
  } catch (error: any) {
    console.error('Error updating style:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update style' },
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

    await StyleService.deactivate(id, auth.user.tenantId)
    return NextResponse.json({ message: 'Style deactivated' })
  } catch (error: any) {
    console.error('Error deactivating style:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate style' },
      { status: 400 }
    )
  }
}
