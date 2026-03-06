import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/amazon/inventory
// Returns inventory comparison: actual (WarehouseStock) vs Amazon FBA inventory
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const style = searchParams.get('style') || undefined
    const color = searchParams.get('color') || undefined
    const category = searchParams.get('category') || undefined

    // Get all warehouse stocks with their product details and warehouse info
    const warehouseStocks = await prisma.warehouseStock.findMany({
      where: {
        tenantId: auth.user.tenantId,
        ...(search && {
          OR: [
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            isFba: true,
          },
        },
        finishedProduct: {
          select: {
            id: true,
            childSku: true,
            parentSku: true,
            title: true,
            color: true,
            size: true,
            style: {
              select: { id: true, styleName: true, category: true },
            },
          },
        },
      },
      orderBy: { sku: 'asc' },
    })

    // Get platform mappings for ASIN info
    const mappings = await prisma.platformMapping.findMany({
      where: {
        tenantId: auth.user.tenantId,
        asin: { not: null },
      },
      select: {
        finishedProductId: true,
        asin: true,
        externalSku: true,
      },
    })

    // Build a map: finishedProductId -> { asin, externalSku }
    const asinMap = new Map<string, { asin: string | null; externalSku: string | null }>()
    for (const m of mappings) {
      if (m.finishedProductId) {
        asinMap.set(m.finishedProductId, { asin: m.asin, externalSku: m.externalSku })
      }
    }

    // Group stocks by SKU: separate actual (non-FBA) vs Amazon (FBA) warehouses
    const skuMap = new Map<string, {
      sku: string
      asin: string | null
      barcode: string | null
      styleName: string | null
      category: string | null
      color: string | null
      size: string | null
      title: string | null
      finishedProductId: string | null
      actualQty: number
      amazonQty: number
    }>()

    for (const ws of warehouseStocks) {
      const sku = ws.sku || 'UNKNOWN'

      if (!skuMap.has(sku)) {
        const mapping = ws.finishedProductId ? asinMap.get(ws.finishedProductId) : null
        skuMap.set(sku, {
          sku,
          asin: mapping?.asin || null,
          barcode: mapping?.externalSku || null,
          styleName: ws.finishedProduct?.style?.styleName || null,
          category: ws.finishedProduct?.style?.category || null,
          color: ws.finishedProduct?.color || null,
          size: ws.finishedProduct?.size || null,
          title: ws.finishedProduct?.title || null,
          finishedProductId: ws.finishedProductId,
          actualQty: 0,
          amazonQty: 0,
        })
      }

      const entry = skuMap.get(sku)!
      if (ws.warehouse.isFba) {
        entry.amazonQty += ws.qtyOnHand
      } else {
        entry.actualQty += ws.qtyOnHand
      }
    }

    let items = Array.from(skuMap.values())

    // Apply filters
    if (style) {
      items = items.filter(i => i.styleName?.toLowerCase() === style.toLowerCase())
    }
    if (color) {
      items = items.filter(i => i.color?.toLowerCase() === color.toLowerCase())
    }
    if (category) {
      items = items.filter(i => i.category?.toLowerCase() === category.toLowerCase())
    }

    // Compute priority based on discrepancy
    const enriched = items.map(item => {
      const diff = item.actualQty - item.amazonQty
      const absDiff = Math.abs(diff)
      let priority: 'none' | 'low' | 'medium' | 'high' = 'none'
      if (absDiff === 0) priority = 'none'
      else if (absDiff <= 2) priority = 'low'
      else if (absDiff <= 10) priority = 'medium'
      else priority = 'high'

      return { ...item, diff, priority }
    })

    // Sort: high priority first, then medium, low, none
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 }
    enriched.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.sku.localeCompare(b.sku))

    // Compute summary
    const totalSkus = enriched.length
    const matching = enriched.filter(i => i.diff === 0).length
    const discrepancies = totalSkus - matching
    const highPriority = enriched.filter(i => i.priority === 'high').length

    // Extract unique filter values
    const stylesSet: string[] = []
    const colorsSet: string[] = []
    const categoriesSet: string[] = []
    const seenStyles = new Set<string>()
    const seenColors = new Set<string>()
    const seenCategories = new Set<string>()

    for (const item of items) {
      if (item.styleName && !seenStyles.has(item.styleName)) {
        seenStyles.add(item.styleName)
        stylesSet.push(item.styleName)
      }
      if (item.color && !seenColors.has(item.color)) {
        seenColors.add(item.color)
        colorsSet.push(item.color)
      }
      if (item.category && !seenCategories.has(item.category)) {
        seenCategories.add(item.category)
        categoriesSet.push(item.category)
      }
    }

    return cachedJsonResponse({
      data: enriched,
      summary: { totalSkus, matching, discrepancies, highPriority },
      filters: {
        styles: stylesSet.sort(),
        colors: colorsSet.sort(),
        categories: categoriesSet.sort(),
      },
    }, 30)
  } catch (error) {
    console.error('Error fetching Amazon inventory comparison:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory comparison' },
      { status: 500 }
    )
  }
}
