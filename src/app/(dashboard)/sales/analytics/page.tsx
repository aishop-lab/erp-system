'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  TrendingUp,
  Package,
  IndianRupee,
  Ban,
  CheckCircle,
} from 'lucide-react'
import { SALES_ORDER_STATUS_MAP } from '@/lib/constants'

export default function SalesAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState('30')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sales/dashboard?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

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

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading analytics...</div>
  }

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
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{data?.totalOrders?.toLocaleString() || 0}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{data?.deliveredOrders?.toLocaleString() || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.avgOrderValue || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.platformBreakdown?.length > 0 ? (
              <div className="space-y-4">
                {data.platformBreakdown.map((p: any) => {
                  const pct = data.totalOrders > 0 ? (p.orders / data.totalOrders) * 100 : 0
                  return (
                    <div key={p.platform} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{p.platform}</span>
                        <span className="text-sm text-muted-foreground">
                          {p.orders} orders &middot; {formatCurrency(p.revenue)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No platform data available</p>
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{data?.pendingOrders || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Pending</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{data?.deliveredOrders || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Delivered</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{data?.cancelledOrders || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Cancelled</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">
                  {(data?.totalOrders || 0) - (data?.pendingOrders || 0) - (data?.deliveredOrders || 0) - (data?.cancelledOrders || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Other</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      {data?.dailyRevenue?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (Last {days} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {data.dailyRevenue.map((d: any, i: number) => {
                const maxRev = Math.max(...data.dailyRevenue.map((r: any) => r.revenue))
                const height = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors group relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${d.date}: ${formatCurrency(d.revenue)} (${d.orders} orders)`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{formatDate(data.dailyRevenue[0]?.date)}</span>
              <span>{formatDate(data.dailyRevenue[data.dailyRevenue.length - 1]?.date)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/sales/orders" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentOrders || []).slice(0, 10).map((order: any) => {
                const statusInfo = SALES_ORDER_STATUS_MAP[order.status] || { label: order.status, variant: 'secondary' }
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/sales/orders/${order.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.orderNumber.length > 20
                          ? `...${order.orderNumber.slice(-15)}`
                          : order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.platform?.displayName || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(order.totalAmount))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
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
