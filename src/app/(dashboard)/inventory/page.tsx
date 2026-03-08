'use client'

import { useState, useMemo, Fragment } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import {
  Search,
  Download,
  Package,
  AlertCircle,
  TrendingUp,
  Archive,
  ChevronDown,
  ChevronRight,
  Filter,
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

interface BatchDetail {
  batchNumber: string
  quantity: number
  createdAt: string
}

interface StockItem {
  sku: string
  productType: string
  totalQty: number
  batches: BatchDetail[]
  lastUpdated: string
}

interface Summary {
  totalSkus: number
  totalBatches: number
  byProductType: {
    fabric: number
    raw_material: number
    packaging: number
    finished: number
  }
  lowStock: number
  outOfStock: number
}

const PRODUCT_TYPES = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'finished', label: 'Finished Product' },
]

export default function StockOverviewPage() {
  const [productType, setProductType] = useState('')
  const [search, setSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (productType) params.set('productType', productType)
    if (search) params.set('search', search)
    return `/api/inventory/stock-overview?${params}`
  }, [productType, search])

  const { data: result, isLoading: loading } = useSWR<{ data: StockItem[]; summary: Summary }>(apiUrl)
  const data = result?.data || []
  const summary = result?.summary || null

  const toggleRow = (sku: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(sku)) {
        next.delete(sku)
      } else {
        next.add(sku)
      }
      return next
    })
  }

  const getStockStatus = (qty: number) => {
    if (qty === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    }
    if (qty < 10) {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">In Stock</Badge>
  }

  const exportToCSV = () => {
    if (!data.length) return

    const headers = ['SKU', 'Product Type', 'Total Quantity', 'Number of Batches', 'Status', 'Last Updated']
    const rows = data.map(item => {
      const status = item.totalQty === 0 ? 'Out of Stock' : item.totalQty < 10 ? 'Low Stock' : 'In Stock'
      return [
        item.sku,
        item.productType,
        item.totalQty,
        item.batches.length,
        status,
        format(new Date(item.lastUpdated), 'yyyy-MM-dd HH:mm'),
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-overview-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Overview"
        description="Current inventory levels across all products"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory' },
        ]}
        actions={
          <Button onClick={exportToCSV} disabled={!data.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalSkus}</div>
              <p className="text-xs text-muted-foreground">
                Across {summary.totalBatches} batches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {summary.lowStock}
              </div>
              <p className="text-xs text-muted-foreground">
                Items below threshold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <Archive className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary.outOfStock}
              </div>
              <p className="text-xs text-muted-foreground">
                Items depleted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">By Type</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Fabric:</span>
                  <span className="font-medium">{summary.byProductType.fabric}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Raw Material:</span>
                  <span className="font-medium">{summary.byProductType.raw_material}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Packaging:</span>
                  <span className="font-medium">{summary.byProductType.packaging}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Finished:</span>
                  <span className="font-medium">{summary.byProductType.finished}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU or batch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div>
            <Label>Product Type</Label>
            <Select
              value={productType || 'all'}
              onValueChange={(value) => setProductType(value === 'all' ? '' : value)}
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
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Current Stock
            {data.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({data.length} items)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !result ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : data.length === 0 && !search && !productType ? (
            <EmptyState
              title="No inventory data"
              description="Receive goods from purchase orders to start tracking inventory."
            />
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock matches your filters
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Type</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                    <TableHead className="text-center">Batches</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => {
                    const isExpanded = expandedRows.has(item.sku)
                    return (
                      <Fragment key={item.sku}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleRow(item.sku)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium font-mono">
                            {item.sku}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {item.productType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {item.totalQty.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.batches.length}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStockStatus(item.totalQty)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(item.lastUpdated), 'MMM dd, yyyy')}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/50">
                              <div className="p-4">
                                <h4 className="font-semibold mb-3">Batch Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {item.batches.map((batch, idx) => (
                                    <div
                                      key={idx}
                                      className="border rounded-lg p-3 bg-background"
                                    >
                                      <div className="font-mono text-sm font-medium mb-1">
                                        {batch.batchNumber}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Qty: {batch.quantity.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Created: {format(new Date(batch.createdAt), 'MMM dd, yyyy')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
