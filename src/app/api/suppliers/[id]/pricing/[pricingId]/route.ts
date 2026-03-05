import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pricingId: string }> }
) {
  try {
    const { pricingId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    await SupplierService.deletePricing(pricingId, auth.user.tenantId)
    return NextResponse.json({ message: 'Pricing deleted' })
  } catch (error: any) {
    console.error('Error deleting pricing:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete pricing' },
      { status: 400 }
    )
  }
}
