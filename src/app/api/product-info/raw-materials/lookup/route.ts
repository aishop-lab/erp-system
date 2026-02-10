import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/product-info/raw-materials/lookup - Get raw material details by rmType + color
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
      { tenantId: currentUser.tenantId },
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

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error fetching raw material details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw material details' },
      { status: 500 }
    )
  }
}
