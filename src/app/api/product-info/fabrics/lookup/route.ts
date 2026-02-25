import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/fabrics/lookup - Get fabric details by material + color + design + work
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
    const material = searchParams.get('material')
    const color = searchParams.get('color')
    const design = searchParams.get('design')
    const work = searchParams.get('work')
    const supplierId = searchParams.get('supplierId')

    // Build where clause with proper NULL handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      tenantId: currentUser.tenantId,
      status: 'active',
    }

    // Add fields directly - "None" is stored as string in database, not NULL
    if (material) whereClause.material = material
    if (color) whereClause.color = color
    if (design) whereClause.design = design
    if (work) whereClause.work = work

    const fabric = await prisma.fabric.findFirst({
      where: whereClause,
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

    if (!fabric) {
      // Find similar fabrics for debugging
      const similar = await prisma.fabric.findMany({
        where: {
          tenantId: currentUser.tenantId,
          status: 'active',
          material: material || undefined,
          color: color || undefined,
        },
        take: 3,
      })

      return NextResponse.json({
        error: 'Fabric not found',
        searched: { material, color, design, work },
        similar: similar.map(f => ({
          fabricSku: f.fabricSku,
          material: f.material,
          color: f.color,
          design: f.design,
          work: f.work,
        })),
      }, { status: 404 })
    }

    // Check for supplier-specific pricing
    let supplierPricing = null
    if (supplierId && fabric.supplierId === supplierId) {
      supplierPricing = {
        unitPrice: Number(fabric.costAmount),
        minQty: null,
        validFrom: null,
        validTo: null,
      }
    }

    // Build fabric name
    const fabricName = [
      fabric.material,
      fabric.color,
      fabric.design,
      fabric.work,
    ].filter(Boolean).join(' - ')

    return NextResponse.json({
      fabric: {
        id: fabric.id,
        fabricSku: fabric.fabricSku,
        fabricName: fabricName,
        material: fabric.material,
        color: fabric.color,
        design: fabric.design,
        work: fabric.work,
        costPrice: Number(fabric.costAmount),
        gstPct: Number(fabric.gstRatePct),
        hsnCode: fabric.hsnCode,
        uom: fabric.uom,
        supplier: fabric.supplier,
      },
      supplierPricing,
    })
  } catch (error) {
    console.error('Fabric lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fabric details' },
      { status: 500 }
    )
  }
}
