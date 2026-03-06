'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Eye, Search, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_STATUS_MAP } from '@/lib/constants'

interface Payment {
  id: string
  paymentNumber: string
  status: string
  amount: number
  invoiceAmount: number | null
  createdAt: string
  purchaseOrder: { id: string; poNumber: string; purchaseType: string; grandTotal: number } | null
  supplier: { id: string; code: string; name: string } | null
  entity: { id: string; name: string }
  createdBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export function PaymentList() {
  const [data, setData] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', pagination.page.toString())

      const res = await fetch(`/api/finance/payments?${params}`)
      const result = await res.json()
      setData(result.data || [])
      setPagination(prev => ({
        ...prev,
        total: result.total || 0,
        totalPages: result.totalPages || 0,
      }))
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, pagination.page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="pl-9 h-9"
              />
            </div>
            <Select
              value={statusFilter || 'all'}
              onValueChange={(val) => {
                setStatusFilter(val === 'all' ? '' : val)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(PAYMENT_STATUS_MAP).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Payment #</TableHead>
                  <TableHead className="font-semibold">PO Number</TableHead>
                  <TableHead className="font-semibold">Supplier</TableHead>
                  <TableHead className="font-semibold">Entity</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No payments found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Payment #</TableHead>
                  <TableHead className="font-semibold">PO Number</TableHead>
                  <TableHead className="font-semibold">Supplier</TableHead>
                  <TableHead className="font-semibold">Entity</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((payment, idx) => {
                  const statusConfig = PAYMENT_STATUS_MAP[payment.status] || {
                    label: payment.status,
                    variant: 'secondary',
                  }

                  return (
                    <TableRow key={payment.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <TableCell>
                        <Link
                          href={`/finance/payments/${payment.id}`}
                          className="font-medium text-primary hover:underline text-sm"
                        >
                          {payment.paymentNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.purchaseOrder ? (
                          <Link
                            href={`/purchase-orders/${payment.purchaseOrder.id}`}
                            className="text-primary hover:underline"
                          >
                            {payment.purchaseOrder.poNumber}
                          </Link>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-sm">{payment.supplier?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {payment.entity?.name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant as any} className="text-xs">
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">
                        {fmt(Number(payment.invoiceAmount || payment.amount))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {format(new Date(payment.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/finance/payments/${payment.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center px-1">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{pagination.page}</span> of <span className="font-medium text-foreground">{pagination.totalPages}</span> ({pagination.total} total)
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
