import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/finished/lookup - Lookup a specific product by style, color, size
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
    const styleId = searchParams.get('styleId')
    const color = searchParams.get('color')
    const size = searchParams.get('size')
    const supplierId = searchParams.get('supplierId')

    if (!styleId || !color || !size) {
      return NextResponse.json(
        { error: 'Style ID, color, and size are required' },
        { status: 400 }
      )
    }

    // Find the specific product
    const product = await prisma.finishedProduct.findFirst({
      where: {
        tenantId: currentUser.tenantId,
        styleId: styleId,
        color: color,
        size: size,
        status: 'active',
      },
      include: {
        style: {
          select: {
            id: true,
            styleCode: true,
            styleName: true,
            category: true,
          },
        },
        fabric: {
          select: {
            id: true,
            fabricSku: true,
            material: true,
            color: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check for supplier pricing if supplierId is provided
    let supplierPricing = null
    if (supplierId) {
      const pricing = await prisma.supplierPricing.findFirst({
        where: {
          supplierId: supplierId,
          productId: product.id,
        },
      })

      if (pricing) {
        supplierPricing = {
          unitPrice: Number(pricing.unitPrice),
          minQty: pricing.minQty,
          validFrom: pricing.validFrom,
          validTo: pricing.validTo,
        }
      }
    }

    return NextResponse.json({
      product: {
        id: product.id,
        childSku: product.childSku,
        parentSku: product.parentSku,
        title: product.title,
        color: product.color,
        size: product.size,
        costPrice: Number(product.costAmount),
        gstPct: Number(product.gstRatePct),
        style: product.style,
        fabric: product.fabric,
      },
      supplierPricing,
    })
  } catch (error) {
    console.error('Error looking up product:', error)
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    )
  }
}
