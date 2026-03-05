import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'

// GET /api/product-info/finished/lookup - Lookup a specific product by style, color, size
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

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
        tenantId: auth.user.tenantId,
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
          productType: 'finished',
        },
      })

      if (pricing) {
        supplierPricing = {
          unitPrice: pricing.unitPrice ? Number(pricing.unitPrice) : null,
          jobWorkRate: pricing.jobWorkRate ? Number(pricing.jobWorkRate) : null,
          directPurchaseRate: pricing.directPurchaseRate ? Number(pricing.directPurchaseRate) : null,
          minQty: pricing.minQty,
          validFrom: pricing.validFrom,
          validTo: pricing.validTo,
        }
      }
    }

    return cachedJsonResponse({
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
    }, 30)
  } catch (error) {
    console.error('Error looking up product:', error)
    return Response.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    )
  }
}
