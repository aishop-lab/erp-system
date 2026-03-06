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
import {
  ShoppingCart,
  CheckCircle,
  Ban,
  RotateCcw,
  Clock,
  ArrowDown,
  Package,
  Truck,
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
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function AmazonAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: startOfDay(subDays(new Date(), 90)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  })

  const params = new URLSearchParams()
  if (dateRange.startDate) params.set('startDate', dateRange.startDate)
  if (dateRange.endDate) params.set('endDate', dateRange.endDate)

  const { data, isLoading: loading } = useSWR(`/api/sales/amazon?${params}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const fmtCompact = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
    if (n >= 1000) return `${(n / 1000).toFixed(1)} K`
    return n.toFixed(0)
  }

  if (loading) {
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

  if (!data) {
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
      value: `${data.returnRate.toFixed(2)}%`,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Amazon Deep Dive"
        description="Order funnel, cancellations, returns, and fulfillment analysis"
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Amazon' },
        ]}
        actions={
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        }
      />

      {/* ── Stat Cards ── */}
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

      {/* ── Order Funnel ── */}
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

      {/* ── Cancellation Trend + Refund Summary ── */}
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
                  <p className="mt-1 text-sm font-medium text-foreground">Returned</p>
                  <span className="mt-1.5 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                    {data.returns.rate.toFixed(2)}% rate
                  </span>
                </div>
              </div>
              {/* Refund Payments */}
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

      {/* ── Fulfillment Split + Delivery Timeline ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fulfillment Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Stacked horizontal bar */}
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

              {/* Legend cards */}
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
              {/* Avg Days to Ship */}
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
              {/* Avg Days to Deliver */}
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

      {/* ── Monthly Trend Table ── */}
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
    </div>
  )
}
