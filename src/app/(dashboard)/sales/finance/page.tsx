'use client'

import { useState } from 'react'
import { subDays, endOfDay, startOfDay } from 'date-fns'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangeFilter, DateRangeValue } from '@/components/shared/date-range-filter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IndianRupee, TrendingUp, Package, Lock, ShoppingCart } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  Delivered: '#16a34a',
  Shipped: '#2563eb',
  Cancelled: '#dc2626',
  Refunded: '#ea580c',
}

const PAYMENT_COLORS = ['#16a34a', '#eab308', '#dc2626']

export default function SalesFinancePage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: startOfDay(subDays(new Date(), 365)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  })

  const params = new URLSearchParams()
  if (dateRange.startDate) params.set('startDate', dateRange.startDate)
  if (dateRange.endDate) params.set('endDate', dateRange.endDate)

  const { data, error, isLoading: loading, isValidating } = useSWR(`/api/sales/finance?${params}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    keepPreviousData: false,
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const fmtCompact = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
    if (n >= 1000) return `${(n / 1000).toFixed(1)} K`
    return n.toFixed(0)
  }

  if (loading || (!data && isValidating)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Finance Analytics" description="Revenue, COGS estimates, and P&L overview" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-[260px] animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2">
            <div className="h-5 w-52 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[280px] animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 border-b px-6 py-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                    <div key={j} className="h-4 flex-1 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Finance Analytics" description="Revenue, COGS estimates, and P&L overview" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">Failed to load finance data</p>
            <p className="mt-1 text-sm">Please try refreshing the page or check back later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const revenueByStatus = [
    { name: 'Delivered', value: data.revenue.delivered },
    { name: 'Shipped', value: data.revenue.shipped },
    { name: 'Cancelled', value: data.revenue.cancelled },
    { name: 'Refunded', value: data.revenue.refunded },
  ].filter(r => r.value > 0)

  const paymentData = [
    { name: 'Paid', value: data.payments.paid.total, count: data.payments.paid.cnt },
    { name: 'Pending', value: data.payments.pending.total, count: data.payments.pending.cnt },
    { name: 'Refunded', value: data.payments.refunded.total, count: data.payments.refunded.cnt },
  ].filter(p => p.value > 0)

  const paymentTotal = paymentData.reduce((sum, p) => sum + p.value, 0)

  // Compute totals row for P&L
  const pnlTotals = data.monthlyPnL?.reduce(
    (acc: any, m: any) => ({
      orders: acc.orders + (m.orders || 0),
      revenue: acc.revenue + (m.revenue || 0),
      estCOGS: acc.estCOGS + (m.estCOGS || 0),
      margin: acc.margin + (m.margin || 0),
      cancelled: acc.cancelled + (m.cancelled || 0),
      refunded: acc.refunded + (m.refunded || 0),
    }),
    { orders: 0, revenue: 0, estCOGS: 0, margin: 0, cancelled: 0, refunded: 0 }
  )
  if (pnlTotals) {
    pnlTotals.marginPct = pnlTotals.revenue > 0 ? (pnlTotals.margin / pnlTotals.revenue) * 100 : 0
  }

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border bg-white p-3 shadow-md dark:bg-gray-900">
        <p className="mb-1 text-sm font-medium">{label}</p>
        <p className="text-sm font-semibold" style={{ color: payload[0]?.fill }}>
          {fmt(payload[0]?.value || 0)}
        </p>
      </div>
    )
  }

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const entry = payload[0]
    return (
      <div className="rounded-lg border bg-white p-3 shadow-md dark:bg-gray-900">
        <p className="mb-1 text-sm font-medium">{entry.name}</p>
        <p className="text-sm font-semibold" style={{ color: entry.payload?.fill }}>
          {fmt(entry.value)}
        </p>
        <p className="text-xs text-muted-foreground">{entry.payload?.count} orders</p>
      </div>
    )
  }

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border bg-white p-3 shadow-md dark:bg-gray-900">
        <p className="mb-1.5 text-sm font-medium">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.stroke }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: fmt(data.revenue.total),
      subtitle: 'Delivered + Shipped',
      icon: IndianRupee,
      borderColor: 'border-l-green-500',
      iconBg: 'bg-green-50 dark:bg-green-950/40',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Estimated COGS',
      value: fmt(data.estimatedCOGS),
      subtitle: 'From product cost data',
      icon: Package,
      borderColor: 'border-l-orange-500',
      iconBg: 'bg-orange-50 dark:bg-orange-950/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Gross Margin',
      value: fmt(data.grossMargin),
      subtitle: `${data.marginPct.toFixed(1)}% margin`,
      icon: TrendingUp,
      borderColor: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Revenue / Order',
      value: fmt(data.revenuePerOrder),
      subtitle: `${data.revenuePerOrder > 0 ? Math.round(data.revenue.total / data.revenuePerOrder).toLocaleString('en-IN') : 0} orders`,
      icon: ShoppingCart,
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Analytics"
        description="Revenue, COGS estimates, and P&L overview"
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Finance' },
        ]}
        actions={
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
          <Card key={card.label} className={`border-l-4 ${card.borderColor}`}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue by Status + Payment Collection */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByStatus} layout="vertical" margin={{ left: 0, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  type="number"
                  tickFormatter={fmtCompact}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 13, fill: 'hsl(var(--foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Bar
                  dataKey="value"
                  radius={[0, 6, 6, 0]}
                  barSize={28}
                  label={{
                    position: 'right',
                    formatter: (v: any) => fmtCompact(Number(v)),
                    fontSize: 12,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                >
                  {revenueByStatus.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Payment Collection</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-sm text-foreground">{value}</span>
                    )}
                  />
                  {/* Center text */}
                  <text
                    x="50%"
                    y="46%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    fontSize={12}
                  >
                    Total
                  </text>
                  <text
                    x="50%"
                    y="55%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground"
                    fontSize={15}
                    fontWeight={700}
                  >
                    {fmtCompact(paymentTotal)}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center">
                <p className="text-sm text-muted-foreground">No payment data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs COGS Trend */}
      {data.revenueTrend?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue vs Estimated COGS Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCOGS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-sm text-muted-foreground">{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#gradRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="cogs"
                  name="Est. COGS"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fill="url(#gradCOGS)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly P&L Table */}
      {data.monthlyPnL?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly P&L</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="border-b-2 hover:bg-transparent">
                    <TableHead className="py-2.5 pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orders</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Est. COGS</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin %</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cancelled</TableHead>
                    <TableHead className="py-2.5 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Refunded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.monthlyPnL.map((m: any, idx: number) => (
                    <TableRow key={m.month} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                      <TableCell className="py-2.5 pl-6 font-medium">{m.month}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{m.orders.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{fmt(m.revenue)}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{fmt(m.estCOGS)}</TableCell>
                      <TableCell className={`py-2.5 text-right tabular-nums ${m.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(m.margin)}
                      </TableCell>
                      <TableCell className={`py-2.5 text-right tabular-nums ${m.marginPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.marginPct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-red-600">{m.cancelled}</TableCell>
                      <TableCell className="py-2.5 pr-6 text-right tabular-nums text-orange-600">{m.refunded}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  {pnlTotals && (
                    <TableRow className="border-t-2 bg-muted/50 font-bold hover:bg-muted/50">
                      <TableCell className="py-3 pl-6 font-bold">Total</TableCell>
                      <TableCell className="py-3 text-right tabular-nums font-bold">{pnlTotals.orders.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums font-bold">{fmt(pnlTotals.revenue)}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums font-bold">{fmt(pnlTotals.estCOGS)}</TableCell>
                      <TableCell className={`py-3 text-right tabular-nums font-bold ${pnlTotals.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(pnlTotals.margin)}
                      </TableCell>
                      <TableCell className={`py-3 text-right tabular-nums font-bold ${pnlTotals.marginPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlTotals.marginPct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums font-bold text-red-600">{pnlTotals.cancelled}</TableCell>
                      <TableCell className="py-3 pr-6 text-right tabular-nums font-bold text-orange-600">{pnlTotals.refunded}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coming Soon Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {['Platform Fees', 'Expense Tracking', 'Marketplace Settlements'].map(title => (
          <Card key={title} className="border-dashed bg-muted/20">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground/70">Coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
