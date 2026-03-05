import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { contactSchema } from '@/validators/supplier'
import { authenticateRequest } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = contactSchema.parse(body)

    const contact = await SupplierService.addContact(
      id,
      validatedData,
      auth.user.tenantId
    )

    return NextResponse.json(contact, { status: 201 })
  } catch (error: any) {
    console.error('Error adding contact:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to add contact' },
      { status: 400 }
    )
  }
}
