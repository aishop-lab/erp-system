import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ============================================================
// AMAZON RETURNS ANALYTICS
// ============================================================

export interface ReturnsAnalytics {
  summary: {
    totalReturns: number
    returnRate: number
    totalRefundValue: number
    avgDaysToReturn: number
    uniqueOrdersReturned: number
  }
  byReason: { reason: string; count: number; pct: number }[]
  trend: { month: string; returns: number; orders: number; rate: number }[]
  byProduct: {
    asin: string | null; sku: string | null; productName: string | null
    returns: number; returnRate: number; topReason: string | null
  }[]
  byDisposition: { disposition: string; count: number; pct: number }[]
  financialImpact: {
    totalRefunds: number
    avgRefundAmount: number
    monthlyRefunds: { month: string; refunds: number; amount: number }[]
  }
  timeline: { bucket: string; count: number }[]
}

export async function getReturnsAnalytics(
  tenantId: string,
  opts: { startDate?: string; endDate?: string } = {}
): Promise<ReturnsAnalytics> {
  // Date filter for amazon_returns (ar."returnDate")
  const dateFilter = opts.startDate && opts.endDate
    ? Prisma.sql`AND ar."returnDate" >= ${new Date(opts.startDate)} AND ar."returnDate" <= ${new Date(opts.endDate)}`
    : opts.startDate
      ? Prisma.sql`AND ar."returnDate" >= ${new Date(opts.startDate)}`
      : Prisma.empty

  // Date filter for sales_orders (so."orderedAt")
  const orderDateFilter = opts.startDate && opts.endDate
    ? Prisma.sql`AND so."orderedAt" >= ${new Date(opts.startDate)} AND so."orderedAt" <= ${new Date(opts.endDate)}`
    : opts.startDate
      ? Prisma.sql`AND so."orderedAt" >= ${new Date(opts.startDate)}`
      : Prisma.empty

  const [
    summaryResult,
    reasonResult,
    trendResult,
    productResult,
    dispositionResult,
    refundResult,
    timelineResult,
    eligibleOrdersResult,
  ] = await Promise.all([
    // Query 1 - Summary (refundAmount preferred; falls back to sales_orders.totalAmount)
    prisma.$queryRaw<{ total_returns: string; unique_orders: string; total_refund: string; avg_days: number }[]>`
      SELECT
        COALESCE(SUM(ar.quantity), 0)::text as total_returns,
        COUNT(DISTINCT ar."externalOrderId")::text as unique_orders,
        COALESCE(SUM(COALESCE(ar."refundAmount"::numeric, so."totalAmount"::numeric)), 0)::text as total_refund,
        COALESCE(AVG(
          CASE WHEN ar."returnDate" IS NOT NULL AND so."orderedAt" IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ar."returnDate" - so."orderedAt")) / 86400
          END
        ), 0) as avg_days
      FROM amazon_returns ar
      LEFT JOIN sales_orders so ON ar."orderId" = so.id
      WHERE ar."tenantId" = ${tenantId} ${dateFilter}
    `,

    // Query 2 - By reason
    prisma.$queryRaw<{ reason: string; cnt: string }[]>`
      SELECT COALESCE(ar."returnReason", 'Unknown') as reason, COUNT(*)::text as cnt
      FROM amazon_returns ar
      WHERE ar."tenantId" = ${tenantId} ${dateFilter}
      GROUP BY ar."returnReason"
      ORDER BY COUNT(*) DESC
    `,

    // Query 3 - Monthly trend (FULL OUTER JOIN)
    prisma.$queryRaw<{ month: string; returns: string; orders: string }[]>`
      WITH monthly_returns AS (
        SELECT TO_CHAR(ar."returnDate", 'YYYY-MM') as month, COUNT(DISTINCT ar."externalOrderId")::text as returns
        FROM amazon_returns ar
        WHERE ar."tenantId" = ${tenantId} AND ar."returnDate" IS NOT NULL ${dateFilter}
        GROUP BY TO_CHAR(ar."returnDate", 'YYYY-MM')
      ),
      monthly_orders AS (
        SELECT TO_CHAR(so."orderedAt", 'YYYY-MM') as month, COUNT(*)::text as orders
        FROM sales_orders so
        JOIN sales_platforms sp ON so."platformId" = sp.id
        WHERE so."tenantId" = ${tenantId}
          AND sp.name = 'amazon'
          AND so.status IN ('delivered', 'shipped', 'returned', 'refunded')
          ${orderDateFilter}
        GROUP BY TO_CHAR(so."orderedAt", 'YYYY-MM')
      )
      SELECT
        COALESCE(r.month, o.month) as month,
        COALESCE(r.returns, '0') as returns,
        COALESCE(o.orders, '0') as orders
      FROM monthly_returns r
      FULL OUTER JOIN monthly_orders o ON r.month = o.month
      ORDER BY month
    `,

    // Query 4 - Top returned products (top 25)
    prisma.$queryRaw<{ asin: string | null; sku: string | null; product_name: string | null; returns: string; top_reason: string | null }[]>`
      SELECT ar.asin, ar.sku, MAX(ar."productName") as product_name,
        SUM(ar.quantity)::text as returns,
        (SELECT ar2."returnReason" FROM amazon_returns ar2
         WHERE ar2."tenantId" = ${tenantId}
           AND COALESCE(ar2.sku, ar2.asin) = COALESCE(ar.sku, ar.asin)
         GROUP BY ar2."returnReason" ORDER BY COUNT(*) DESC LIMIT 1
        ) as top_reason
      FROM amazon_returns ar
      WHERE ar."tenantId" = ${tenantId} ${dateFilter}
      GROUP BY ar.asin, ar.sku
      ORDER BY SUM(ar.quantity) DESC
      LIMIT 25
    `,

    // Query 5 - By disposition
    prisma.$queryRaw<{ disposition: string; cnt: string }[]>`
      SELECT COALESCE(ar.disposition, 'Unknown') as disposition, COUNT(*)::text as cnt
      FROM amazon_returns ar
      WHERE ar."tenantId" = ${tenantId} ${dateFilter}
      GROUP BY ar.disposition
      ORDER BY COUNT(*) DESC
    `,

    // Query 6 - Monthly refund data (refundAmount preferred; falls back to sales_orders.totalAmount)
    prisma.$queryRaw<{ month: string; refunds: string; amount: string }[]>`
      SELECT TO_CHAR(ar."returnDate", 'YYYY-MM') as month,
        COUNT(*)::text as refunds,
        COALESCE(SUM(COALESCE(ar."refundAmount"::numeric, so."totalAmount"::numeric)), 0)::text as amount
      FROM amazon_returns ar
      LEFT JOIN sales_orders so ON ar."orderId" = so.id
      WHERE ar."tenantId" = ${tenantId} AND ar."returnDate" IS NOT NULL ${dateFilter}
      GROUP BY TO_CHAR(ar."returnDate", 'YYYY-MM')
      ORDER BY month
    `,

    // Query 7 - Return timeline buckets
    prisma.$queryRaw<{ bucket: string; cnt: string }[]>`
      SELECT
        CASE
          WHEN days <= 3 THEN '0-3 days'
          WHEN days <= 7 THEN '4-7 days'
          WHEN days <= 14 THEN '8-14 days'
          WHEN days <= 30 THEN '15-30 days'
          ELSE '30+ days'
        END as bucket,
        COUNT(*)::text as cnt
      FROM (
        SELECT EXTRACT(EPOCH FROM (ar."returnDate" - so."orderedAt")) / 86400 as days
        FROM amazon_returns ar
        JOIN sales_orders so ON ar."orderId" = so.id
        WHERE ar."tenantId" = ${tenantId} AND ar."returnDate" IS NOT NULL AND so."orderedAt" IS NOT NULL ${dateFilter}
      ) sub
      GROUP BY bucket
      ORDER BY MIN(days)
    `,

    // Total eligible orders for return rate calculation
    prisma.$queryRaw<{ total: string }[]>`
      SELECT COUNT(*)::text as total
      FROM sales_orders so
      JOIN sales_platforms sp ON so."platformId" = sp.id
      WHERE so."tenantId" = ${tenantId}
        AND sp.name = 'amazon'
        AND so.status IN ('delivered', 'shipped', 'returned', 'refunded')
        ${orderDateFilter}
    `,
  ])

  // Parse summary
  const summary = summaryResult[0] || { total_returns: '0', unique_orders: '0', total_refund: '0', avg_days: 0 }
  const totalReturns = parseInt(summary.total_returns, 10)
  const totalEligibleOrders = parseInt(eligibleOrdersResult[0]?.total || '0', 10)

  // Parse by-reason with percentages
  const totalReasonCount = reasonResult.reduce((sum, r) => sum + parseInt(r.cnt, 10), 0)
  const byReason = reasonResult.map(r => {
    const count = parseInt(r.cnt, 10)
    return {
      reason: r.reason,
      count,
      pct: totalReasonCount > 0 ? Math.round((count / totalReasonCount) * 1000) / 10 : 0,
    }
  })

  // Parse trend with rate
  const trend = trendResult.map(r => {
    const returns = parseInt(r.returns, 10)
    const orders = parseInt(r.orders, 10)
    return {
      month: r.month,
      returns,
      orders,
      rate: orders > 0 ? Math.round((returns / orders) * 1000) / 10 : 0,
    }
  })

  // Parse top products
  const byProduct = productResult.map(r => ({
    asin: r.asin,
    sku: r.sku,
    productName: r.product_name,
    returns: parseInt(r.returns, 10),
    returnRate: 0, // Would need per-product order count for accurate rate
    topReason: r.top_reason,
  }))

  // Parse disposition with percentages
  const totalDispositionCount = dispositionResult.reduce((sum, r) => sum + parseInt(r.cnt, 10), 0)
  const byDisposition = dispositionResult.map(r => {
    const count = parseInt(r.cnt, 10)
    return {
      disposition: r.disposition,
      count,
      pct: totalDispositionCount > 0 ? Math.round((count / totalDispositionCount) * 1000) / 10 : 0,
    }
  })

  // Parse financial impact
  const totalRefunds = parseFloat(summary.total_refund)
  const monthlyRefunds = refundResult.map(r => ({
    month: r.month,
    refunds: parseInt(r.refunds, 10),
    amount: parseFloat(r.amount),
  }))
  const totalRefundCount = monthlyRefunds.reduce((sum, r) => sum + r.refunds, 0)

  // Parse timeline
  const timeline = timelineResult.map(r => ({
    bucket: r.bucket,
    count: parseInt(r.cnt, 10),
  }))

  return {
    summary: {
      totalReturns,
      returnRate: totalEligibleOrders > 0
        ? Math.round((parseInt(summary.unique_orders, 10) / totalEligibleOrders) * 1000) / 10
        : 0,
      totalRefundValue: totalRefunds,
      avgDaysToReturn: Math.round(Number(summary.avg_days) * 10) / 10,
      uniqueOrdersReturned: parseInt(summary.unique_orders, 10),
    },
    byReason,
    trend,
    byProduct,
    byDisposition,
    financialImpact: {
      totalRefunds,
      avgRefundAmount: totalRefundCount > 0
        ? Math.round((totalRefunds / totalRefundCount) * 100) / 100
        : 0,
      monthlyRefunds,
    },
    timeline,
  }
}
