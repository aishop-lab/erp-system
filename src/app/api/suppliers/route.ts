import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { createSupplierSchema } from '@/validators/supplier'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true :
                searchParams.get('isActive') === 'false' ? false : undefined,
      purchaseType: searchParams.get('purchaseType') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 10,
    }

    const result = await SupplierService.getAllSuppliers(auth.user.tenantId, filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Parse request body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate with Zod
    let validatedData
    try {
      validatedData = createSupplierSchema.parse(body)
    } catch (validationError: any) {
      return NextResponse.json(
        { error: 'Validation error', details: validationError.errors || validationError.message },
        { status: 400 }
      )
    }

    // Create supplier
    const supplier = await SupplierService.createSupplier(auth.user.tenantId, validatedData)

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error('Error creating supplier:', error?.message)

    // Always return a proper JSON response
    return NextResponse.json(
      {
        error: error.message || 'Failed to create supplier',
        code: error.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}
