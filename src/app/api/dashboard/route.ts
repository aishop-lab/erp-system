import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { cached } from '@/lib/cache'

export async function GET() {
  const auth = await authenticateRequest()
  if (auth.response) return auth.response

  const { tenantId } = auth.user

  const data = await cached(`dashboard:${tenantId}`, 2 * 60 * 1000, () => fetchDashboard(tenantId))
  return cachedJsonResponse(data, 60)
}

async function fetchDashboard(tenantId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [ordersThisMonth, activeProducts, activeSuppliers, pendingPayments, recentPOs, recentSalesOrders, revenueTrend] = await Promise.all([
    prisma.purchaseOrder.count({
      where: { tenantId, createdAt: { gte: startOfMonth } },
    }),
    prisma.finishedProduct.count({
      where: { tenantId, status: 'active' },
    }),
    prisma.supplier.count({
      where: { tenantId, isActive: true },
    }),
    prisma.payment.count({
      where: { tenantId, status: { in: ['pending_approval', 'approved'] } },
    }),
    prisma.purchaseOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        poNumber: true,
        status: true,
        purchaseType: true,
        totalAmount: true,
        createdAt: true,
        supplier: { select: { name: true } },
      },
    }),
    prisma.salesOrder.findMany({
      where: { tenantId },
      orderBy: { orderedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        platform: { select: { name: true } },
        status: true,
        totalAmount: true,
        orderedAt: true,
      },
    }),
    prisma.$queryRaw<Array<{ date: string; revenue: number; orders: number }>>(
      Prisma.sql`
        SELECT
          TO_CHAR("orderedAt", 'YYYY-MM-DD') as date,
          COALESCE(SUM("totalAmount"), 0)::float as revenue,
          COUNT(*)::int as orders
        FROM sales_orders
        WHERE "tenantId" = ${tenantId}
          AND "orderedAt" >= ${thirtyDaysAgo}
          AND "status" NOT IN ('cancelled', 'refunded')
        GROUP BY TO_CHAR("orderedAt", 'YYYY-MM-DD')
        ORDER BY date ASC
      `
    ),
  ])

  // Fill in missing days with zero values
  const revenueMap = new Map(revenueTrend.map(r => [r.date, r]))
  const dailyRevenue: Array<{ date: string; revenue: number; orders: number }> = []
  for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const entry = revenueMap.get(dateStr)
    dailyRevenue.push({
      date: dateStr,
      revenue: entry ? Math.round(entry.revenue) : 0,
      orders: entry ? entry.orders : 0,
    })
  }

  const totalRevenue30d = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0)
  const totalOrders30d = dailyRevenue.reduce((sum, d) => sum + d.orders, 0)
  const avgDailyRevenue = Math.round(totalRevenue30d / 30)

  return {
    stats: {
      ordersThisMonth,
      activeProducts,
      activeSuppliers,
      pendingPayments,
    },
    recentPOs,
    recentSalesOrders,
    revenueTrend: {
      daily: dailyRevenue,
      totalRevenue: totalRevenue30d,
      totalOrders: totalOrders30d,
      avgDailyRevenue,
    },
  }
}
