import { NextRequest, NextResponse } from 'next/server'
import { createPurchaseOrderSchema } from '@/validators/purchase-order'
import {
  getPurchaseOrders,
  createPurchaseOrder
} from '@/services/po-service'
import { authenticateRequest } from '@/lib/api-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/purchase-orders - List all purchase orders with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const params = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as any || undefined,
      purchaseType: searchParams.get('purchaseType') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20') || 20)),
    }

    const result = await getPurchaseOrders(auth.user.tenantId, params)

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
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()

    // Validate input
    let validatedData
    try {
      validatedData = createPurchaseOrderSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
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
    const purchaseOrder = await createPurchaseOrder(
      auth.user.tenantId,
      auth.user.id,
      validatedData
    )

    return NextResponse.json(purchaseOrder, { status: 201 })

  } catch (error: any) {
    console.error('Error creating purchase order:', error?.message)

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

    if (error?.code) {
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

      return NextResponse.json(
        {
          error: 'Database error',
          message: 'A database error occurred. Please contact support.',
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create purchase order',
        message: error?.message || 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    )
  }
}
