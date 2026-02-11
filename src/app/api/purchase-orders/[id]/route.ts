import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPurchaseOrderById } from '@/services/po-service'
import { updatePurchaseOrderSchema } from '@/validators/purchase-order'
import { POStatus } from '@prisma/client'
import { z } from 'zod'

// GET /api/purchase-orders/[id] - Get a single purchase order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const purchaseOrder = await getPurchaseOrderById(id, currentUser.tenantId)

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error('Error fetching purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    )
  }
}

// PUT /api/purchase-orders/[id] - Update a purchase order (draft only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check if PO exists and is draft
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId: currentUser.tenantId },
    })

    if (!existingPO) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    if (existingPO.status !== POStatus.draft) {
      return NextResponse.json(
        { error: 'Only draft purchase orders can be edited' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { lineItems, freeTextItems, refundItems, ...poData } = body

    // Calculate totals
    let totalAmount = 0
    let taxAmount = 0

    if (lineItems) {
      for (const item of lineItems) {
        const itemTotal = item.quantity * item.unitPrice
        const itemTax = itemTotal * ((item.taxRate || 0) / 100)
        totalAmount += itemTotal
        taxAmount += itemTax
      }
    }

    if (freeTextItems) {
      for (const item of freeTextItems) {
        const itemTotal = (item.quantity || 1) * item.unitPrice
        const itemTax = itemTotal * ((item.taxRate || 0) / 100)
        totalAmount += itemTotal
        taxAmount += itemTax
      }
    }

    if (refundItems) {
      for (const item of refundItems) {
        totalAmount += item.amount
      }
    }

    // Update in transaction
    const updatedPO = await prisma.$transaction(async (tx) => {
      // Delete existing line items
      await tx.pOLineItem.deleteMany({ where: { poId: id } })
      await tx.pOLineItemFreetext.deleteMany({ where: { purchaseOrderId: id } })
      await tx.pOLineItemRefund.deleteMany({ where: { purchaseOrderId: id } })

      // Update PO header and recreate line items
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: poData.supplierId,
          entityId: poData.entityId,
          notes: poData.notes,
          expectedDelivery: poData.expectedDelivery,
          totalAmount,
          taxAmount,
          grandTotal: totalAmount + taxAmount,
          lineItems: lineItems ? {
            create: lineItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || 0,
              taxAmount: item.quantity * item.unitPrice * ((item.taxRate || 0) / 100),
              totalAmount: item.quantity * item.unitPrice * (1 + (item.taxRate || 0) / 100),
            })),
          } : undefined,
          freeTextItems: freeTextItems ? {
            create: freeTextItems.map((item: any) => ({
              description: item.description,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || 0,
              taxAmount: (item.quantity || 1) * item.unitPrice * ((item.taxRate || 0) / 100),
              totalAmount: (item.quantity || 1) * item.unitPrice * (1 + (item.taxRate || 0) / 100),
            })),
          } : undefined,
          refundItems: refundItems ? {
            create: refundItems,
          } : undefined,
        },
        include: {
          supplier: true,
          entity: true,
          lineItems: true,
          freeTextItems: true,
          refundItems: true,
        },
      })
    })

    return NextResponse.json(updatedPO)
  } catch (error) {
    console.error('Error updating purchase order:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}

// DELETE /api/purchase-orders/[id] - Delete a purchase order (draft only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check if PO exists and is draft
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId: currentUser.tenantId },
    })

    if (!existingPO) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    if (existingPO.status !== POStatus.draft) {
      return NextResponse.json(
        { error: 'Only draft purchase orders can be deleted' },
        { status: 400 }
      )
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to delete purchase order' },
      { status: 500 }
    )
  }
}
