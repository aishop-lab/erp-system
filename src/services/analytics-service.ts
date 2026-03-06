import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ============================================================
// FINANCE ANALYTICS
// ============================================================

export interface FinanceAnalytics {
  revenue: {
    total: number
    delivered: number
    shipped: number
    cancelled: number
    refunded: number
  }
  estimatedCOGS: number
  grossMargin: number
  marginPct: number
  revenuePerOrder: number
  payments: {
    paid: { count: number; amount: number }
    pending: { count: number; amount: number }
    refunded: { count: number; amount: number }
  }
  monthlyPnL: {
    month: string
    orders: number
    revenue: number
    estCOGS: number
    margin: number
    marginPct: number
    cancelled: number
    refunded: number
  }[]
  revenueTrend: { month: string; revenue: number; cogs: number }[]
}

export async function getFinanceAnalytics(
  tenantId: string,
  opts: { startDate?: string; endDate?: string } = {}
): Promise<FinanceAnalytics> {
  const dateFilter = opts.startDate && opts.endDate
    ? Prisma.sql`AND so."orderedAt" >= ${new Date(opts.startDate)} AND so."orderedAt" <= ${new Date(opts.endDate)}`
    : opts.startDate
      ? Prisma.sql`AND so."orderedAt" >= ${new Date(opts.startDate)}`
      : Prisma.empty

  const [
    revenueByStatus,
    cogsResult,
    unlinkedCount,
    paymentStats,
    monthlyData,
  ] = await Promise.all([
    // Revenue by status
    prisma.$queryRaw<{ status: string; total: string; cnt: string }[]>`
      SELECT status, COALESCE(SUM("totalAmount"::numeric), 0) as total, COUNT(*)::text as cnt
      FROM sales_orders so
      WHERE so."tenantId" = ${tenantId} ${dateFilter}
      GROUP BY status
    `,

    // Estimated COGS from linked items
    prisma.$queryRaw<{ total_cogs: string }[]>`
      SELECT COALESCE(SUM(fp."costAmount"::numeric * soi.quantity::numeric), 0) as total_cogs
      FROM sales_order_items soi
      JOIN finished_products fp ON soi."finishedProductId" = fp.id
      JOIN sales_orders so ON soi."orderId" = so.id
      WHERE so."tenantId" = ${tenantId}
        AND so.status IN ('delivered', 'shipped')
        ${dateFilter}
    `,

    // Unlinked items count for fallback COGS
    prisma.$queryRaw<{ cnt: string }[]>`
      SELECT COUNT(*)::text as cnt
      FROM sales_order_items soi
      JOIN sales_orders so ON soi."orderId" = so.id
      WHERE so."tenantId" = ${tenantId}
        AND so.status IN ('delivered', 'shipped')
        AND soi."finishedProductId" IS NULL
        ${dateFilter}
    `,

    // Payment breakdown
    prisma.$queryRaw<{ status: string; cnt: string; total: string }[]>`
      SELECT sp.status, COUNT(*)::text as cnt, COALESCE(SUM(sp.amount::numeric), 0) as total
      FROM sales_payments sp
      JOIN sales_orders so ON sp."orderId" = so.id
      WHERE so."tenantId" = ${tenantId} ${dateFilter}
      GROUP BY sp.status
    `,

    // Monthly P&L (two-step: order-level aggregation, then COGS via separate CTE)
    prisma.$queryRaw<{
      month: string; orders: string; revenue: string; est_cogs: string;
      cancelled: string; refunded: string
    }[]>`
      WITH order_stats AS (
        SELECT
          TO_CHAR(so."orderedAt", 'YYYY-MM') as month,
          COUNT(*)::text as orders,
          COALESCE(SUM(CASE WHEN so.status IN ('delivered','shipped') THEN so."totalAmount"::numeric ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN so.status = 'cancelled' THEN 1 END)::text as cancelled,
          COUNT(CASE WHEN so.status = 'refunded' THEN 1 END)::text as refunded
        FROM sales_orders so
        WHERE so."tenantId" = ${tenantId} ${dateFilter}
        GROUP BY TO_CHAR(so."orderedAt", 'YYYY-MM')
      ),
      cogs_stats AS (
        SELECT
          TO_CHAR(so."orderedAt", 'YYYY-MM') as month,
          COALESCE(SUM(fp."costAmount"::numeric * soi.quantity::numeric), 0) as est_cogs
        FROM sales_orders so
        JOIN sales_order_items soi ON soi."orderId" = so.id
        JOIN finished_products fp ON soi."finishedProductId" = fp.id
        WHERE so."tenantId" = ${tenantId}
          AND so.status IN ('delivered','shipped')
          ${dateFilter}
        GROUP BY TO_CHAR(so."orderedAt", 'YYYY-MM')
      )
      SELECT os.month, os.orders, os.revenue,
        COALESCE(cs.est_cogs, 0) as est_cogs,
        os.cancelled, os.refunded
      FROM order_stats os
      LEFT JOIN cogs_stats cs ON cs.month = os.month
      ORDER BY os.month
    `,
  ])

  // Build revenue map
  const revMap: Record<string, { total: number; cnt: number }> = {}
  for (const r of revenueByStatus) {
    revMap[r.status] = { total: Number(r.total), cnt: Number(r.cnt) }
  }

  const delivered = revMap['delivered']?.total || 0
  const shipped = revMap['shipped']?.total || 0
  const totalRevenue = delivered + shipped
  const totalOrders = (revMap['delivered']?.cnt || 0) + (revMap['shipped']?.cnt || 0)

  const linkedCOGS = Number(cogsResult[0]?.total_cogs || 0)
  const unlinked = Number(unlinkedCount[0]?.cnt || 0)
  const estimatedCOGS = linkedCOGS + (unlinked * 190)
  const grossMargin = totalRevenue - estimatedCOGS

  // Payments
  const payMap: Record<string, { cnt: number; total: number }> = {}
  for (const p of paymentStats) {
    payMap[p.status] = { cnt: Number(p.cnt), total: Number(p.total) }
  }

  const monthlyPnL = monthlyData.map(m => {
    const rev = Number(m.revenue)
    const cogs = Number(m.est_cogs)
    return {
      month: m.month,
      orders: Number(m.orders),
      revenue: rev,
      estCOGS: cogs,
      margin: rev - cogs,
      marginPct: rev > 0 ? ((rev - cogs) / rev) * 100 : 0,
      cancelled: Number(m.cancelled),
      refunded: Number(m.refunded),
    }
  })

  return {
    revenue: {
      total: totalRevenue,
      delivered,
      shipped,
      cancelled: revMap['cancelled']?.total || 0,
      refunded: revMap['refunded']?.total || 0,
    },
    estimatedCOGS,
    grossMargin,
    marginPct: totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0,
    revenuePerOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    payments: {
      paid: { count: payMap['completed']?.cnt || 0, amount: payMap['completed']?.total || 0 },
      pending: { count: payMap['pending']?.cnt || 0, amount: payMap['pending']?.total || 0 },
      refunded: { count: payMap['refunded']?.cnt || 0, amount: payMap['refunded']?.total || 0 },
    },
    monthlyPnL,
    revenueTrend: monthlyPnL.map(m => ({
      month: m.month,
      revenue: m.revenue,
      cogs: m.estCOGS,
    })),
  }
}

// ============================================================
// AMAZON ANALYTICS
// ============================================================

export interface AmazonAnalytics {
  funnel: { stage: string; count: number; pct: number }[]
  cancellation: { count: number; rate: number; monthlyTrend: { month: string; count: number }[] }
  returns: { count: number; rate: number; value: number }
  refunds: { count: number; value: number; avgRefund: number }
  fulfillment: { afn: number; mfn: number; unknown: number }
  deliveryTimeline: { avgDaysToShip: number; avgDaysToDeliver: number }
  totalOrders: number
  deliveryRate: number
  cancellationRate: number
  returnRate: number
  monthlyTrend: {
    month: string; total: number; delivered: number; cancelled: number;
    returned: number; revenue: number
  }[]
}

export async function getAmazonAnalytics(
  tenantId: string,
  opts: { startDate?: string; endDate?: string } = {}
): Promise<AmazonAnalytics> {
  const dateFilter = opts.startDate && opts.endDate
    ? Prisma.sql`AND so."orderedAt" >= ${new Date(opts.startDate)} AND so."orderedAt" <= ${new Date(opts.endDate)}`
    : opts.startDate
      ? Prisma.sql`AND so."orderedAt" >= ${new Date(opts.startDate)}`
      : Prisma.empty

  const [
    statusCounts,
    fulfillmentData,
    timelineData,
    monthlyTrendData,
    refundData,
    cancellationTrend,
  ] = await Promise.all([
    // Status distribution
    prisma.$queryRaw<{ status: string; cnt: string; total: string }[]>`
      SELECT so.status, COUNT(*)::text as cnt, COALESCE(SUM(so."totalAmount"::numeric), 0) as total
      FROM sales_orders so
      JOIN sales_platforms sp ON so."platformId" = sp.id
      WHERE so."tenantId" = ${tenantId} AND sp.name = 'amazon' ${dateFilter}
      GROUP BY so.status
    `,

    // Fulfillment channel from metadata
    prisma.$queryRaw<{ channel: string; cnt: string }[]>`
      SELECT
        COALESCE(so."platformMetadata"->>'fulfillment_channel', 'Unknown') as channel,
        COUNT(*)::text as cnt
      FROM sales_orders so
      JOIN sales_platforms sp ON so."platformId" = sp.id
      WHERE so."tenantId" = ${tenantId} AND sp.name = 'amazon' ${dateFilter}
      GROUP BY channel
    `,

    // Avg delivery timeline
    prisma.$queryRaw<{ avg_ship_days: string; avg_deliver_days: string }[]>`
      SELECT
        COALESCE(AVG(EXTRACT(EPOCH FROM (so."shippedAt" - so."orderedAt")) / 86400), 0) as avg_ship_days,
        COALESCE(AVG(EXTRACT(EPOCH FROM (so."deliveredAt" - so."orderedAt")) / 86400), 0) as avg_deliver_days
      FROM sales_orders so
      JOIN sales_platforms sp ON so."platformId" = sp.id
      WHERE so."tenantId" = ${tenantId} AND sp.name = 'amazon'
        AND so."shippedAt" IS NOT NULL
        ${dateFilter}
    `,

    // Monthly trend
    prisma.$queryRaw<{
      month: string; total: string; delivered: string; cancelled: string;
      returned: string; revenue: string
    }[]>`
      SELECT
        TO_CHAR(so."orderedAt", 'YYYY-MM') as month,
        COUNT(*)::text as total,
        COUNT(CASE WHEN so.status = 'delivered' THEN 1 END)::text as delivered,
        COUNT(CASE WHEN so.status = 'cancelled' THEN 1 END)::text as cancelled,
        COUNT(CASE WHEN so.status = 'returned' THEN 1 END)::text as returned,
        COALESCE(SUM(CASE WHEN so.status IN ('delivered','shipped') THEN so."totalAmount"::numeric ELSE 0 END), 0) as revenue
      FROM sales_orders so
      JOIN sales_platforms sp ON so."platformId" = sp.id
      WHERE so."tenantId" = ${tenantId} AND sp.name = 'amazon' ${dateFilter}
      GROUP BY TO_CHAR(so."orderedAt", 'YYYY-MM')
      ORDER BY month
    `,

    // Refund data
    prisma.$queryRaw<{ cnt: string; total: string }[]>`
      SELECT COUNT(*)::text as cnt, COALESCE(SUM(sp.amount::numeric), 0) as total
      FROM sales_payments sp
      JOIN sales_orders so ON sp."orderId" = so.id
      JOIN sales_platforms plat ON so."platformId" = plat.id
      WHERE so."tenantId" = ${tenantId} AND plat.name = 'amazon' AND sp.status = 'refunded'
        ${dateFilter}
    `,

    // Cancellation monthly trend
    prisma.$queryRaw<{ month: string; cnt: string }[]>`
      SELECT
        TO_CHAR(so."orderedAt", 'YYYY-MM') as month,
        COUNT(*)::text as cnt
      FROM sales_orders so
      JOIN sales_platforms sp ON so."platformId" = sp.id
      WHERE so."tenantId" = ${tenantId} AND sp.name = 'amazon' AND so.status = 'cancelled'
        ${dateFilter}
      GROUP BY TO_CHAR(so."orderedAt", 'YYYY-MM')
      ORDER BY month
    `,
  ])

  // Build status map
  const statMap: Record<string, { cnt: number; total: number }> = {}
  let totalOrders = 0
  for (const s of statusCounts) {
    const cnt = Number(s.cnt)
    statMap[s.status] = { cnt, total: Number(s.total) }
    totalOrders += cnt
  }

  const deliveredCount = statMap['delivered']?.cnt || 0
  const cancelledCount = statMap['cancelled']?.cnt || 0
  const returnedByStatus = statMap['returned']?.cnt || 0
  const shippedCount = statMap['shipped']?.cnt || 0

  const confirmed = totalOrders - cancelledCount
  const shippedOrDelivered = shippedCount + deliveredCount

  // Fulfillment
  const fulMap: Record<string, number> = {}
  for (const f of fulfillmentData) {
    fulMap[f.channel] = Number(f.cnt)
  }

  const refundCount = Number(refundData[0]?.cnt || 0)
  const refundValue = Number(refundData[0]?.total || 0)

  // Returns should use refund payment data (more accurate than order status)
  // Amazon often processes returns as refunds without changing order status to 'returned'
  // Use the higher of: order-status-based returns OR refund-payment-based returns
  const returnedCount = Math.max(returnedByStatus, refundCount)
  // Return rate calculated against delivered+shipped orders (not total, as pending/cancelled aren't eligible for returns)
  const eligibleForReturn = deliveredCount + shippedCount
  const returnRate = eligibleForReturn > 0 ? (returnedCount / eligibleForReturn) * 100 : 0

  return {
    totalOrders,
    deliveryRate: totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0,
    cancellationRate: totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0,
    returnRate,
    funnel: [
      { stage: 'Total Orders', count: totalOrders, pct: 100 },
      { stage: 'Confirmed', count: confirmed, pct: totalOrders > 0 ? (confirmed / totalOrders) * 100 : 0 },
      { stage: 'Shipped/Delivered', count: shippedOrDelivered, pct: totalOrders > 0 ? (shippedOrDelivered / totalOrders) * 100 : 0 },
      { stage: 'Delivered', count: deliveredCount, pct: totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0 },
    ],
    cancellation: {
      count: cancelledCount,
      rate: totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0,
      monthlyTrend: cancellationTrend.map(c => ({ month: c.month, count: Number(c.cnt) })),
    },
    returns: {
      count: returnedCount,
      rate: returnRate,
      value: refundValue || statMap['returned']?.total || 0,
    },
    refunds: {
      count: refundCount,
      value: refundValue,
      avgRefund: refundCount > 0 ? refundValue / refundCount : 0,
    },
    fulfillment: {
      afn: fulMap['AFN'] || fulMap['Amazon'] || 0,
      mfn: fulMap['MFN'] || fulMap['Merchant'] || 0,
      unknown: fulMap['Unknown'] || 0,
    },
    deliveryTimeline: {
      avgDaysToShip: Number(Number(timelineData[0]?.avg_ship_days || 0).toFixed(1)),
      avgDaysToDeliver: Number(Number(timelineData[0]?.avg_deliver_days || 0).toFixed(1)),
    },
    monthlyTrend: monthlyTrendData.map(m => ({
      month: m.month,
      total: Number(m.total),
      delivered: Number(m.delivered),
      cancelled: Number(m.cancelled),
      returned: Number(m.returned),
      revenue: Number(m.revenue),
    })),
  }
}

// ============================================================
// PRODUCT PERFORMANCE
// ============================================================

const SIZE_SORT_ORDER = ['32','34','36','38','40','42','44','46','48','50','XS','S','M','L','XL','2XL','3XL','4XL','5XL']

export interface ProductPerformance {
  summary: {
    productsSold: number
    catalogSize: number
    avgRevenuePerProduct: number
    avgOrdersPerProduct: number
  }
  topSellers: {
    productName: string; sku: string; color: string; size: string;
    styleName: string; orders: number; qty: number; revenue: number
  }[]
  slowMovers: {
    productName: string; sku: string; color: string; size: string;
    styleName: string; orders: number; qty: number; revenue: number
  }[]
  byStyle: { styleName: string; products: number; orders: number; qty: number; revenue: number }[]
  byColor: { color: string; orders: number; qty: number; revenue: number; pct: number }[]
  bySize: { size: string; orders: number; qty: number; revenue: number }[]
}

export async function getProductPerformance(
  tenantId: string,
  opts: { startDate?: string; endDate?: string } = {}
): Promise<ProductPerformance> {
  const dateFilter = opts.startDate && opts.endDate
    ? Prisma.sql`AND so."orderedAt" >= ${new Date(opts.startDate)} AND so."orderedAt" <= ${new Date(opts.endDate)}`
    : opts.startDate
      ? Prisma.sql`AND so."orderedAt" >= ${new Date(opts.startDate)}`
      : Prisma.empty

  const [
    catalogSize,
    topSellersData,
    slowMoversData,
    styleData,
    colorData,
    sizeData,
  ] = await Promise.all([
    prisma.finishedProduct.count({ where: { tenantId, status: 'active' } }),

    // Top 20 by revenue
    prisma.$queryRaw<{
      product_name: string; sku: string; color: string; size: string;
      style_name: string; orders: string; qty: string; revenue: string
    }[]>`
      SELECT
        fp.title as product_name,
        fp."childSku" as sku,
        fp.color,
        fp.size,
        s."styleName" as style_name,
        COUNT(DISTINCT soi."orderId")::text as orders,
        SUM(soi.quantity)::text as qty,
        SUM(soi.total::numeric)::text as revenue
      FROM sales_order_items soi
      JOIN finished_products fp ON soi."finishedProductId" = fp.id
      JOIN styles s ON fp."styleId" = s.id
      JOIN sales_orders so ON soi."orderId" = so.id
      WHERE so."tenantId" = ${tenantId}
        AND so.status IN ('delivered', 'shipped')
        ${dateFilter}
      GROUP BY fp.id, fp.title, fp."childSku", fp.color, fp.size, s."styleName"
      ORDER BY SUM(soi.total::numeric) DESC
      LIMIT 20
    `,

    // Bottom 20 slow movers
    prisma.$queryRaw<{
      product_name: string; sku: string; color: string; size: string;
      style_name: string; orders: string; qty: string; revenue: string
    }[]>`
      SELECT
        fp.title as product_name,
        fp."childSku" as sku,
        fp.color,
        fp.size,
        s."styleName" as style_name,
        COUNT(DISTINCT soi."orderId")::text as orders,
        SUM(soi.quantity)::text as qty,
        SUM(soi.total::numeric)::text as revenue
      FROM sales_order_items soi
      JOIN finished_products fp ON soi."finishedProductId" = fp.id
      JOIN styles s ON fp."styleId" = s.id
      JOIN sales_orders so ON soi."orderId" = so.id
      WHERE so."tenantId" = ${tenantId}
        AND so.status IN ('delivered', 'shipped')
        ${dateFilter}
      GROUP BY fp.id, fp.title, fp."childSku", fp.color, fp.size, s."styleName"
      ORDER BY SUM(soi.total::numeric) ASC
      LIMIT 20
    `,

    // By style
    prisma.$queryRaw<{
      style_name: string; products: string; orders: string; qty: string; revenue: string
    }[]>`
      SELECT
        s."styleName" as style_name,
        COUNT(DISTINCT fp.id)::text as products,
        COUNT(DISTINCT soi."orderId")::text as orders,
        SUM(soi.quantity)::text as qty,
        SUM(soi.total::numeric)::text as revenue
      FROM sales_order_items soi
      JOIN finished_products fp ON soi."finishedProductId" = fp.id
      JOIN styles s ON fp."styleId" = s.id
      JOIN sales_orders so ON soi."orderId" = so.id
      WHERE so."tenantId" = ${tenantId}
        AND so.status IN ('delivered', 'shipped')
        ${dateFilter}
      GROUP BY s.id, s."styleName"
      ORDER BY SUM(soi.total::numeric) DESC
    `,

    // By color
    prisma.$queryRaw<{
      color: string; orders: string; qty: string; revenue: string
    }[]>`
      SELECT
        fp.color,
        COUNT(DISTINCT soi."orderId")::text as orders,
        SUM(soi.quantity)::text as qty,
        SUM(soi.total::numeric)::text as revenue
      FROM sales_order_items soi
      JOIN finished_products fp ON soi."finishedProductId" = fp.id
      JOIN sales_orders so ON soi."orderId" = so.id
      WHERE so."tenantId" = ${tenantId}
        AND so.status IN ('delivered', 'shipped')
        ${dateFilter}
      GROUP BY fp.color
      ORDER BY SUM(soi.total::numeric) DESC
    `,

    // By size
    prisma.$queryRaw<{
      size: string; orders: string; qty: string; revenue: string
    }[]>`
      SELECT
        fp.size,
        COUNT(DISTINCT soi."orderId")::text as orders,
        SUM(soi.quantity)::text as qty,
        SUM(soi.total::numeric)::text as revenue
      FROM sales_order_items soi
      JOIN finished_products fp ON soi."finishedProductId" = fp.id
      JOIN sales_orders so ON soi."orderId" = so.id
      WHERE so."tenantId" = ${tenantId}
        AND so.status IN ('delivered', 'shipped')
        ${dateFilter}
      GROUP BY fp.size
    `,
  ])

  const mapProduct = (r: any) => ({
    productName: r.product_name,
    sku: r.sku,
    color: r.color,
    size: r.size,
    styleName: r.style_name,
    orders: Number(r.orders),
    qty: Number(r.qty),
    revenue: Number(r.revenue),
  })

  const topSellers = topSellersData.map(mapProduct)
  const productsSold = topSellers.length > 0 ? topSellers.length : 0

  // Calculate total revenue for color percentages
  const totalColorRevenue = colorData.reduce((sum, c) => sum + Number(c.revenue), 0)

  // Sort sizes
  const sortedSizes = sizeData
    .map(s => ({
      size: s.size,
      orders: Number(s.orders),
      qty: Number(s.qty),
      revenue: Number(s.revenue),
    }))
    .sort((a, b) => {
      const ai = SIZE_SORT_ORDER.indexOf(a.size)
      const bi = SIZE_SORT_ORDER.indexOf(b.size)
      if (ai === -1 && bi === -1) return a.size.localeCompare(b.size)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })

  // Count unique products sold
  const uniqueProductsSold = await prisma.$queryRaw<{ cnt: string }[]>`
    SELECT COUNT(DISTINCT soi."finishedProductId")::text as cnt
    FROM sales_order_items soi
    JOIN sales_orders so ON soi."orderId" = so.id
    WHERE so."tenantId" = ${tenantId}
      AND soi."finishedProductId" IS NOT NULL
      AND so.status IN ('delivered', 'shipped')
      ${dateFilter}
  `

  const actualProductsSold = Number(uniqueProductsSold[0]?.cnt || 0)
  const totalRevenue = topSellers.reduce((sum, t) => sum + t.revenue, 0) || 1

  return {
    summary: {
      productsSold: actualProductsSold,
      catalogSize,
      avgRevenuePerProduct: actualProductsSold > 0 ? totalColorRevenue / actualProductsSold : 0,
      avgOrdersPerProduct: actualProductsSold > 0
        ? topSellers.reduce((sum, t) => sum + t.orders, 0) / actualProductsSold
        : 0,
    },
    topSellers,
    slowMovers: slowMoversData.map(mapProduct),
    byStyle: styleData.map(s => ({
      styleName: s.style_name,
      products: Number(s.products),
      orders: Number(s.orders),
      qty: Number(s.qty),
      revenue: Number(s.revenue),
    })),
    byColor: colorData.map(c => ({
      color: c.color,
      orders: Number(c.orders),
      qty: Number(c.qty),
      revenue: Number(c.revenue),
      pct: totalColorRevenue > 0 ? (Number(c.revenue) / totalColorRevenue) * 100 : 0,
    })),
    bySize: sortedSizes,
  }
}
