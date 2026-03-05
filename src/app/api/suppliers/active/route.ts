import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const suppliers = await SupplierService.getActiveSuppliers(auth.user.tenantId)
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching active suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active suppliers' },
      { status: 500 }
    )
  }
}
