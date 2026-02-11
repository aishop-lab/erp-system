import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createPurchaseOrderSchema } from '@/validators/purchase-order'
import {
  getPurchaseOrders,
  createPurchaseOrder
} from '@/services/po-service'
import { z } from 'zod'

// GET /api/purchase-orders - List all purchase orders with filters
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
    const params = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as any || undefined,
      purchaseType: searchParams.get('purchaseType') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    }

    const result = await getPurchaseOrders(currentUser.tenantId, params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    )
  }
}

// POST /api/purchase-orders - Create a new purchase order
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

    const body = await request.json()

    // Safe logging
    console.log('📥 PO Request received')
    console.log('User ID:', currentUser.id)
    console.log('Tenant ID:', currentUser.tenantId)
    console.log('Purchase Type:', body.purchaseType)
    console.log('Supplier ID:', body.supplierId)
    console.log('Line Items Count:', body.lineItems?.length || 0)

    // Validate input
    let validatedData
    try {
      validatedData = createPurchaseOrderSchema.parse(body)
      console.log('✅ Validation passed')
    } catch (validationError) {
      console.error('❌ Validation failed')
      if (validationError instanceof z.ZodError) {
        console.error('Validation errors:', JSON.stringify(validationError.errors, null, 2))
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationError.errors,
            message: 'Please check all required fields are filled correctly'
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Create purchase order
    console.log('🔨 Creating purchase order via service...')
    const purchaseOrder = await createPurchaseOrder(
      currentUser.tenantId,
      currentUser.id,
      validatedData
    )

    console.log('✅ PO Created successfully:', purchaseOrder.poNumber)

    return NextResponse.json(purchaseOrder, { status: 201 })

  } catch (error: any) {
    // Safe error logging - avoid circular references
    console.error('❌ PO Creation Error occurred')
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)

    // Only log stack in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error stack:', error?.stack)
    }

    // Check for specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
          message: 'Please check all required fields'
        },
        { status: 400 }
      )
    }

    // Prisma errors
    if (error?.code) {
      console.error('Prisma error code:', error.code)

      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            error: 'Duplicate entry',
            message: 'This PO number or unique field already exists'
          },
          { status: 409 }
        )
      }

      if (error.code === 'P2003') {
        return NextResponse.json(
          {
            error: 'Foreign key constraint failed',
            message: 'One of the selected items (supplier, product) does not exist'
          },
          { status: 400 }
        )
      }

      if (error.code === 'P2025') {
        return NextResponse.json(
          {
            error: 'Record not found',
            message: 'Could not find the specified record'
          },
          { status: 404 }
        )
      }

      // Generic Prisma error
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'A database error occurred. Please contact support.',
          code: error.code
        },
        { status: 500 }
      )
    }

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to create purchase order',
        message: error?.message || 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    )
  }
}