'use client'

import { useState } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  IndianRupee,
  ShoppingCart,
  TrendingUp,
  RotateCcw,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '365d', days: 365 },
  { label: 'All', days: 0 },
] as const

const STYLE_BAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
]

const PIE_COLORS = [
  'hsl(215, 70%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(48, 96%, 53%)',
  'hsl(0, 84%, 60%)', 'hsl(280, 65%, 50%)', 'hsl(200, 65%, 50%)',
  'hsl(330, 65%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(30, 80%, 50%)',
  'hsl(100, 50%, 40%)',
]

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const fmtCompact = (n: number) => {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`
  if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)} K`
  return n.toFixed(0)
}

const fmtNum = (n: number) => Number(n).toLocaleString('en-IN')

/* ------------------------------------------------------------------ */
/*  Custom Tooltips                                                    */
/* ------------------------------------------------------------------ */

function AreaTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md dark:bg-gray-950">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.stroke }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function BarTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md dark:bg-gray-950">
      <p className="mb-1 text-sm font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
          <span className="font-semibold">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md dark:bg-gray-950">
      <p className="mb-1 text-sm font-medium">{entry.name}</p>
      <p className="text-sm font-semibold">{fmtNum(entry.value)} units</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function AmazonSalesAnalyticsPage() {
  const [days, setDays] = useState(365)

  // Build startDate/endDate params from days preset
  const params = new URLSearchParams()
  if (days > 0) {
    params.set('startDate', startOfDay(subDays(new Date(), days)).toISOString())
    params.set('endDate', endOfDay(new Date()).toISOString())
  }
  const qs = params.toString() ? `?${params}` : ''

  const { data: financeData, isLoading: financeLoading } = useSWR(
    `/api/sales/finance${qs}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )

  const { data: productsData, isLoading: productsLoading } = useSWR(
    `/api/sales/products${qs}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )

  const { data: amazonData, isLoading: amazonLoading } = useSWR(
    `/api/sales/amazon${qs}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )

  const loading = financeLoading || productsLoading || amazonLoading

  /* ---- Derived values ---- */

  const totalRevenue = financeData?.revenue?.total ?? 0
  const totalOrders = amazonData?.totalOrders ?? 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const returnRate = amazonData?.returnRate ?? 0

  // Revenue by month from finance data (revenueTrend)
  const revenueByMonth: any[] = financeData?.revenueTrend ?? []

  // Top products from products data (topSellers, limited to 10)
  const topProducts: any[] = (productsData?.topSellers ?? []).slice(0, 10)

  // Revenue by style from products data
  const byStyle: any[] = productsData?.byStyle ?? []

  // Size distribution from products data
  const bySize: any[] = productsData?.bySize ?? []

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Amazon Sales Analytics"
          description="Comprehensive analytics across revenue, products, and Amazon metrics"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Amazon', href: '/amazon/sales-analytics' },
            { label: 'Sales Analytics' },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2"><div className="h-5 w-48 animate-pulse rounded bg-muted" /></CardHeader>
          <CardContent><div className="h-[300px] animate-pulse rounded bg-muted" /></CardContent>
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><div className="h-5 w-36 animate-pulse rounded bg-muted" /></CardHeader>
              <CardContent><div className="h-[300px] animate-pulse rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2"><div className="h-5 w-52 animate-pulse rounded bg-muted" /></CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 border-b px-6 py-3">
                  {[1, 2, 3, 4, 5, 6].map(j => (
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

  /* ---- Error state ---- */
  if (!financeData && !productsData && !amazonData) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Failed to load analytics data
      </div>
    )
  }

  /* ---- KPI Cards ---- */
  const kpiCards = [
    {
      label: 'Total Revenue',
      value: fmt(totalRevenue),
      subtitle: 'Delivered + Shipped',
      icon: IndianRupee,
      borderColor: 'border-l-green-500',
      iconBg: 'bg-green-50 dark:bg-green-950/40',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Total Orders',
      value: fmtNum(totalOrders),
      subtitle: 'All statuses',
      icon: ShoppingCart,
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Avg Order Value',
      value: fmt(avgOrderValue),
      subtitle: 'Revenue / Orders',
      icon: TrendingUp,
      borderColor: 'border-l-violet-500',
      iconBg: 'bg-violet-50 dark:bg-violet-950/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Return Rate',
      value: `${returnRate.toFixed(2)}%`,
      subtitle: 'Returned orders',
      icon: RotateCcw,
      borderColor: 'border-l-orange-500',
      iconBg: 'bg-orange-50 dark:bg-orange-950/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Amazon Sales Analytics"
        description="Comprehensive analytics across revenue, products, and Amazon metrics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Amazon', href: '/amazon/sales-analytics' },
          { label: 'Sales Analytics' },
        ]}
        actions={
          <div className="flex items-center gap-1.5">
            {DATE_PRESETS.map(preset => (
              <Button
                key={preset.label}
                variant={days === preset.days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(preset.days)}
                className="px-3"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        }
      />

      {/* ---- KPI Cards ---- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.label} className={`border-l-4 ${card.borderColor}`}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{card.subtitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ---- Revenue by Month (Area Chart) ---- */}
      {revenueByMonth.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={revenueByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCOGSMonthly" x1="0" y1="0" x2="0" y2="1">
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
                <Tooltip content={<AreaTooltipContent />} />
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
                  fill="url(#gradRevMonthly)"
                  dot={{ r: 3, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 5, stroke: '#16a34a', strokeWidth: 2, fill: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="cogs"
                  name="Est. COGS"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fill="url(#gradCOGSMonthly)"
                  dot={{ r: 3, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 5, stroke: '#dc2626', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ---- Top 10 Products Table ---- */}
      {topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Top 10 Products by Revenue</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {topProducts.length} products
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="border-b-2 hover:bg-transparent">
                    <TableHead className="w-12 py-2.5 pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</TableHead>
                    <TableHead className="py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</TableHead>
                    <TableHead className="py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SKU</TableHead>
                    <TableHead className="py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style</TableHead>
                    <TableHead className="py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color</TableHead>
                    <TableHead className="py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orders</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                    <TableHead className="py-2.5 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((item: any, i: number) => {
                    const rankColors: Record<number, string> = {
                      0: 'bg-amber-100 text-amber-800 border-amber-300',
                      1: 'bg-slate-100 text-slate-600 border-slate-300',
                      2: 'bg-orange-100 text-orange-700 border-orange-300',
                    }
                    return (
                      <TableRow key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                        <TableCell className="py-2.5 pl-6">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                              rankColors[i] ?? 'bg-muted text-muted-foreground border-transparent'
                            }`}
                          >
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[180px] py-2.5">
                          <span className="block truncate font-medium" title={item.productName}>
                            {item.productName}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{item.sku}</code>
                        </TableCell>
                        <TableCell className="py-2.5 text-sm text-muted-foreground">{item.styleName}</TableCell>
                        <TableCell className="py-2.5 text-sm">{item.color}</TableCell>
                        <TableCell className="py-2.5 text-sm">{item.size}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums">{fmtNum(item.orders)}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums">{fmtNum(item.qty)}</TableCell>
                        <TableCell className="py-2.5 pr-6 text-right font-semibold tabular-nums">{fmt(item.revenue)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Revenue by Style (Bar Chart) + Size Distribution (Pie Chart) ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Style */}
        {byStyle.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Revenue by Style</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(280, byStyle.length * 44)}>
                <BarChart data={byStyle} layout="vertical" margin={{ right: 60 }}>
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
                    dataKey="styleName"
                    width={140}
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<BarTooltipContent />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]} barSize={24}>
                    {byStyle.map((_: any, i: number) => (
                      <Cell key={i} fill={STYLE_BAR_COLORS[i % STYLE_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Size Distribution (Pie Chart) */}
        {bySize.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Size Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={bySize}
                    dataKey="qty"
                    nameKey="size"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {bySize.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  />
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
                    {fmtCompact(bySize.reduce((sum: number, s: any) => sum + (s.qty || 0), 0))}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ---- Amazon Funnel Summary ---- */}
      {amazonData?.funnel?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Order Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {amazonData.funnel.map((f: any, i: number) => {
                const maxCount = amazonData.funnel[0]?.count || 1
                const widthPct = Math.max((f.count / maxCount) * 100, 8)
                const funnelColors = ['#3b82f6', '#0ea5e9', '#14b8a6', '#22c55e']
                return (
                  <div key={f.stage} className="flex items-center gap-4">
                    <div className="w-28 shrink-0 text-right">
                      <span className="text-sm font-medium text-foreground">{f.stage}</span>
                    </div>
                    <div className="relative flex-1">
                      <div className="h-9 w-full rounded-md bg-muted/40" />
                      <div
                        className="absolute inset-y-0 left-0 flex items-center rounded-md transition-all duration-500"
                        style={{
                          width: `${widthPct}%`,
                          background: `linear-gradient(90deg, ${funnelColors[i % funnelColors.length]}, ${funnelColors[Math.min(i + 1, funnelColors.length - 1)]})`,
                        }}
                      >
                        <span className="ml-3 text-sm font-semibold text-white drop-shadow-sm">
                          {f.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 shrink-0 text-right">
                      <span className="text-sm font-medium text-muted-foreground">{f.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Style Breakdown Table ---- */}
      {byStyle.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Style Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="border-b-2 hover:bg-transparent">
                    <TableHead className="py-2.5 pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Products</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orders</TableHead>
                    <TableHead className="py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty Sold</TableHead>
                    <TableHead className="py-2.5 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byStyle.map((s: any, i: number) => (
                    <TableRow key={s.styleName} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                      <TableCell className="py-2.5 pl-6 font-medium">{s.styleName}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{fmtNum(s.products)}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{fmtNum(s.orders)}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{fmtNum(s.qty)}</TableCell>
                      <TableCell className="py-2.5 pr-6 text-right font-semibold tabular-nums">{fmt(s.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
