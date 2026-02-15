'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Search,
  Download,
  Filter,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'

interface LedgerEntry {
  id: string
  sku: string | null
  productType: string | null
  movementType: string
  referenceNumber: string | null
  qtyIn: string
  qtyOut: string
  skuBalance: string
  batchBalance: string
  notes: string | null
  createdAt: string
  batch: { batchNumber: string } | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const MOVEMENT_TYPES = [
  { value: 'grn', label: 'GRN (Goods Receipt)' },
  { value: 'sale', label: 'Sale / Outflow' },
  { value: 'production_in', label: 'Production In' },
  { value: 'production_out', label: 'Production Out' },
  { value: 'adjustment', label: 'Manual Adjustment' },
  { value: 'return', label: 'Return' },
]

const PRODUCT_TYPES = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'finished', label: 'Finished Product' },
]

export default function StockLedgerPage() {
  const [data, setData] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 50, total: 0, totalPages: 0,
  })

  const [productType, setProductType] = useState('')
  const [movementType, setMovementType] = useState('')
  const [sku, setSku] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (productType) params.set('productType', productType)
      if (movementType) params.set('movementType', movementType)
      if (sku) params.set('sku', sku)
      if (search) params.set('search', search)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('page', pagination.page.toString())
      params.set('pageSize', pagination.pageSize.toString())

      const res = await fetch(`/api/inventory/stock-ledger?${params}`)
      const result = await res.json()
      setData(result.data || [])
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 0,
      }))
    } catch (error) {
      console.error('Error fetching stock ledger:', error)
    } finally {
      setLoading(false)
    }
  }, [productType, movementType, sku, search, startDate, endDate, pagination.page, pagination.pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetPage = () => setPagination(prev => ({ ...prev, page: 1 }))

  const hasActiveFilters = !!(productType || movementType || sku || search || startDate || endDate)

  const clearFilters = () => {
    setProductType('')
    setMovementType('')
    setSku('')
    setSearch('')
    setStartDate('')
    setEndDate('')
    resetPage()
  }

  const exportToCSV = () => {
    if (!data.length) return

    const headers = ['Date', 'SKU', 'Product Type', 'Movement Type', 'Reference', 'Qty In', 'Qty Out', 'SKU Balance', 'Batch Balance', 'Notes']
    const rows = data.map(entry => [
      format(new Date(entry.createdAt), 'yyyy-MM-dd HH:mm'),
      entry.sku || '-',
      entry.productType || '-',
      entry.movementType,
      entry.referenceNumber || '-',
      Number(entry.qtyIn),
      Number(entry.qtyOut),
      Number(entry.skuBalance),
      Number(entry.batchBalance),
      entry.notes || '-',
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const getMovementBadge = (qtyIn: number, qtyOut: number) => {
    if (qtyIn > 0) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <ArrowDownIcon className="mr-1 h-3 w-3" />
          +{qtyIn}
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="bg-red-100 text-red-800">
        <ArrowUpIcon className="mr-1 h-3 w-3" />
        -{qtyOut}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Ledger"
        description="Complete history of all inventory movements"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Ledger' },
        ]}
        actions={
          <Button onClick={exportToCSV} disabled={!data.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle>Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU, reference, notes..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage() }}
                className="pl-8"
              />
            </div>
          </div>

          <div>
            <Label>Product Type</Label>
            <Select
              value={productType || 'all'}
              onValueChange={(value) => { setProductType(value === 'all' ? '' : value); resetPage() }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PRODUCT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Movement Type</Label>
            <Select
              value={movementType || 'all'}
              onValueChange={(value) => { setMovementType(value === 'all' ? '' : value); resetPage() }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Movements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Movements</SelectItem>
                {MOVEMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>SKU</Label>
            <Input
              placeholder="Filter by SKU..."
              value={sku}
              onChange={(e) => { setSku(e.target.value); resetPage() }}
            />
          </div>

          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); resetPage() }}
            />
          </div>

          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); resetPage() }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Ledger Entries
            {pagination.total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({pagination.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : data.length === 0 && !hasActiveFilters ? (
            <EmptyState
              title="No ledger entries"
              description="Stock movements will appear here after receiving goods via GRN."
            />
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No entries match your filters
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Type</TableHead>
                      <TableHead>Movement</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">SKU Balance</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.sku || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {entry.productType?.replace('_', ' ') || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {entry.movementType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {entry.referenceNumber || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {getMovementBadge(Number(entry.qtyIn), Number(entry.qtyOut))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(entry.skuBalance).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {entry.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                    {pagination.total} entries
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
