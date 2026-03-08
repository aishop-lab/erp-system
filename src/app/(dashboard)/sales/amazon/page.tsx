'use client'

import { useState } from 'react'
import { subDays, endOfDay, startOfDay, formatDistanceToNow } from 'date-fns'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangeFilter, DateRangeValue } from '@/components/shared/date-range-filter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShoppingCart,
  CheckCircle,
  Ban,
  RotateCcw,
  Clock,
  ArrowDown,
  Package,
  Truck,
  Warehouse,
  BoxesIcon,
  AlertTriangle,
  PackageX,
  ArrowUpDown,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Custom Chart Tooltip                                               */
/* ------------------------------------------------------------------ */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Movement type styling                                              */
/* ------------------------------------------------------------------ */
const MOVEMENT_COLORS: Record<string, string> = {
  purchase: 'bg-green-100 text-green-700',
  sales: 'bg-blue-100 text-blue-700',
  return: 'bg-orange-100 text-orange-700',
  damage: 'bg-red-100 text-red-700',
  adjustment: 'bg-purple-100 text-purple-700',
  transfer_in: 'bg-teal-100 text-teal-700',
  transfer_out: 'bg-amber-100 text-amber-700',
  fba_sync: 'bg-indigo-100 text-indigo-700',
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function AmazonAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: startOfDay(subDays(new Date(), 90)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  })
  const [activeTab, setActiveTab] = useState('overview')

  const params = new URLSearchParams()
  if (dateRange.startDate) params.set('startDate', dateRange.startDate)
  if (dateRange.endDate) params.set('endDate', dateRange.endDate)

  const { data, isLoading: loading, isValidating } = useSWR(`/api/sales/amazon?${params}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    keepPreviousData: false,
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const fmtCompact = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
    if (n >= 1000) return `${(n / 1000).toFixed(1)} K`
    return n.toFixed(0)
  }

  if (loading || (!data && isValidating)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Amazon Deep Dive" description="Order funnel, cancellations, returns, and fulfillment analysis" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1,2,3,4,5].map(i => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><div className="h-[220px] animate-pulse rounded bg-muted" /></CardContent></Card>
      </div>
    )
  }

  if (!data || data.error) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Failed to load data</div>
  }

  /* Funnel gradient colors */
  const funnelColors = ['#3b82f6', '#0ea5e9', '#14b8a6', '#22c55e']

  /* Fulfillment proportions */
  const fulfillmentTotal = (data.fulfillment.afn || 0) + (data.fulfillment.mfn || 0) + (data.fulfillment.unknown || 0)
  const afnPct = fulfillmentTotal > 0 ? ((data.fulfillment.afn / fulfillmentTotal) * 100) : 0
  const mfnPct = fulfillmentTotal > 0 ? ((data.fulfillment.mfn / fulfillmentTotal) * 100) : 0
  const unknownPct = fulfillmentTotal > 0 ? ((data.fulfillment.unknown / fulfillmentTotal) * 100) : 0

  /* Stat card definitions */
  const stats = [
    {
      label: 'Total Orders',
      value: data.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Delivery Rate',
      value: `${data.deliveryRate.toFixed(1)}%`,
      icon: CheckCircle,
      borderColor: 'border-l-green-500',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
    },
    {
      label: 'Cancellation Rate',
      value: `${data.cancellationRate.toFixed(1)}%`,
      icon: Ban,
      borderColor: 'border-l-red-500',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
    },
    {
      label: 'Return Rate',
      value: `${data.returnRate.toFixed(1)}%`,
      icon: RotateCcw,
      borderColor: 'border-l-orange-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
    },
    {
      label: 'Avg Delivery Time',
      value: data.deliveryTimeline.avgDaysToDeliver,
      suffix: 'days',
      icon: Clock,
      borderColor: 'border-l-slate-500',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
  ]

  /* Inventory data */
  const inv = data.inventory
  const fbaWarehouses = inv?.warehouses?.filter((w: any) => w.isFba) || []
  const nonFbaWarehouses = inv?.warehouses?.filter((w: any) => !w.isFba) || []
  const fbaStock = inv?.stockByWarehouse?.filter((s: any) => s.isFba) || []
  const nonFbaStock = inv?.stockByWarehouse?.filter((s: any) => !s.isFba) || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Amazon Deep Dive"
        description="Order funnel, cancellations, returns, fulfillment & inventory"
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Amazon' },
        ]}
        actions={
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className={`border-l-4 ${s.borderColor}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.iconBg}`}>
                    <Icon className={`h-5 w-5 ${s.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground truncate">{s.label}</p>
                    <p className={`text-2xl font-bold leading-tight ${s.valueColor || ''}`}>
                      {s.value}
                      {s.suffix && <span className="ml-1 text-sm font-medium text-muted-foreground">{s.suffix}</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">
            Inventory
            {inv?.totalSkus > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{inv.totalSkus}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="fc-inventory">
            FC Inventory
            {fbaWarehouses.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{fbaWarehouses.length} FC</Badge>
            )}
          </TabsTrigger>
          {data.businessMetrics && (
            <TabsTrigger value="asin-performance">
              ASIN Performance
              <Badge variant="secondary" className="ml-1.5 text-xs">{data.businessMetrics.totalAsins}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Order Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Order Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.funnel.map((f: any, i: number) => {
                  const maxCount = data.funnel[0]?.count || 1
                  const widthPct = Math.max((f.count / maxCount) * 100, 8)
                  return (
                    <div key={f.stage} className="flex items-center gap-4">
                      <div className="w-28 shrink-0 text-right">
                        <span className="text-sm font-medium text-foreground">{f.stage}</span>
                      </div>
                      <div className="flex-1 relative">
                        <div className="h-9 w-full rounded-md bg-muted/40" />
                        <div
                          className="absolute inset-y-0 left-0 rounded-md flex items-center transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            background: `linear-gradient(90deg, ${funnelColors[i]}, ${funnelColors[Math.min(i + 1, funnelColors.length - 1)]})`,
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

              {/* Drop-off indicators */}
              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 border-t pt-3">
                {data.funnel.slice(1).map((f: any, i: number) => {
                  const prev = data.funnel[i]
                  const dropoff = prev.count > 0 ? ((prev.count - f.count) / prev.count * 100).toFixed(1) : '0'
                  return (
                    <div key={f.stage} className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">{prev.stage}</span>
                      <ArrowDown className="h-3 w-3 text-red-500" />
                      <span className="text-muted-foreground">{f.stage}</span>
                      <span className="ml-1 font-semibold text-red-500">-{dropoff}%</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Trend + Refund Summary */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Cancellation Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {data.cancellation.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.cancellation.monthlyTrend}>
                      <defs>
                        <linearGradient id="cancelGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Cancelled"
                        stroke="hsl(0, 84%, 60%)"
                        strokeWidth={2.5}
                        fill="url(#cancelGradient)"
                        dot={{ r: 4, fill: 'hsl(0, 84%, 60%)', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6, stroke: 'hsl(0, 84%, 60%)', strokeWidth: 2, fill: '#fff' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">No cancellation data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Refund & Return Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Cancelled */}
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="h-1 bg-red-500" />
                    <div className="p-4 text-center">
                      <p className="text-3xl font-extrabold text-red-600">{data.cancellation.count}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">Cancelled</p>
                      <span className="mt-1.5 inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                        {data.cancellation.rate.toFixed(1)}% rate
                      </span>
                    </div>
                  </div>
                  {/* Returned */}
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="h-1 bg-orange-500" />
                    <div className="p-4 text-center">
                      <p className="text-3xl font-extrabold text-orange-600">{data.returns.count}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">Returned / Refunded</p>
                      <span className="mt-1.5 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                        {data.returns.rate.toFixed(1)}% rate
                      </span>
                    </div>
                  </div>
                  {/* Refund Value */}
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="h-1 bg-violet-500" />
                    <div className="p-4 text-center">
                      <p className="text-3xl font-extrabold text-violet-600">{data.refunds.count}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">Refund Payments</p>
                      <span className="mt-1.5 inline-block rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
                        {fmt(data.refunds.value)}
                      </span>
                    </div>
                  </div>
                  {/* Avg Refund */}
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="h-1 bg-slate-400" />
                    <div className="p-4 text-center">
                      <p className="text-3xl font-extrabold text-foreground">{fmt(data.refunds.avgRefund)}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">Avg Refund</p>
                      <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        per order
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fulfillment Split + Delivery Timeline */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Fulfillment Split</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-10 w-full rounded-lg overflow-hidden flex">
                    {afnPct > 0 && (
                      <div
                        className="h-full bg-blue-500 flex items-center justify-center transition-all duration-500"
                        style={{ width: `${afnPct}%` }}
                      >
                        {afnPct > 10 && <span className="text-xs font-semibold text-white">{afnPct.toFixed(1)}%</span>}
                      </div>
                    )}
                    {mfnPct > 0 && (
                      <div
                        className="h-full bg-amber-500 flex items-center justify-center transition-all duration-500"
                        style={{ width: `${mfnPct}%` }}
                      >
                        {mfnPct > 10 && <span className="text-xs font-semibold text-white">{mfnPct.toFixed(1)}%</span>}
                      </div>
                    )}
                    {unknownPct > 0 && (
                      <div
                        className="h-full bg-slate-300 flex items-center justify-center transition-all duration-500"
                        style={{ width: `${unknownPct}%` }}
                      >
                        {unknownPct > 10 && <span className="text-xs font-semibold text-slate-600">{unknownPct.toFixed(1)}%</span>}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2.5 rounded-lg border p-3">
                      <div className="h-3 w-3 shrink-0 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-lg font-bold leading-tight">{data.fulfillment.afn.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">AFN (FBA)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border p-3">
                      <div className="h-3 w-3 shrink-0 rounded-full bg-amber-500" />
                      <div>
                        <p className="text-lg font-bold leading-tight">{data.fulfillment.mfn.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">MFN (Self)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border p-3">
                      <div className="h-3 w-3 shrink-0 rounded-full bg-slate-300" />
                      <div>
                        <p className="text-lg font-bold leading-tight text-muted-foreground">{data.fulfillment.unknown.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Unknown</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Delivery Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border-2 border-blue-100 bg-blue-50/50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Order to Ship</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-blue-700">{data.deliveryTimeline.avgDaysToShip}</span>
                      <span className="text-sm font-medium text-blue-400">days</span>
                    </div>
                    <p className="mt-1 text-xs text-blue-500/80">avg processing time</p>
                  </div>
                  <div className="rounded-xl border-2 border-green-100 bg-green-50/50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <Truck className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Order to Deliver</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-green-700">{data.deliveryTimeline.avgDaysToDeliver}</span>
                      <span className="text-sm font-medium text-green-400">days</span>
                    </div>
                    <p className="mt-1 text-xs text-green-500/80">avg total lead time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend Table */}
          {data.monthlyTrend?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="border-b-2">
                        <TableHead className="font-semibold">Month</TableHead>
                        <TableHead className="text-right font-semibold">Total</TableHead>
                        <TableHead className="text-right font-semibold">Delivered</TableHead>
                        <TableHead className="text-right font-semibold">Cancelled</TableHead>
                        <TableHead className="text-right font-semibold">Returned</TableHead>
                        <TableHead className="text-right font-semibold">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.monthlyTrend.map((m: any, i: number) => (
                        <TableRow key={m.month} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                          <TableCell className="py-2.5 font-medium">{m.month}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums">{m.total.toLocaleString()}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums text-green-600 font-medium">{m.delivered.toLocaleString()}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums text-red-600 font-medium">{m.cancelled.toLocaleString()}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums text-orange-600 font-medium">{m.returned.toLocaleString()}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums font-semibold">{fmt(m.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── INVENTORY TAB ─── */}
        <TabsContent value="inventory" className="space-y-6 mt-4">
          {/* Inventory Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <BoxesIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total SKUs</p>
                    <p className="text-2xl font-bold">{inv?.totalSkus?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total On Hand</p>
                    <p className="text-2xl font-bold text-green-600">{inv?.totalOnHand?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold text-orange-600">{inv?.lowStockCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <PackageX className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{inv?.outOfStockCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warehouse Summary */}
          {inv?.warehouses?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Warehouse Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="font-semibold">Warehouse</TableHead>
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="text-center font-semibold">Type</TableHead>
                      <TableHead className="text-right font-semibold">SKUs</TableHead>
                      <TableHead className="text-right font-semibold">On Hand</TableHead>
                      <TableHead className="text-right font-semibold">Reserved</TableHead>
                      <TableHead className="text-right font-semibold">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inv.warehouses.map((w: any, i: number) => (
                      <TableRow key={w.id} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                        <TableCell className="py-2.5 font-medium">{w.name}</TableCell>
                        <TableCell className="py-2.5 text-muted-foreground">{w.code || '—'}</TableCell>
                        <TableCell className="py-2.5 text-center">
                          <Badge variant={w.isFba ? 'default' : 'outline'} className={w.isFba ? 'bg-blue-600' : ''}>
                            {w.isFba ? 'FBA' : 'Self'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums">{w.totalSkus.toLocaleString()}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums font-medium">{w.totalQtyOnHand.toLocaleString()}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums text-amber-600">{w.totalQtyReserved.toLocaleString()}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums font-semibold text-green-600">{w.availableQty.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="border-t-2 font-semibold bg-muted/50">
                      <TableCell colSpan={3} className="py-2.5">Total</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{inv.totalSkus.toLocaleString()}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{inv.totalOnHand.toLocaleString()}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-amber-600">{inv.totalReserved.toLocaleString()}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums text-green-600">{inv.totalAvailable.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* All Stock by SKU */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Stock by SKU
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({inv?.stockByWarehouse?.length || 0} records)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="border-b-2">
                      <TableHead className="font-semibold">SKU</TableHead>
                      <TableHead className="font-semibold">ASIN</TableHead>
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold">Color</TableHead>
                      <TableHead className="font-semibold">Size</TableHead>
                      <TableHead className="font-semibold">Warehouse</TableHead>
                      <TableHead className="text-center font-semibold">Type</TableHead>
                      <TableHead className="text-right font-semibold">On Hand</TableHead>
                      <TableHead className="text-right font-semibold">Reserved</TableHead>
                      <TableHead className="text-right font-semibold">Available</TableHead>
                      <TableHead className="text-right font-semibold">Last Synced</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inv?.stockByWarehouse || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                          No inventory data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      inv.stockByWarehouse.map((s: any, i: number) => (
                        <TableRow key={`${s.warehouseId}-${s.sku}`} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                          <TableCell className="py-2 font-mono text-xs">{s.sku || '—'}</TableCell>
                          <TableCell className="py-2 font-mono text-xs text-blue-600">{s.asin || '—'}</TableCell>
                          <TableCell className="py-2 text-sm max-w-[200px] truncate">{s.productName || '—'}</TableCell>
                          <TableCell className="py-2 text-sm">{s.color || '—'}</TableCell>
                          <TableCell className="py-2 text-sm">{s.size || '—'}</TableCell>
                          <TableCell className="py-2 text-sm">{s.warehouseName}</TableCell>
                          <TableCell className="py-2 text-center">
                            <Badge variant={s.isFba ? 'default' : 'outline'} className={`text-xs ${s.isFba ? 'bg-blue-600' : ''}`}>
                              {s.isFba ? 'FBA' : 'Self'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`py-2 text-right tabular-nums font-medium ${s.qtyOnHand <= 0 ? 'text-red-600' : s.qtyOnHand <= 5 ? 'text-orange-600' : ''}`}>
                            {s.qtyOnHand.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-2 text-right tabular-nums text-amber-600">{s.qtyReserved.toLocaleString()}</TableCell>
                          <TableCell className={`py-2 text-right tabular-nums font-semibold ${s.available <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {s.available.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs text-muted-foreground">
                            {s.lastSyncedAt ? formatDistanceToNow(new Date(s.lastSyncedAt), { addSuffix: true }) : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Stock Movements */}
          {inv?.recentMovements?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Recent Stock Movements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="border-b-2">
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Warehouse</TableHead>
                        <TableHead className="font-semibold">SKU</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="text-right font-semibold">Qty</TableHead>
                        <TableHead className="font-semibold">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inv.recentMovements.map((m: any, i: number) => (
                        <TableRow key={m.id} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                          <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </TableCell>
                          <TableCell className="py-2 text-sm">{m.warehouseName}</TableCell>
                          <TableCell className="py-2 font-mono text-xs">{m.sku || '—'}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="secondary" className={`text-xs ${MOVEMENT_COLORS[m.movementType] || 'bg-gray-100 text-gray-700'}`}>
                              {m.movementType.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className={`py-2 text-right tabular-nums font-medium ${m.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {m.quantity >= 0 ? '+' : ''}{m.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground max-w-[200px] truncate">{m.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── FC INVENTORY TAB ─── */}
        <TabsContent value="fc-inventory" className="space-y-6 mt-4">
          {/* FBA Summary Cards */}
          {fbaWarehouses.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                        <Warehouse className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">FBA Fulfillment Centers</p>
                        <p className="text-2xl font-bold">{fbaWarehouses.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-indigo-500">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                        <BoxesIcon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">FBA SKUs</p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {fbaWarehouses.reduce((s: number, w: any) => s + w.totalSkus, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">FBA Total On Hand</p>
                        <p className="text-2xl font-bold text-green-600">
                          {fbaWarehouses.reduce((s: number, w: any) => s + w.totalQtyOnHand, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
                        <Package className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">FBA Reserved</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {fbaWarehouses.reduce((s: number, w: any) => s + w.totalQtyReserved, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* FBA Warehouses Detail */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Fulfillment Centers</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2">
                        <TableHead className="font-semibold">FC Name</TableHead>
                        <TableHead className="font-semibold">Code</TableHead>
                        <TableHead className="text-right font-semibold">SKUs</TableHead>
                        <TableHead className="text-right font-semibold">On Hand</TableHead>
                        <TableHead className="text-right font-semibold">Reserved</TableHead>
                        <TableHead className="text-right font-semibold">Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fbaWarehouses.map((w: any, i: number) => (
                        <TableRow key={w.id} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                          <TableCell className="py-2.5 font-medium">{w.name}</TableCell>
                          <TableCell className="py-2.5 font-mono text-sm text-muted-foreground">{w.code || '—'}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums">{w.totalSkus.toLocaleString()}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums font-medium">{w.totalQtyOnHand.toLocaleString()}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums text-amber-600">{w.totalQtyReserved.toLocaleString()}</TableCell>
                          <TableCell className="py-2.5 text-right tabular-nums font-semibold text-green-600">{w.availableQty.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-semibold bg-muted/50">
                        <TableCell colSpan={2} className="py-2.5">Total FBA</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums">
                          {fbaWarehouses.reduce((s: number, w: any) => s + w.totalSkus, 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums">
                          {fbaWarehouses.reduce((s: number, w: any) => s + w.totalQtyOnHand, 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums text-amber-600">
                          {fbaWarehouses.reduce((s: number, w: any) => s + w.totalQtyReserved, 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums text-green-600">
                          {fbaWarehouses.reduce((s: number, w: any) => s + w.availableQty, 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* FBA Stock by SKU */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    FBA Stock by SKU
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({fbaStock.length} records)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow className="border-b-2">
                          <TableHead className="font-semibold">SKU</TableHead>
                          <TableHead className="font-semibold">ASIN</TableHead>
                          <TableHead className="font-semibold">Product</TableHead>
                          <TableHead className="font-semibold">Color</TableHead>
                          <TableHead className="font-semibold">Size</TableHead>
                          <TableHead className="font-semibold">FC</TableHead>
                          <TableHead className="text-right font-semibold">On Hand</TableHead>
                          <TableHead className="text-right font-semibold">Reserved</TableHead>
                          <TableHead className="text-right font-semibold">Available</TableHead>
                          <TableHead className="text-right font-semibold">Last Synced</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fbaStock.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                              No FBA inventory data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          fbaStock.map((s: any, i: number) => (
                            <TableRow key={`${s.warehouseId}-${s.sku}`} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                              <TableCell className="py-2 font-mono text-xs">{s.sku || '—'}</TableCell>
                              <TableCell className="py-2 font-mono text-xs text-blue-600">{s.asin || '—'}</TableCell>
                              <TableCell className="py-2 text-sm max-w-[200px] truncate">{s.productName || '—'}</TableCell>
                              <TableCell className="py-2 text-sm">{s.color || '—'}</TableCell>
                              <TableCell className="py-2 text-sm">{s.size || '—'}</TableCell>
                              <TableCell className="py-2 text-sm">{s.warehouseName}</TableCell>
                              <TableCell className={`py-2 text-right tabular-nums font-medium ${s.qtyOnHand <= 0 ? 'text-red-600' : s.qtyOnHand <= 5 ? 'text-orange-600' : ''}`}>
                                {s.qtyOnHand.toLocaleString()}
                              </TableCell>
                              <TableCell className="py-2 text-right tabular-nums text-amber-600">{s.qtyReserved.toLocaleString()}</TableCell>
                              <TableCell className={`py-2 text-right tabular-nums font-semibold ${s.available <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {s.available.toLocaleString()}
                              </TableCell>
                              <TableCell className="py-2 text-right text-xs text-muted-foreground">
                                {s.lastSyncedAt ? formatDistanceToNow(new Date(s.lastSyncedAt), { addSuffix: true }) : '—'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No FBA Fulfillment Centers</p>
                <p className="text-sm mt-1">FBA inventory data will appear here once warehouses are synced from Amazon.</p>
              </CardContent>
            </Card>
          )}

          {/* Non-FBA (Self) Warehouses */}
          {nonFbaWarehouses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Self-Fulfilled Warehouses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="font-semibold">Warehouse</TableHead>
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="text-right font-semibold">SKUs</TableHead>
                      <TableHead className="text-right font-semibold">On Hand</TableHead>
                      <TableHead className="text-right font-semibold">Reserved</TableHead>
                      <TableHead className="text-right font-semibold">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonFbaWarehouses.map((w: any, i: number) => (
                      <TableRow key={w.id} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                        <TableCell className="py-2.5 font-medium">{w.name}</TableCell>
                        <TableCell className="py-2.5 text-muted-foreground">{w.code || '—'}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums">{w.totalSkus.toLocaleString()}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums font-medium">{w.totalQtyOnHand.toLocaleString()}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums text-amber-600">{w.totalQtyReserved.toLocaleString()}</TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums font-semibold text-green-600">{w.availableQty.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── ASIN PERFORMANCE TAB ─── */}
        {data.businessMetrics && (
          <TabsContent value="asin-performance" className="space-y-6 mt-4">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-medium text-muted-foreground">Total Glance Views</p>
                  <p className="text-2xl font-bold">{data.businessMetrics.totalGlanceViews.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-medium text-muted-foreground">Units Shipped</p>
                  <p className="text-2xl font-bold">{data.businessMetrics.totalUnitsShipped.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-violet-500">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{fmt(data.businessMetrics.totalSales)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{data.businessMetrics.avgConversionRate.toFixed(2)}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-medium text-muted-foreground">Avg Selling Price</p>
                  <p className="text-xl font-bold">{fmt(data.businessMetrics.avgSellingPrice)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-medium text-muted-foreground">Total ASINs</p>
                  <p className="text-xl font-bold">{data.businessMetrics.totalAsins.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-medium text-muted-foreground">Available Inventory</p>
                  <p className="text-xl font-bold">{data.businessMetrics.totalAvailableInventory.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">units across all ASINs</p>
                </CardContent>
              </Card>
            </div>

            {/* ASIN Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  Top ASINs by Sales
                  {data.businessMetrics.reportDate && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Data from {new Date(data.businessMetrics.reportDate).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2">
                        <TableHead className="font-semibold">#</TableHead>
                        <TableHead className="font-semibold min-w-[250px]">Product</TableHead>
                        <TableHead className="text-right font-semibold">Glance Views</TableHead>
                        <TableHead className="text-right font-semibold">Conv. %</TableHead>
                        <TableHead className="text-right font-semibold">Units Shipped</TableHead>
                        <TableHead className="text-right font-semibold">Avg Price</TableHead>
                        <TableHead className="text-right font-semibold">Sales</TableHead>
                        <TableHead className="text-right font-semibold">Inventory</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.businessMetrics.topAsins.map((a: any, i: number) => (
                        <TableRow key={a.asin} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                          <TableCell className="py-2 text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="py-2">
                            <div>
                              <p className="text-sm font-medium leading-tight truncate max-w-[350px]">
                                {a.itemName || a.asin}
                              </p>
                              <p className="text-xs text-muted-foreground">{a.asin}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-right tabular-nums">{a.glanceViews.toLocaleString()}</TableCell>
                          <TableCell className={`py-2 text-right tabular-nums ${a.conversionRate >= 2 ? 'text-green-600 font-semibold' : a.conversionRate >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
                            {a.conversionRate.toFixed(2)}%
                          </TableCell>
                          <TableCell className="py-2 text-right tabular-nums font-medium">{a.unitsShipped.toLocaleString()}</TableCell>
                          <TableCell className="py-2 text-right tabular-nums">{fmt(a.avgSellingPrice)}</TableCell>
                          <TableCell className="py-2 text-right tabular-nums font-semibold">{fmt(a.salesAmount)}</TableCell>
                          <TableCell className={`py-2 text-right tabular-nums ${a.availableInventory <= 0 ? 'text-red-600 font-semibold' : a.availableInventory <= 5 ? 'text-amber-600' : ''}`}>
                            {a.availableInventory.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
