import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { updateSupplierSchema } from '@/validators/supplier'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const supplier = await SupplierService.getSupplierById(id, auth.user.tenantId)

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
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
    const validatedData = updateSupplierSchema.parse(body)

    const supplier = await SupplierService.updateSupplier(
      id,
      auth.user.tenantId,
      validatedData
    )

    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error('Error updating supplier:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update supplier' },
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

    await SupplierService.deactivateSupplier(id, auth.user.tenantId)
    return NextResponse.json({ message: 'Supplier deactivated' })
  } catch (error: any) {
    console.error('Error deactivating supplier:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate supplier' },
      { status: 400 }
    )
  }
}
