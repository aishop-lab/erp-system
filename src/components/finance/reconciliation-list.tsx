'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { FileCheck, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
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

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search PO number or supplier..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="pl-9 h-9"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">PO Number</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Supplier</TableHead>
                  <TableHead className="font-semibold text-right">PO Amount</TableHead>
                  <TableHead className="font-semibold text-right">GRN Amount</TableHead>
                  <TableHead className="font-semibold text-right">Variance</TableHead>
                  <TableHead className="font-semibold text-center">GRNs</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
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
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No purchase orders pending reconciliation</p>
            <p className="text-sm text-muted-foreground/70 mt-1">All POs have been reconciled</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">PO Number</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Supplier</TableHead>
                  <TableHead className="font-semibold text-right">PO Amount</TableHead>
                  <TableHead className="font-semibold text-right">GRN Amount</TableHead>
                  <TableHead className="font-semibold text-right">Variance</TableHead>
                  <TableHead className="font-semibold text-center">GRNs</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((po, idx) => (
                  <TableRow key={po.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <TableCell>
                      <span className="font-medium text-sm">{po.poNumber}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {PURCHASE_TYPE_LABELS[po.purchaseType] || po.purchaseType}
                    </TableCell>
                    <TableCell className="text-sm">{po.supplier?.name || '-'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium">
                      {fmt(Number(po.grandTotal))}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {fmt(po.grnTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        po.variance === 0
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {po.variance !== 0 && <AlertTriangle className="h-3 w-3" />}
                        {po.variance >= 0 ? '+' : ''}{fmt(po.variance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium">
                        {po.grns.length}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {format(new Date(po.createdAt), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/finance/reconciliation/${po.id}`}>
                          <FileCheck className="mr-1.5 h-3.5 w-3.5" />
                          Reconcile
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
