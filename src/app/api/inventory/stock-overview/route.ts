import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/inventory/stock-overview
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
    const productType = searchParams.get('productType') || undefined
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || 'active'

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: status,
        ...(productType && { productType }),
        ...(search && {
          OR: [
            { sku: { contains: search, mode: 'insensitive' as const } },
            { batchNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      },
      orderBy: [
        { sku: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Group by SKU and calculate totals
    const stockBySku = new Map<string, {
      sku: string
      productType: string
      totalQty: number
      batches: { batchNumber: string; quantity: number; createdAt: Date }[]
      lastUpdated: Date
    }>()

    batches.forEach(batch => {
      const key = batch.sku || 'UNKNOWN'

      if (!stockBySku.has(key)) {
        stockBySku.set(key, {
          sku: key,
          productType: batch.productType || 'unknown',
          totalQty: 0,
          batches: [],
          lastUpdated: batch.updatedAt,
        })
      }

      const stock = stockBySku.get(key)!
      stock.totalQty += Number(batch.currentQty)
      stock.batches.push({
        batchNumber: batch.batchNumber,
        quantity: Number(batch.currentQty),
        createdAt: batch.createdAt,
      })
      if (batch.updatedAt > stock.lastUpdated) {
        stock.lastUpdated = batch.updatedAt
      }
    })

    const stockOverview = Array.from(stockBySku.values())
      .sort((a, b) => a.sku.localeCompare(b.sku))

    const summary = {
      totalSkus: stockOverview.length,
      totalBatches: batches.length,
      byProductType: {
        fabric: stockOverview.filter(s => s.productType === 'fabric').length,
        raw_material: stockOverview.filter(s => s.productType === 'raw_material').length,
        packaging: stockOverview.filter(s => s.productType === 'packaging').length,
        finished: stockOverview.filter(s => s.productType === 'finished').length,
      },
      lowStock: stockOverview.filter(s => s.totalQty > 0 && s.totalQty < 10).length,
      outOfStock: stockOverview.filter(s => s.totalQty === 0).length,
    }

    return NextResponse.json({
      data: stockOverview,
      summary,
    })
  } catch (error) {
    console.error('Error fetching stock overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock overview' },
      { status: 500 }
    )
  }
}
