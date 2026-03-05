'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Card, CardContent } from '@/components/ui/card'
import { Search, ChevronLeft, ChevronRight, Package, Download } from 'lucide-react'
import { SALES_ORDER_STATUS_MAP } from '@/lib/constants'

interface SalesOrder {
  id: string
  orderNumber: string
  externalOrderId: string | null
  status: string
  customerName: string | null
  totalAmount: string
  currency: string
  paymentStatus: string
  fulfillmentStatus: string
  orderedAt: string | null
  platform: { id: string; name: string; displayName: string }
  _count: { items: number }
}

interface OrdersResponse {
  orders: SalesOrder[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function SalesOrdersPage() {
  const [data, setData] = useState<OrdersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [platformId, setPlatformId] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [platforms, setPlatforms] = useState<any[]>([])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', '20')
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    if (platformId !== 'all') params.set('platformId', platformId)

    const res = await fetch(`/api/sales/orders?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [page, search, status, platformId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    fetch('/api/sales/platforms')
      .then(r => r.json())
      .then(setPlatforms)
      .catch(() => {})
  }, [])

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount))
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const exportCSV = () => {
    if (!data?.orders) return
    const headers = ['Order #', 'Platform', 'Status', 'Customer', 'Amount', 'Payment', 'Date']
    const rows = data.orders.map(o => [
      o.orderNumber,
      o.platform.displayName,
      o.status,
      o.customerName || '-',
      o.totalAmount,
      o.paymentStatus,
      o.orderedAt ? new Date(o.orderedAt).toISOString().split('T')[0] : '-',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description={`${data?.total || 0} orders across all platforms`}
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Orders' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order #, customer..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(SALES_ORDER_STATUS_MAP).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platformId} onValueChange={v => { setPlatformId(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !data?.orders?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 mb-2" />
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                data.orders.map(order => {
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
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {order.platform.displayName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant as any}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {order.customerName || '-'}
                      </TableCell>
                      <TableCell>{order._count.items}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'secondary'} className="capitalize">
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.orderedAt)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
