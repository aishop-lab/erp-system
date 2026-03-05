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
import { IndianRupee, TrendingUp, Package, Lock } from 'lucide-react'
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

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)']

export default function SalesFinancePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState('365')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sales/finance?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const fmtCompact = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
    if (n >= 1000) return `${(n / 1000).toFixed(1)} K`
    return n.toFixed(0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Finance Analytics" description="Revenue, COGS estimates, and P&L overview" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1,2].map(i => (
            <Card key={i}><CardContent className="pt-6"><div className="h-[250px] animate-pulse rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Failed to load data</div>
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
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="0">All time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{fmt(data.revenue.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">Delivered + Shipped</p>
              </div>
              <IndianRupee className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated COGS</p>
                <p className="text-2xl font-bold">{fmt(data.estimatedCOGS)}</p>
                <p className="text-xs text-muted-foreground mt-1">From product cost data</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gross Margin</p>
                <p className="text-2xl font-bold text-green-600">{fmt(data.grossMargin)}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.marginPct.toFixed(1)}% margin</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue/Order</p>
                <p className="text-2xl font-bold">{fmt(data.revenuePerOrder)}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Status + Payment Collection */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtCompact} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Collection</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, payload }: any) => `${name} (${payload?.count || 0})`}
                  >
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No payment data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs COGS Trend */}
      {data.revenueTrend?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Estimated COGS Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={fmtCompact} />
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.15} />
                <Area type="monotone" dataKey="cogs" name="Est. COGS" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly P&L Table */}
      {data.monthlyPnL?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly P&L</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Est. COGS</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Cancelled</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyPnL.map((m: any) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-right">{m.orders}</TableCell>
                    <TableCell className="text-right">{fmt(m.revenue)}</TableCell>
                    <TableCell className="text-right">{fmt(m.estCOGS)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(m.margin)}</TableCell>
                    <TableCell className="text-right">{m.marginPct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-red-600">{m.cancelled}</TableCell>
                    <TableCell className="text-right text-orange-600">{m.refunded}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Coming Soon Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {['Platform Fees', 'Expense Tracking', 'Marketplace Settlements'].map(title => (
          <Card key={title} className="opacity-60">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
