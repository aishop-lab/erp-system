'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Eye, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PAYMENT_STATUS_MAP } from '@/lib/constants'

interface Payment {
  id: string
  paymentNumber: string
  status: string
  amount: number
  invoiceAmount: number | null
  createdAt: string
  purchaseOrder: { id: string; poNumber: string } | null
  supplier: { id: string; name: string } | null
  entity: { id: string; name: string }
}

interface EntityPaymentListProps {
  entityName: string
}

export function EntityPaymentList({ entityName }: EntityPaymentListProps) {
  const [data, setData] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [entityId, setEntityId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })

  // Fetch entity ID by name
  useEffect(() => {
    async function loadEntity() {
      try {
        const res = await fetch('/api/admin/settings/entities')
        const result = await res.json()
        const entities = Array.isArray(result) ? result : result.data || []
        const match = entities.find(
          (e: { name: string }) => e.name.toLowerCase() === entityName.toLowerCase()
        )
        if (match) setEntityId(match.id)
        else setLoading(false)
      } catch {
        setLoading(false)
      }
    }
    loadEntity()
  }, [entityName])

  const fetchData = useCallback(async () => {
    if (!entityId) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('entityId', entityId)
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
  }, [entityId, search, statusFilter, pagination.page])

  useEffect(() => {
    if (entityId) fetchData()
  }, [entityId, fetchData])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!entityId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Entity &quot;{entityName}&quot; not found. Please configure it in Admin Settings.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === 'all' ? '' : val)
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        >
          <SelectTrigger className="w-[180px]">
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

      {data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No payments found for {entityName}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((payment) => {
                const statusConfig = PAYMENT_STATUS_MAP[payment.status] || {
                  label: payment.status,
                  variant: 'secondary',
                }

                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Link
                        href={`/finance/payments/${payment.id}`}
                        className="font-medium hover:underline"
                      >
                        {payment.paymentNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {payment.purchaseOrder ? (
                        <Link
                          href={`/purchase-orders/${payment.purchaseOrder.id}`}
                          className="hover:underline"
                        >
                          {payment.purchaseOrder.poNumber}
                        </Link>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{payment.supplier?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant as any}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(payment.invoiceAmount || payment.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.createdAt), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
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
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
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
