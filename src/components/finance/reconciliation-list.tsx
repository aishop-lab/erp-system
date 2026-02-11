'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { FileCheck, Search } from 'lucide-react'
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
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PURCHASE_TYPE_LABELS } from '@/lib/constants'

interface ReconciliationPO {
  id: string
  poNumber: string
  purchaseType: string
  supplier: { id: string; code: string; name: string } | null
  grandTotal: number
  grnTotal: number
  variance: number
  grns: { id: string; grnNumber: string; receivedAt: string }[]
  createdAt: string
}

export function ReconciliationList() {
  const [data, setData] = useState<ReconciliationPO[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', pagination.page.toString())

      const res = await fetch(`/api/finance/reconciliation?${params}`)
      const result = await res.json()
      setData(result.data || [])
      setPagination(prev => ({
        ...prev,
        total: result.total || 0,
        totalPages: result.totalPages || 0,
      }))
    } catch (error) {
      console.error('Error fetching reconciliation data:', error)
    } finally {
      setLoading(false)
    }
  }, [search, pagination.page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search PO number or supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="pl-9"
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No purchase orders pending reconciliation
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">PO Amount</TableHead>
                <TableHead className="text-right">GRN Amount</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>GRNs</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>
                    {PURCHASE_TYPE_LABELS[po.purchaseType] || po.purchaseType}
                  </TableCell>
                  <TableCell>{po.supplier?.name || '-'}</TableCell>
                  <TableCell className="text-right">
                    {Number(po.grandTotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </TableCell>
                  <TableCell className="text-right">
                    {po.grnTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={po.variance === 0 ? 'secondary' : 'warning'}>
                      {po.variance >= 0 ? '+' : ''}{po.variance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </Badge>
                  </TableCell>
                  <TableCell>{po.grns.length}</TableCell>
                  <TableCell>{format(new Date(po.createdAt), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Button size="sm" asChild>
                      <Link href={`/finance/reconciliation/${po.id}`}>
                        <FileCheck className="mr-1 h-4 w-4" />
                        Reconcile
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
