import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const purchaseType = searchParams.get('purchaseType')

    if (!purchaseType) {
      return NextResponse.json(
        { error: 'purchaseType is required' },
        { status: 400 }
      )
    }

    const suppliers = await SupplierService.getSuppliersByPurchaseType(
      auth.user.tenantId,
      purchaseType
    )

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching suppliers by purchase type:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}
