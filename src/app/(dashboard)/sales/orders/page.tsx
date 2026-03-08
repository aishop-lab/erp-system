'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
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
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [platformId, setPlatformId] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Debounce search
  const searchTimer = useMemo(() => {
    let timer: NodeJS.Timeout
    return (value: string) => {
      setSearch(value)
      clearTimeout(timer)
      timer = setTimeout(() => {
        setDebouncedSearch(value)
        setPage(1)
      }, 300)
    }
  }, [])

  const ordersUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', '20')
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (status !== 'all') params.set('status', status)
    if (platformId !== 'all') params.set('platformId', platformId)
    return `/api/sales/orders?${params}`
  }, [page, debouncedSearch, status, platformId])

  const { data, isLoading: loading } = useSWR<OrdersResponse>(ordersUrl)
  const { data: platforms } = useSWR<any[]>('/api/sales/platforms')

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
    <div className="space-y-5">
      <PageHeader
        title="Sales Orders"
        description={`${data?.total?.toLocaleString('en-IN') || 0} orders across all platforms`}
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
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order #, customer..."
                value={search}
                onChange={e => searchTimer(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-9">
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
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {(platforms || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Order #</TableHead>
                  <TableHead className="font-semibold">Platform</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold text-center">Items</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Payment</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !data ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !data?.orders?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Package className="mx-auto h-10 w-10 mb-3 text-muted-foreground/40" />
                      <p className="font-medium">No orders found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.orders.map((order, idx) => {
                    const statusInfo = SALES_ORDER_STATUS_MAP[order.status] || { label: order.status, variant: 'secondary' }
                    return (
                      <TableRow key={order.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell>
                          <Link
                            href={`/sales/orders/${order.id}`}
                            className="font-medium text-primary hover:underline text-sm"
                          >
                            {order.orderNumber.length > 20
                              ? `...${order.orderNumber.slice(-15)}`
                              : order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs font-normal">
                            {order.platform.displayName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant as any} className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm">
                          {order.customerName || '-'}
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums">
                          {order._count.items}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm tabular-nums">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={order.paymentStatus === 'paid' ? 'success' : 'secondary'}
                            className="capitalize text-xs"
                          >
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm tabular-nums">
                          {formatDate(order.orderedAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(data.page - 1) * data.pageSize + 1}</span>-<span className="font-medium text-foreground">{Math.min(data.page * data.pageSize, data.total)}</span> of <span className="font-medium text-foreground">{data.total.toLocaleString('en-IN')}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                let pageNum: number
                if (data.totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= data.totalPages - 2) {
                  pageNum = data.totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
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
