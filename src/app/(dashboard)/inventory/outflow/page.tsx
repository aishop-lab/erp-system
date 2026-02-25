'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'

const OUTFLOW_TYPES: Record<string, { label: string; variant: string }> = {
  sale: { label: 'Sale', variant: 'default' },
  sample: { label: 'Sample', variant: 'secondary' },
  production_consumption: { label: 'Production', variant: 'secondary' },
  marketing: { label: 'Marketing', variant: 'secondary' },
  damage: { label: 'Damage', variant: 'destructive' },
  return_to_supplier: { label: 'Return', variant: 'secondary' },
  internal_use: { label: 'Internal', variant: 'secondary' },
  theft_loss: { label: 'Theft/Loss', variant: 'destructive' },
  other: { label: 'Other', variant: 'secondary' },
}

export default function OutflowPage() {
  const [outflows, setOutflows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterType, setFilterType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchOutflows = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString() })
      if (filterType) params.set('outflowType', filterType)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/inventory/outflow?${params}`)
      const data = await res.json()
      setOutflows(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching outflows:', error)
    } finally {
      setLoading(false)
    }
  }, [page, filterType, startDate, endDate])

  useEffect(() => {
    fetchOutflows()
  }, [fetchOutflows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Outflow"
        description="Track stock leaving the warehouse"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Outflow' },
        ]}
        actions={
          <Button asChild>
            <Link href="/inventory/outflow/new">
              <Plus className="mr-2 h-4 w-4" />
              New Outflow
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(OUTFLOW_TYPES).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setFilterType(''); setStartDate(''); setEndDate(''); setPage(1) }}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : outflows.length === 0 ? (
        <EmptyState
          title="No outflow records"
          description="Record sales, samples, or other stock movements."
          action={
            <Button asChild>
              <Link href="/inventory/outflow/new">New Outflow</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Outflow Records ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outflow #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outflows.map((outflow: any) => {
                    const typeConfig = OUTFLOW_TYPES[outflow.outflowType] || { label: outflow.outflowType, variant: 'secondary' }
                    return (
                      <TableRow key={outflow.id}>
                        <TableCell className="font-mono text-sm">{outflow.outflowNumber}</TableCell>
                        <TableCell>
                          <Badge variant={typeConfig.variant as any}>{typeConfig.label}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(outflow.outflowDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{outflow.recipientName || '-'}</TableCell>
                        <TableCell className="text-right">{outflow.totalItems}</TableCell>
                        <TableCell className="text-right font-medium">{Number(outflow.totalQuantity)}</TableCell>
                        <TableCell>{outflow.user?.name || '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
