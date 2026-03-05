import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/product-info/raw-materials/lookup - Get raw material details by rmType + color
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const rmType = searchParams.get('rmType')
    const color = searchParams.get('color')
    const supplierId = searchParams.get('supplierId')

    if (!rmType) {
      return NextResponse.json(
        { error: 'rmType parameter is required' },
        { status: 400 }
      )
    }

    // Build where clause with AND conditions
    const andConditions: Prisma.RawMaterialWhereInput[] = [
      { tenantId: auth.user.tenantId },
      { status: 'active' },
      { rmType: rmType },
    ]

    // Handle color - 'None' means null or empty string
    if (color && color !== 'None') {
      andConditions.push({ color: color })
    } else if (color === 'None') {
      andConditions.push({
        OR: [
          { color: null },
          { color: '' },
        ],
      })
    }

    // Find the raw material
    const rawMaterial = await prisma.rawMaterial.findFirst({
      where: {
        AND: andConditions,
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    })

    if (!rawMaterial) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 })
    }

    // Check for supplier-specific pricing if supplierId is provided
    let supplierPricing = null
    if (supplierId && rawMaterial.supplierId === supplierId) {
      // The raw material already has the supplier pricing as its costPerSku
      supplierPricing = {
        unitPrice: Number(rawMaterial.costPerSku),
        minQty: null,
        validFrom: null,
        validTo: null,
      }
    }

    return cachedJsonResponse({
      rawMaterial: {
        id: rawMaterial.id,
        rmSku: rawMaterial.rmSku,
        rmType: rawMaterial.rmType,
        color: rawMaterial.color,
        measurementUnit: rawMaterial.measurementUnit,
        unitsPerQuantity: rawMaterial.unitsPerQuantity,
        costPrice: Number(rawMaterial.costPerSku),
        gstPct: Number(rawMaterial.gstRatePct),
        hsnCode: rawMaterial.hsnCode,
        supplier: rawMaterial.supplier,
      },
      supplierPricing,
    }, 60)
  } catch (error) {
    console.error('Error fetching raw material details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw material details' },
      { status: 500 }
    )
  }
}
