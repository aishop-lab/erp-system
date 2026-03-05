import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface SalesOrderFilters {
  tenantId: string
  status?: string
  platformId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface SalesDashboardStats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  deliveredOrders: number
  cancelledOrders: number
  avgOrderValue: number
  platformBreakdown: { platform: string; orders: number; revenue: number }[]
  recentOrders: any[]
  dailyRevenue: { date: string; revenue: number; orders: number }[]
}

export async function getSalesOrders(filters: SalesOrderFilters) {
  const {
    tenantId,
    status,
    platformId,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
  } = filters

  const where: Prisma.SalesOrderWhereInput = { tenantId }

  if (status) where.status = status as any
  if (platformId) where.platformId = platformId

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { externalOrderId: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (dateFrom || dateTo) {
    where.orderedAt = {}
    if (dateFrom) where.orderedAt.gte = new Date(dateFrom)
    if (dateTo) where.orderedAt.lte = new Date(dateTo)
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        platform: { select: { id: true, name: true, displayName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { orderedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesOrder.count({ where }),
  ])

  return { orders, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getSalesOrderById(id: string, tenantId: string) {
  return prisma.salesOrder.findFirst({
    where: { id, tenantId },
    include: {
      platform: true,
      items: true,
      salesPayments: true,
    },
  })
}

export async function getSalesDashboard(tenantId: string, days = 30): Promise<SalesDashboardStats> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [
    totalOrders,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    revenueAgg,
    platformStats,
    recentOrders,
    dailyRevenue,
  ] = await Promise.all([
    prisma.salesOrder.count({ where: { tenantId } }),
    prisma.salesOrder.count({ where: { tenantId, status: 'pending' } }),
    prisma.salesOrder.count({ where: { tenantId, status: 'delivered' } }),
    prisma.salesOrder.count({ where: { tenantId, status: 'cancelled' } }),
    prisma.salesOrder.aggregate({
      where: { tenantId },
      _sum: { totalAmount: true },
    }),
    prisma.salesOrder.groupBy({
      by: ['platformId'],
      where: { tenantId },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.salesOrder.findMany({
      where: { tenantId },
      include: {
        platform: { select: { name: true, displayName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { orderedAt: 'desc' },
      take: 10,
    }),
    prisma.salesRevenue.findMany({
      where: { tenantId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
  ])

  // Get platform names for breakdown
  const platformIds = platformStats.map((p: any) => p.platformId)
  const platforms = await prisma.salesPlatform.findMany({
    where: { id: { in: platformIds } },
    select: { id: true, displayName: true },
  })
  const platformNameMap = Object.fromEntries(platforms.map((p: any) => [p.id, p.displayName]))

  const totalRevenue = Number(revenueAgg._sum.totalAmount || 0)

  // Aggregate daily revenue
  const dailyMap = new Map<string, { revenue: number; orders: number }>()
  for (const r of dailyRevenue) {
    const day = new Date(r.date).toISOString().split('T')[0]
    const existing = dailyMap.get(day) || { revenue: 0, orders: 0 }
    existing.revenue += Number(r.netRevenue || 0)
    existing.orders += 1
    dailyMap.set(day, existing)
  }

  return {
    totalOrders,
    totalRevenue,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    platformBreakdown: platformStats.map((p: any) => ({
      platform: platformNameMap[p.platformId] || p.platformId,
      orders: p._count,
      revenue: Number(p._sum.totalAmount || 0),
    })),
    recentOrders,
    dailyRevenue: Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    })),
  }
}

export async function getSalesPlatforms(tenantId: string) {
  return prisma.salesPlatform.findMany({
    where: { tenantId },
    include: {
      _count: { select: { salesOrders: true, platformMappings: true } },
    },
    orderBy: { name: 'asc' },
  })
}
