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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, ShoppingCart, IndianRupee, Layers, TrendingDown } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  LabelList,
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PIE_COLORS = [
  'hsl(215, 70%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(48, 96%, 53%)',
  'hsl(0, 84%, 60%)', 'hsl(280, 65%, 50%)', 'hsl(200, 65%, 50%)',
  'hsl(330, 65%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(30, 80%, 50%)',
  'hsl(100, 50%, 40%)',
]

const RANK_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  2: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  3: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
}

const STAT_CARDS = [
  { key: 'productsSold', label: 'Products Sold', icon: Package, borderColor: 'border-blue-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { key: 'catalogSize', label: 'Catalog Size', icon: Layers, borderColor: 'border-violet-500', iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
  { key: 'avgRevenuePerProduct', label: 'Avg Revenue / Product', icon: IndianRupee, borderColor: 'border-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', isCurrency: true },
  { key: 'avgOrdersPerProduct', label: 'Avg Orders / Product', icon: ShoppingCart, borderColor: 'border-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', isDecimal: true },
] as Array<{ key: string; label: string; icon: any; borderColor: string; iconBg: string; iconColor: string; isCurrency?: boolean; isDecimal?: boolean }>

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const fmtNum = (n: number) => Number(n).toLocaleString('en-IN')

const fmtCompact = (n: number) => {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toFixed(0)
}

const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`

/* ------------------------------------------------------------------ */
/*  Custom Recharts Tooltips                                           */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload, label, valueFormatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md dark:bg-gray-950">
      {label && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{valueFormatter ? valueFormatter(entry.value) : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function SizeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md dark:bg-gray-950">
      <p className="mb-1.5 text-xs font-semibold">Size {d.size}</p>
      <div className="space-y-0.5 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Quantity</span>
          <span className="font-semibold tabular-nums">{fmtNum(d.qty)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-semibold tabular-nums">{fmt(d.revenue)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Orders</span>
          <span className="font-semibold tabular-nums">{fmtNum(d.orders)}</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function RankBadge({ rank }: { rank: number }) {
  const s = RANK_STYLES[rank] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-transparent' }
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${s.bg} ${s.text} ${s.border}`}>
      {rank}
    </span>
  )
}

function TopSellersTable({ items }: { items: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12 pl-4">#</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Style</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right pr-4">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item: any, i: number) => (
          <TableRow key={i} className="even:bg-muted/30">
            <TableCell className="pl-4 py-2.5">
              <RankBadge rank={i + 1} />
            </TableCell>
            <TableCell className="max-w-[180px] py-2.5">
              <span className="block truncate font-medium" title={item.productName}>
                {item.productName}
              </span>
            </TableCell>
            <TableCell className="py-2.5">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{item.sku}</code>
            </TableCell>
            <TableCell className="py-2.5 text-sm">{item.color}</TableCell>
            <TableCell className="py-2.5 text-sm">{item.size}</TableCell>
            <TableCell className="py-2.5 text-sm text-muted-foreground">{item.styleName}</TableCell>
            <TableCell className="text-right py-2.5 tabular-nums">{fmtNum(item.orders)}</TableCell>
            <TableCell className="text-right py-2.5 tabular-nums">{fmtNum(item.qty)}</TableCell>
            <TableCell className="text-right pr-4 py-2.5 font-semibold tabular-nums">{fmt(item.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SlowMoversTable({ items }: { items: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Style</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right pr-4">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item: any, i: number) => (
          <TableRow key={i} className="even:bg-red-50/40 dark:even:bg-red-950/10">
            <TableCell className="max-w-[180px] pl-4 py-2.5">
              <span className="block truncate font-medium" title={item.productName}>
                {item.productName}
              </span>
            </TableCell>
            <TableCell className="py-2.5">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{item.sku}</code>
            </TableCell>
            <TableCell className="py-2.5 text-sm">{item.color}</TableCell>
            <TableCell className="py-2.5 text-sm">{item.size}</TableCell>
            <TableCell className="py-2.5 text-sm text-muted-foreground">{item.styleName}</TableCell>
            <TableCell className="text-right py-2.5 tabular-nums">{fmtNum(item.orders)}</TableCell>
            <TableCell className="text-right py-2.5 tabular-nums">{fmtNum(item.qty)}</TableCell>
            <TableCell className="text-right pr-4 py-2.5 font-semibold tabular-nums text-red-600">{fmt(item.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function BreakdownTable({ rows, columns }: {
  rows: any[]
  columns: { key: string; label: string; align?: 'right'; format?: (v: any) => string; bold?: boolean }[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map(col => (
            <TableHead key={col.key} className={col.align === 'right' ? 'text-right' : ''}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row: any, i: number) => (
          <TableRow key={i} className="even:bg-muted/30">
            {columns.map((col, ci) => (
              <TableCell
                key={col.key}
                className={`py-2.5 ${ci === 0 ? 'font-medium' : ''} ${col.align === 'right' ? 'text-right tabular-nums' : ''} ${col.bold ? 'font-semibold' : ''}`}
              >
                {col.format ? col.format(row[col.key]) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* ------------------------------------------------------------------ */
/*  Donut label renderer                                               */
/* ------------------------------------------------------------------ */

function renderDonutLabel({ name, pct, cx, cy, midAngle, innerRadius, outerRadius }: any) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 1.45
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (pct < 4) return null
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="fill-foreground text-xs font-medium">
      {name} ({pct.toFixed(1)}%)
    </text>
  )
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function ProductPerformancePage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: startOfDay(subDays(new Date(), 365)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  })

  const params = new URLSearchParams()
  if (dateRange.startDate) params.set('startDate', dateRange.startDate)
  if (dateRange.endDate) params.set('endDate', dateRange.endDate)

  const { data, error, isLoading: loading, isValidating } = useSWR(`/api/sales/products?${params}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    keepPreviousData: false,
  })

  /* Loading skeleton */
  if (loading || (!data && isValidating)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product Performance" description="Top sellers, style & color analysis, size distribution" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><div className="h-[300px] animate-pulse rounded bg-muted" /></CardContent></Card>
      </div>
    )
  }

  /* Error state */
  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product Performance" description="Top sellers, style & color analysis, size distribution" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">Failed to load product data</p>
            <p className="mt-1 text-sm">Please try refreshing the page or check back later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Performance"
        description="Top sellers, style & color analysis, size distribution"
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Products' },
        ]}
        actions={
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        }
      />

      {/* ---- Summary Cards ---- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(card => {
          const Icon = card.icon
          const raw = data.summary[card.key]
          const display = card.isCurrency ? fmt(raw) : card.isDecimal ? Number(raw).toFixed(1) : fmtNum(raw)
          return (
            <Card key={card.key} className={`border-l-4 ${card.borderColor}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold tracking-tight">{display}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="top-sellers">
        <Card className="mb-4 border-0 bg-muted/40 shadow-none">
          <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-1.5">
            <TabsTrigger value="top-sellers" className="px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Top Sellers</TabsTrigger>
            <TabsTrigger value="by-style" className="px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">By Style</TabsTrigger>
            <TabsTrigger value="by-color" className="px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">By Color</TabsTrigger>
            <TabsTrigger value="by-size" className="px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">By Size</TabsTrigger>
            <TabsTrigger value="slow-movers" className="px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Slow Movers</TabsTrigger>
          </TabsList>
        </Card>

        {/* -- Top Sellers -- */}
        <TabsContent value="top-sellers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Top 20 Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TopSellersTable items={data.topSellers} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- By Style -- */}
        <TabsContent value="by-style">
          <div className="space-y-6">
            {data.byStyle?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Revenue by Style</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(250, data.byStyle.length * 44)}>
                    <BarChart data={data.byStyle} layout="vertical" margin={{ right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="styleName" width={160} tick={{ fontSize: 12 }} />
                      <RechartsTooltip content={<ChartTooltip valueFormatter={fmt} />} />
                      <defs>
                        <linearGradient id="styleBarGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(215, 70%, 60%)" />
                          <stop offset="100%" stopColor="hsl(215, 80%, 48%)" />
                        </linearGradient>
                      </defs>
                      <Bar dataKey="revenue" name="Revenue" fill="url(#styleBarGradient)" radius={[0, 6, 6, 0]} barSize={24}>
                        <LabelList dataKey="revenue" position="right" formatter={(v: any) => fmtCompact(Number(v))} style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Style Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <BreakdownTable
                  rows={data.byStyle}
                  columns={[
                    { key: 'styleName', label: 'Style' },
                    { key: 'products', label: 'Products', align: 'right', format: fmtNum },
                    { key: 'orders', label: 'Orders', align: 'right', format: fmtNum },
                    { key: 'qty', label: 'Qty Sold', align: 'right', format: fmtNum },
                    { key: 'revenue', label: 'Revenue', align: 'right', format: fmt, bold: true },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -- By Color -- */}
        <TabsContent value="by-color">
          <div className="space-y-6">
            {data.byColor?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Revenue by Color</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                      <Pie
                        data={data.byColor.slice(0, 10)}
                        dataKey="revenue"
                        nameKey="color"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        label={renderDonutLabel}
                        labelLine={false}
                      >
                        {data.byColor.slice(0, 10).map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ChartTooltip valueFormatter={fmt} />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Color Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <BreakdownTable
                  rows={data.byColor}
                  columns={[
                    { key: 'color', label: 'Color' },
                    { key: 'orders', label: 'Orders', align: 'right', format: fmtNum },
                    { key: 'qty', label: 'Qty Sold', align: 'right', format: fmtNum },
                    { key: 'revenue', label: 'Revenue', align: 'right', format: fmt, bold: true },
                    { key: 'pct', label: 'Share %', align: 'right', format: fmtPct },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -- By Size -- */}
        <TabsContent value="by-size">
          <div className="space-y-6">
            {data.bySize?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Size Curve (Qty Sold)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={data.bySize} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="size" tick={{ fontSize: 12, fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip content={<SizeTooltip />} />
                      <defs>
                        <linearGradient id="sizeBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(215, 80%, 50%)" />
                          <stop offset="100%" stopColor="hsl(215, 70%, 68%)" />
                        </linearGradient>
                      </defs>
                      <Bar dataKey="qty" name="Quantity" fill="url(#sizeBarGradient)" radius={[6, 6, 0, 0]} barSize={36}>
                        <LabelList dataKey="qty" position="top" style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Size Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <BreakdownTable
                  rows={data.bySize}
                  columns={[
                    { key: 'size', label: 'Size' },
                    { key: 'orders', label: 'Orders', align: 'right', format: fmtNum },
                    { key: 'qty', label: 'Qty Sold', align: 'right', format: fmtNum },
                    { key: 'revenue', label: 'Revenue', align: 'right', format: fmt, bold: true },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -- Slow Movers -- */}
        <TabsContent value="slow-movers">
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <CardTitle className="text-base font-semibold">Bottom 20 Products by Revenue</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <SlowMoversTable items={data.slowMovers} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
