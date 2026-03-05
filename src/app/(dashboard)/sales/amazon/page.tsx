'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from 'recharts'

export default function AmazonAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState('90')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sales/amazon?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

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

  const funnelColors = ['hsl(215, 70%, 55%)', 'hsl(200, 65%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(142, 76%, 36%)']

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
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="0">All time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{data.totalOrders.toLocaleString()}</p>
              </div>
              <ShoppingCart className="h-7 w-7 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold text-green-600">{data.deliveryRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-7 w-7 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancellation Rate</p>
                <p className="text-2xl font-bold text-red-600">{data.cancellationRate.toFixed(1)}%</p>
              </div>
              <Ban className="h-7 w-7 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Return Rate</p>
                <p className="text-2xl font-bold text-orange-600">{data.returnRate.toFixed(2)}%</p>
              </div>
              <RotateCcw className="h-7 w-7 text-orange-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Days to Deliver</p>
                <p className="text-2xl font-bold">{data.deliveryTimeline.avgDaysToDeliver}</p>
              </div>
              <Clock className="h-7 w-7 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Order Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="stage" width={140} />
              <Tooltip
                formatter={(v: any, _: any, entry: any) => [
                  `${Number(v).toLocaleString()} (${entry.payload.pct.toFixed(1)}%)`,
                  'Orders',
                ]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.funnel.map((_: any, i: number) => (
                  <Cell key={i} fill={funnelColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
            {data.funnel.slice(1).map((f: any, i: number) => {
              const prev = data.funnel[i]
              const dropoff = prev.count > 0 ? ((prev.count - f.count) / prev.count * 100).toFixed(1) : '0'
              return (
                <span key={f.stage}>
                  {prev.stage} → {f.stage}: <span className="text-red-500">-{dropoff}%</span>
                </span>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Trend + Refund Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {data.cancellation.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.cancellation.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Cancelled" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No cancellation data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refund & Return Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{data.cancellation.count}</p>
                <p className="text-sm text-muted-foreground mt-1">Cancelled</p>
                <p className="text-xs text-muted-foreground">{data.cancellation.rate.toFixed(1)}% rate</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{data.returns.count}</p>
                <p className="text-sm text-muted-foreground mt-1">Returned</p>
                <p className="text-xs text-muted-foreground">{data.returns.rate.toFixed(2)}% rate</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">{data.refunds.count}</p>
                <p className="text-sm text-muted-foreground mt-1">Refund Payments</p>
                <p className="text-xs text-muted-foreground">{fmt(data.refunds.value)} total</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">{fmt(data.refunds.avgRefund)}</p>
                <p className="text-sm text-muted-foreground mt-1">Avg Refund</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fulfillment + Delivery Timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fulfillment Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">{data.fulfillment.afn}</p>
                <p className="text-sm text-muted-foreground mt-1">AFN (FBA)</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">{data.fulfillment.mfn}</p>
                <p className="text-sm text-muted-foreground mt-1">MFN (Self)</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-muted-foreground">{data.fulfillment.unknown}</p>
                <p className="text-sm text-muted-foreground mt-1">Unknown</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">{data.deliveryTimeline.avgDaysToShip}</p>
                <p className="text-sm text-muted-foreground mt-1">Avg Days to Ship</p>
                <p className="text-xs text-muted-foreground">Order → Shipped</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">{data.deliveryTimeline.avgDaysToDeliver}</p>
                <p className="text-sm text-muted-foreground mt-1">Avg Days to Deliver</p>
                <p className="text-xs text-muted-foreground">Order → Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Table */}
      {data.monthlyTrend?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Cancelled</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyTrend.map((m: any) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-right">{m.total}</TableCell>
                    <TableCell className="text-right text-green-600">{m.delivered}</TableCell>
                    <TableCell className="text-right text-red-600">{m.cancelled}</TableCell>
                    <TableCell className="text-right text-orange-600">{m.returned}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(m.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
