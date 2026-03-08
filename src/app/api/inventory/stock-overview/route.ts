import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/inventory/stock-overview
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const productType = searchParams.get('productType') || undefined
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || 'active'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50') || 50))

    // Build WHERE conditions for raw SQL
    const conditions = [
      Prisma.sql`"tenantId" = ${auth.user.tenantId}`,
      Prisma.sql`status = ${status}`,
    ]
    if (productType) {
      conditions.push(Prisma.sql`"productType" = ${productType}`)
    }
    if (search) {
      conditions.push(Prisma.sql`(sku ILIKE ${'%' + search + '%'} OR "batchNumber" ILIKE ${'%' + search + '%'})`)
    }
    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

    // Use SQL GROUP BY for aggregation instead of loading all batches into memory
    const [stockOverview, summaryResult] = await Promise.all([
      prisma.$queryRaw<{
        sku: string; product_type: string; total_qty: string;
        batch_count: string; last_updated: Date
      }[]>`
        SELECT
          COALESCE(sku, 'UNKNOWN') as sku,
          COALESCE("productType", 'unknown') as product_type,
          SUM("currentQty")::text as total_qty,
          COUNT(*)::text as batch_count,
          MAX("updatedAt") as last_updated
        FROM inventory_batches
        ${whereClause}
        GROUP BY COALESCE(sku, 'UNKNOWN'), COALESCE("productType", 'unknown')
        ORDER BY sku ASC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `,
      prisma.$queryRaw<{
        total_skus: string; total_batches: string
        fabric: string; raw_material: string; packaging: string; finished: string
        low_stock: string; out_of_stock: string
      }[]>`
        SELECT
          COUNT(DISTINCT COALESCE(sku, 'UNKNOWN'))::text as total_skus,
          COUNT(*)::text as total_batches,
          COUNT(DISTINCT CASE WHEN "productType" = 'fabric' THEN sku END)::text as fabric,
          COUNT(DISTINCT CASE WHEN "productType" = 'raw_material' THEN sku END)::text as raw_material,
          COUNT(DISTINCT CASE WHEN "productType" = 'packaging' THEN sku END)::text as packaging,
          COUNT(DISTINCT CASE WHEN "productType" = 'finished' THEN sku END)::text as finished,
          COUNT(DISTINCT CASE WHEN sub.total > 0 AND sub.total < 10 THEN sub.sku END)::text as low_stock,
          COUNT(DISTINCT CASE WHEN sub.total = 0 THEN sub.sku END)::text as out_of_stock
        FROM (
          SELECT COALESCE(sku, 'UNKNOWN') as sku, "productType", SUM("currentQty") as total
          FROM inventory_batches
          ${whereClause}
          GROUP BY COALESCE(sku, 'UNKNOWN'), "productType"
        ) sub
      `,
    ])

    const s = summaryResult[0]
    const totalSkus = Number(s?.total_skus || 0)

    const data = stockOverview.map(row => ({
      sku: row.sku,
      productType: row.product_type,
      totalQty: Number(row.total_qty),
      batchCount: Number(row.batch_count),
      lastUpdated: row.last_updated,
    }))

    return NextResponse.json({
      data,
      summary: {
        totalSkus,
        totalBatches: Number(s?.total_batches || 0),
        byProductType: {
          fabric: Number(s?.fabric || 0),
          raw_material: Number(s?.raw_material || 0),
          packaging: Number(s?.packaging || 0),
          finished: Number(s?.finished || 0),
        },
        lowStock: Number(s?.low_stock || 0),
        outOfStock: Number(s?.out_of_stock || 0),
      },
      page,
      pageSize,
      totalPages: Math.ceil(totalSkus / pageSize),
    })
  } catch (error) {
    console.error('Error fetching stock overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock overview' },
      { status: 500 }
    )
  }
}
