'use client'

import { useState } from 'react'
import { subDays, endOfDay, startOfDay } from 'date-fns'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangeFilter, DateRangeValue } from '@/components/shared/date-range-filter'
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
  Undo2,
  TrendingDown,
  DollarSign,
  Timer,
  PackageX,
} from 'lucide-react'
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
  Line,
  ComposedChart,
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Custom Chart Tooltip                                               */
/* ------------------------------------------------------------------ */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const DISPOSITION_COLORS = [
  '#92400e', '#b45309', '#a16207', '#71717a', '#78716c', '#57534e',
]

const TIMELINE_BUCKETS_ORDER = ['0-3 days', '4-7 days', '8-14 days', '15-30 days', '30+ days']

function getReasonBadgeClasses(reason: string): string {
  const r = (reason || '').toUpperCase()
  if (r.includes('DEFECTIVE') || r.includes('DAMAGED'))
    return 'bg-red-100 text-red-700 border-red-200'
  if (r.includes('QUALITY') || r.includes('NOT_AS_DESCRIBED') || r.includes('DESCRIPTION'))
    return 'bg-orange-100 text-orange-700 border-orange-200'
  if (r.includes('SIZING') || r.includes('WRONG_SIZE') || r.includes('SIZE'))
    return 'bg-blue-100 text-blue-700 border-blue-200'
  if (r.includes('UNWANTED') || r.includes('CHANGED_MIND') || r.includes('MIND'))
    return 'bg-gray-100 text-gray-700 border-gray-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function AmazonReturnsPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: startOfDay(subDays(new Date(), 90)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  })

  const params = new URLSearchParams()
  if (dateRange.startDate) params.set('startDate', dateRange.startDate)
  if (dateRange.endDate) params.set('endDate', dateRange.endDate)

  const { data, isLoading } = useSWR(
    `/api/sales/amazon/returns?${params}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10_000 }
  )

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const fmtCompact = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
    if (n >= 1000) return `${(n / 1000).toFixed(1)} K`
    return n.toLocaleString()
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Amazon Returns" description="Return reasons, trends, and disposition analytics" />
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !data || data.summary?.totalReturns === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <PackageX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No Return Data Available</h3>
            <p className="text-sm text-muted-foreground">
              Return data will appear here after the next sync pulls Amazon return reports.
              The sync runs every 4 hours automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Row 1: KPI Cards ── */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Returns</CardTitle>
                <Undo2 className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{data.summary.totalReturns.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{data.summary.uniqueOrdersReturned} unique orders</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Return Rate</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{data.summary.returnRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">of eligible orders</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Refund Value</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{fmt(data.summary.totalRefundValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  avg {fmt(data.financialImpact.avgRefundAmount)}/return
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Days to Return</CardTitle>
                <Timer className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{data.summary.avgDaysToReturn}</div>
                <p className="text-xs text-muted-foreground mt-1">from order to return</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 2: Return Reasons (full width, table with inline bars) ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Return Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byReason.length > 0 ? (
                <div className="space-y-3">
                  {[...data.byReason]
                    .sort((a: any, b: any) => b.count - a.count)
                    .map((r: any, i: number) => {
                      const maxCount = data.byReason.reduce((m: number, x: any) => Math.max(m, x.count), 0)
                      const widthPct = maxCount > 0 ? (r.count / maxCount) * 100 : 0
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <span className="w-[200px] shrink-0 text-sm text-foreground truncate" title={r.reason}>
                            {r.reason}
                          </span>
                          <div className="flex-1 h-7 bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span className="w-[60px] text-right text-sm font-semibold tabular-nums">
                            {r.count}
                          </span>
                          <span className="w-[50px] text-right text-xs text-muted-foreground tabular-nums">
                            {r.pct.toFixed(1)}%
                          </span>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No reason data</p>
              )}
            </CardContent>
          </Card>

          {/* ── Row 3: Return Rate Trend + Disposition ── */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Return Rate Trend (2/3 width) */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Return Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {data.trend.length > 0 ? (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="returnsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} unit="%" axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="returns"
                          name="Returns"
                          fill="url(#returnsFill)"
                          stroke="#ef4444"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="rate"
                          name="Return Rate %"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#f59e0b' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No trend data</p>
                )}
              </CardContent>
            </Card>

            {/* Disposition Donut (1/3 width) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Item Disposition</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byDisposition.length > 0 ? (
                  <div className="h-[320px] flex flex-col items-center justify-center">
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.byDisposition}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={45}
                            dataKey="count"
                            nameKey="disposition"
                            strokeWidth={2}
                            stroke="#fff"
                          >
                            {data.byDisposition.map((_: any, i: number) => (
                              <Cell key={i} fill={DISPOSITION_COLORS[i % DISPOSITION_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null
                              const d = payload[0].payload
                              return (
                                <div className="rounded-lg border bg-background p-3 shadow-md">
                                  <p className="text-sm font-semibold">{d.disposition}</p>
                                  <p className="text-xs text-muted-foreground">{d.count} items ({d.pct.toFixed(1)}%)</p>
                                </div>
                              )
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend below donut */}
                    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                      {data.byDisposition.map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: DISPOSITION_COLORS[i % DISPOSITION_COLORS.length] }}
                          />
                          {d.disposition} ({d.pct.toFixed(0)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No disposition data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Row 4: Timeline + Monthly Refunds ── */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Return Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Return Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {data.timeline.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={TIMELINE_BUCKETS_ORDER.map(b => {
                          const found = data.timeline.find((t: any) => t.bucket === b)
                          return { bucket: b, count: found?.count || 0 }
                        })}
                        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                      >
                        <defs>
                          <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#ea580c" stopOpacity={0.7} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <div className="rounded-lg border bg-background p-3 shadow-md">
                                <p className="text-sm font-semibold">{d.bucket}</p>
                                <p className="text-xs text-muted-foreground">{d.count} returns</p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="count" fill="url(#timelineGrad)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No timeline data</p>
                )}
              </CardContent>
            </Card>

            {/* Monthly Refund Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Monthly Refund Impact</CardTitle>
              </CardHeader>
              <CardContent>
                {data.financialImpact.monthlyRefunds.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.financialImpact.monthlyRefunds}
                        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                      >
                        <defs>
                          <linearGradient id="refundGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => fmtCompact(v)} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <div className="rounded-lg border bg-background p-3 shadow-md">
                                <p className="text-sm font-semibold">{d.month}</p>
                                <p className="text-xs">{d.refunds} refunds — {fmt(d.amount)}</p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="amount" name="Refund Amount" fill="url(#refundGrad)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No refund data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Row 5: Top Returned Products ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Top Returned Products</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byProduct.length > 0 ? (() => {
                const maxReturns = data.byProduct.reduce((m: number, p: any) => Math.max(m, p.returns), 0)
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>ASIN</TableHead>
                          <TableHead className="text-right">Returns</TableHead>
                          <TableHead className="w-[140px]">Top Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byProduct.map((p: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium text-sm">{p.productName || '\u2014'}</span>
                                {p.sku && (
                                  <span className="block text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{p.asin || '\u2014'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-[60px] h-2 bg-muted/40 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-red-400"
                                    style={{ width: `${maxReturns > 0 ? (p.returns / maxReturns) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="font-semibold tabular-nums text-sm">{p.returns}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {p.topReason ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-medium border ${getReasonBadgeClasses(p.topReason)}`}
                                >
                                  {p.topReason}
                                </Badge>
                              ) : '\u2014'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              })() : (
                <p className="py-8 text-center text-sm text-muted-foreground">No product return data</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
