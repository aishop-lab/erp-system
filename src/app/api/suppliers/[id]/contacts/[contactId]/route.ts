import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { contactSchema } from '@/validators/supplier'
import { authenticateRequest } from '@/lib/api-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { contactId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = contactSchema.parse(body)

    const contact = await SupplierService.updateContact(
      contactId,
      validatedData,
      auth.user.tenantId
    )

    return NextResponse.json(contact)
  } catch (error: any) {
    console.error('Error updating contact:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update contact' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { contactId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    await SupplierService.deleteContact(contactId, auth.user.tenantId)
    return NextResponse.json({ message: 'Contact deleted' })
  } catch (error: any) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete contact' },
      { status: 400 }
    )
  }
}
