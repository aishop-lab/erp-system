'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { ShoppingCart, Package, Truck, Wallet, ExternalLink, TrendingUp } from 'lucide-react'
import { ResponsiveContainer, Area, XAxis, YAxis, CartesianGrid, Tooltip, Line, ComposedChart } from 'recharts'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import Link from 'next/link'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr'

interface DashboardData {
  stats: {
    ordersThisMonth: number
    activeProducts: number
    activeSuppliers: number
    pendingPayments: number
  }
  recentPOs: Array<{
    id: string
    poNumber: string
    status: string
    purchaseType: string
    totalAmount: number
    createdAt: string
    supplier: { name: string } | null
  }>
  recentSalesOrders: Array<{
    id: string
    orderNumber: string
    platform: { name: string }
    status: string
    totalAmount: number
    orderedAt: string
  }>
  revenueTrend: {
    daily: Array<{ date: string; revenue: number; orders: number }>
    totalRevenue: number
    totalOrders: number
    avgDailyRevenue: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200',
  pending_approval: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  approved: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  goods_received: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  shipped: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export default function DashboardPage() {
  const { data, isLoading: loading } = useSWR<DashboardData>('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
      </div>
    )
  }

  const stats = [
    {
      title: 'PO This Month',
      value: data?.stats.ordersThisMonth ?? 0,
      description: 'Purchase orders created',
      icon: ShoppingCart,
      href: '/purchase-orders',
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Active Products',
      value: data?.stats.activeProducts ?? 0,
      description: 'Finished product SKUs',
      icon: Package,
      href: '/products/finished',
      borderColor: 'border-l-violet-500',
      iconBg: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Active Suppliers',
      value: data?.stats.activeSuppliers ?? 0,
      description: 'Registered suppliers',
      icon: Truck,
      href: '/suppliers',
      borderColor: 'border-l-orange-500',
      iconBg: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Pending Payments',
      value: data?.stats.pendingPayments ?? 0,
      description: 'Awaiting approval or execution',
      icon: Wallet,
      href: '/finance/payments',
      borderColor: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to your ERP system dashboard"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className={`border-l-4 ${stat.borderColor} hover:shadow-md transition-all duration-200 cursor-pointer group`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </p>
                  <div className={`rounded-full p-2 ${stat.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{stat.value.toLocaleString('en-IN')}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Revenue Trend Chart */}
      {data?.revenueTrend && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="rounded-full bg-indigo-50 p-1.5 text-indigo-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  Revenue Trend
                </CardTitle>
                <CardDescription className="mt-1">Last 30 days sales revenue &amp; order count</CardDescription>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-bold tracking-tight">{formatCurrency(data.revenueTrend.totalRevenue)}</p>
                </div>
                <div className="border-l pl-6">
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-lg font-bold tracking-tight">{data.revenueTrend.totalOrders.toLocaleString('en-IN')}</p>
                </div>
                <div className="border-l pl-6">
                  <p className="text-xs text-muted-foreground">Avg Daily</p>
                  <p className="text-lg font-bold tracking-tight">{formatCurrency(data.revenueTrend.avgDailyRevenue)}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.revenueTrend.daily} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="50%" stopColor="#6366f1" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => format(parseISO(val), 'dd MMM')}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    interval={Math.floor(data.revenueTrend.daily.length / 8)}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg border bg-background px-3.5 py-2.5 shadow-xl shadow-black/[0.08]">
                          <p className="text-xs font-semibold text-foreground mb-2 pb-1.5 border-b">
                            {label ? format(parseISO(String(label)), 'EEE, dd MMM yyyy') : ''}
                          </p>
                          <div className="space-y-1.5">
                            <p className="text-sm flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />
                              <span className="text-muted-foreground">Revenue:</span>
                              <span className="font-semibold ml-auto">{formatCurrency(payload[0]?.value as number)}</span>
                            </p>
                            <p className="text-sm flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                              <span className="text-muted-foreground">Orders:</span>
                              <span className="font-semibold ml-auto">{payload[1]?.value}</span>
                            </p>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#6366f1' }}
                  />
                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block" />
                Revenue (INR)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                Orders
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders - Side by Side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Purchase Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Recent Purchase Orders</CardTitle>
              <CardDescription className="text-xs mt-0.5">Latest POs created</CardDescription>
            </div>
            <Link
              href="/purchase-orders"
              className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1.5 hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data?.recentPOs && data.recentPOs.length > 0 ? (
              <div className="divide-y">
                {data.recentPOs.map((po) => (
                  <Link
                    key={po.id}
                    href={`/purchase-orders/${po.id}`}
                    className="flex items-center justify-between py-2.5 px-2 -mx-2 hover:bg-muted/50 rounded-md transition-colors first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{po.poNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {po.supplier?.name ?? 'No supplier'} &middot; {formatDistanceToNow(new Date(po.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3 space-y-1">
                      <p className="text-sm font-medium tabular-nums">{formatCurrency(Number(po.totalAmount))}</p>
                      <StatusBadge status={po.status} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">No purchase orders yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Recent Sales Orders</CardTitle>
              <CardDescription className="text-xs mt-0.5">Latest sales across platforms</CardDescription>
            </div>
            <Link
              href="/sales/orders"
              className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1.5 hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data?.recentSalesOrders && data.recentSalesOrders.length > 0 ? (
              <div className="divide-y">
                {data.recentSalesOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/sales/orders/${order.id}`}
                    className="flex items-center justify-between py-2.5 px-2 -mx-2 hover:bg-muted/50 rounded-md transition-colors first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {order.platform.name} &middot; {order.orderedAt ? formatDistanceToNow(new Date(order.orderedAt), { addSuffix: true }) : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3 space-y-1">
                      <p className="text-sm font-medium tabular-nums">{formatCurrency(Number(order.totalAmount))}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">No sales orders yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
