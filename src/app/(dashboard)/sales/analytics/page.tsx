'use client'

import { useState } from 'react'
import Link from 'next/link'
import { subDays, endOfDay, startOfDay, format } from 'date-fns'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DateRangeFilter, DateRangeValue } from '@/components/shared/date-range-filter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  ShoppingCart,
  TrendingUp,
  IndianRupee,
  CheckCircle,
  ArrowUpRight,
} from 'lucide-react'
import { SALES_ORDER_STATUS_MAP } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_COLORS: Record<string, string> = {
  amazon: '#2563eb',
  shopify: '#16a34a',
}

const STATUS_CHART_COLORS: Record<string, string> = {
  delivered: '#16a34a',
  pending: '#ca8a04',
  cancelled: '#dc2626',
  other: '#94a3b8',
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltips
// ---------------------------------------------------------------------------

function AreaTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm font-semibold text-foreground">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.payload.fill }}
        />
        <span className="text-sm font-medium">{item.name}</span>
      </div>
      <p className="mt-1 text-sm font-semibold">
        {item.value.toLocaleString()} orders
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton Loading State
// ---------------------------------------------------------------------------

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-l-4 border-l-muted bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-6 w-28 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column chart skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card">
            <div className="p-6 pb-3">
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            </div>
            <div className="px-6 pb-6">
              <div className="h-[240px] w-full animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Revenue trend skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 pb-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="px-6 pb-6">
          <div className="h-[280px] w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-6 pb-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="px-6 pb-6 space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SalesAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: startOfDay(subDays(new Date(), 30)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  })

  const params = new URLSearchParams()
  if (dateRange.startDate) params.set('startDate', dateRange.startDate)
  if (dateRange.endDate) params.set('endDate', dateRange.endDate)

  const { data, isLoading: loading } = useSWR(
    `/api/sales/dashboard?${params}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )

  // -- Formatters --

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)

  const formatCompact = (amount: number) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)} Cr`
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)} L`
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`
    return amount.toFixed(0)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    })
  }

  // -- Loading --

  if (loading) {
    return <SkeletonDashboard />
  }

  // -- Derived data --

  const delivered = data?.deliveredOrders || 0
  const pending = data?.pendingOrders || 0
  const cancelled = data?.cancelledOrders || 0
  const other = (data?.totalOrders || 0) - delivered - pending - cancelled

  const statusData: { name: string; value: number; fill: string }[] = []
  if (delivered > 0)
    statusData.push({ name: 'Delivered', value: delivered, fill: STATUS_CHART_COLORS.delivered })
  if (pending > 0)
    statusData.push({ name: 'Pending', value: pending, fill: STATUS_CHART_COLORS.pending })
  if (cancelled > 0)
    statusData.push({ name: 'Cancelled', value: cancelled, fill: STATUS_CHART_COLORS.cancelled })
  if (other > 0)
    statusData.push({ name: 'Other', value: other, fill: STATUS_CHART_COLORS.other })

  const chartData = (data?.dailyRevenue || []).map((d: any) => ({
    date: format(new Date(d.date), 'dd MMM'),
    revenue: d.revenue,
    orders: d.orders,
  }))

  const statCards = [
    {
      label: 'Total Orders',
      value: (data?.totalOrders || 0).toLocaleString(),
      icon: ShoppingCart,
      border: 'border-l-blue-500',
      bg: 'bg-blue-50',
      fg: 'text-blue-600',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(data?.totalRevenue || 0),
      icon: IndianRupee,
      border: 'border-l-emerald-500',
      bg: 'bg-emerald-50',
      fg: 'text-emerald-600',
    },
    {
      label: 'Delivered',
      value: (data?.deliveredOrders || 0).toLocaleString(),
      icon: CheckCircle,
      border: 'border-l-green-500',
      bg: 'bg-green-50',
      fg: 'text-green-600',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(data?.avgOrderValue || 0),
      icon: TrendingUp,
      border: 'border-l-violet-500',
      bg: 'bg-violet-50',
      fg: 'text-violet-600',
    },
  ]

  // -- Render --

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Analytics"
        description="Overview of sales performance across all platforms"
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Analytics' },
        ]}
        actions={
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Stat Cards                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className={`border-l-4 ${card.border}`}>
              <CardContent className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${card.fg}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Platform Breakdown + Order Status (two-column)                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.platformBreakdown?.length > 0 ? (
              <div className="space-y-5">
                {data.platformBreakdown.map((p: any) => {
                  const pct =
                    data.totalOrders > 0 ? (p.orders / data.totalOrders) * 100 : 0
                  const key = (p.platform || '').toLowerCase()
                  const barColor = PLATFORM_COLORS[key] || '#6b7280'
                  return (
                    <div key={p.platform} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: barColor }}
                          />
                          <span className="text-sm font-medium">{p.platform}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">
                            {p.orders.toLocaleString()} orders
                          </span>
                          <span className="font-semibold">{formatCurrency(p.revenue)}</span>
                        </div>
                      </div>
                      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No platform data available</p>
            )}
          </CardContent>
        </Card>

        {/* Order Status - Donut Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => {
                        const item = statusData.find((d) => d.name === value)
                        return (
                          <span className="text-sm text-foreground">
                            {value}{' '}
                            <span className="font-semibold">
                              {item?.value.toLocaleString()}
                            </span>
                          </span>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No order data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Revenue Trend - Area Chart                                         */}
      {/* ------------------------------------------------------------------ */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(v)}
                    width={48}
                  />
                  <Tooltip
                    content={
                      <AreaTooltip formatter={(v: number) => formatCurrency(v)} />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Recent Orders                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
          <Link
            href="/sales/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Order #</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentOrders || []).slice(0, 10).map((order: any) => {
                const statusInfo =
                  SALES_ORDER_STATUS_MAP[order.status] || {
                    label: order.status,
                    variant: 'secondary',
                  }
                return (
                  <TableRow
                    key={order.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="py-2.5 pl-6">
                      <Link
                        href={`/sales/orders/${order.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.orderNumber.length > 20
                          ? `...${order.orderNumber.slice(-15)}`
                          : order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm capitalize">
                      {order.platform?.displayName || '-'}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant={statusInfo.variant as any}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-sm font-medium">
                      {formatCurrency(Number(order.totalAmount))}
                    </TableCell>
                    <TableCell className="py-2.5 pr-6 text-sm text-muted-foreground">
                      {formatDate(order.orderedAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
