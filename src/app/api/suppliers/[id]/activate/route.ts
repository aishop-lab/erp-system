import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const supplier = await SupplierService.activateSupplier(id, auth.user.tenantId)
    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error('Error activating supplier:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to activate supplier' },
      { status: 400 }
    )
  }
}
