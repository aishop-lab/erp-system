import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/product-info/packaging/lookup - Get packaging details by pkgType + channel + dimensions
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
    const pkgType = searchParams.get('pkgType')
    const channel = searchParams.get('channel')
    const dimensions = searchParams.get('dimensions')
    const supplierId = searchParams.get('supplierId')

    if (!pkgType) {
      return NextResponse.json(
        { error: 'pkgType parameter is required' },
        { status: 400 }
      )
    }

    // Build where clause with AND conditions
    const andConditions: Prisma.PackagingWhereInput[] = [
      { tenantId: currentUser.tenantId },
      { status: 'active' },
      { pkgType: pkgType },
    ]

    // Handle channel - 'None' means null or empty string
    if (channel && channel !== 'None') {
      andConditions.push({ channel: channel })
    } else if (channel === 'None') {
      andConditions.push({
        OR: [
          { channel: null },
          { channel: '' },
        ],
      })
    }

    // Handle dimensions - 'None' means null or empty string
    if (dimensions && dimensions !== 'None') {
      andConditions.push({ dimensions: dimensions })
    } else if (dimensions === 'None') {
      andConditions.push({
        OR: [
          { dimensions: null },
          { dimensions: '' },
        ],
      })
    }

    // Find the packaging item
    const packagingItem = await prisma.packaging.findFirst({
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

    if (!packagingItem) {
      return NextResponse.json({ error: 'Packaging not found' }, { status: 404 })
    }

    // Check for supplier-specific pricing if supplierId is provided
    let supplierPricing = null
    if (supplierId && packagingItem.supplierId === supplierId) {
      // The packaging item already has the supplier pricing as its costPerUnit
      supplierPricing = {
        unitPrice: Number(packagingItem.costPerUnit),
        minQty: null,
        validFrom: null,
        validTo: null,
      }
    }

    return NextResponse.json({
      packaging: {
        id: packagingItem.id,
        pkgSku: packagingItem.pkgSku,
        pkgType: packagingItem.pkgType,
        description: packagingItem.description,
        channel: packagingItem.channel,
        dimensions: packagingItem.dimensions,
        measurementUnit: packagingItem.measurementUnit,
        unitsPerQuantity: packagingItem.unitsPerQuantity,
        costPrice: Number(packagingItem.costPerUnit),
        gstPct: Number(packagingItem.gstRatePct),
        hsnCode: packagingItem.hsnCode,
        supplier: packagingItem.supplier,
      },
      supplierPricing,
    })
  } catch (error) {
    console.error('Error fetching packaging details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packaging details' },
      { status: 500 }
    )
  }
}
