import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { createSupplierSchema } from '@/validators/supplier'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true :
                searchParams.get('isActive') === 'false' ? false : undefined,
      purchaseType: searchParams.get('purchaseType') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 10,
    }

    const result = await SupplierService.getAllSuppliers(currentUser.tenantId, filters)
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
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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

    console.log('Received supplier data:', JSON.stringify(body, null, 2))

    // Validate with Zod
    let validatedData
    try {
      validatedData = createSupplierSchema.parse(body)
    } catch (validationError: any) {
      console.error('Validation error:', validationError)
      return NextResponse.json(
        { error: 'Validation error', details: validationError.errors || validationError.message },
        { status: 400 }
      )
    }

    console.log('Validated data:', JSON.stringify(validatedData, null, 2))

    // Create supplier
    const supplier = await SupplierService.createSupplier(currentUser.tenantId, validatedData)

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    console.error('Error stack:', error.stack)

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
