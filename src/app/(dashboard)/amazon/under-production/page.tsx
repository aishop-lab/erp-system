'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Search, Package, AlertTriangle, Clock, Layers } from 'lucide-react'

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error: ${r.status}`)
    return r.json()
  })

interface UnderProductionItem {
  productId: string
  productType: string
  productSku: string
  productName: string
  poNumber: string
  poId: string
  supplierId: string | null
  supplierName: string
  supplierCode: string
  orderedQty: number
  receivedQty: number
  pendingQty: number
  expectedDelivery: string | null
}

interface AggregatedItem {
  productId: string
  productType: string
  productSku: string
  productName: string
  poNumbers: string[]
  poIds: string[]
  supplierNames: string[]
  supplierIds: string[]
  totalOrderedQty: number
  totalReceivedQty: number
  totalPendingQty: number
  earliestDelivery: string | null
}

const PAGE_SIZE = 25

export default function UnderProductionPage() {
  const [search, setSearch] = useState('')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useSWR<{ data: UnderProductionItem[] }>(
    '/api/purchase-orders/under-production',
    fetcher
  )

  const items = data?.data || []

  // Extract unique vendors for the filter dropdown
  const vendors = useMemo(() => {
    const vendorMap = new Map<string, string>()
    for (const item of items) {
      if (item.supplierId && item.supplierName !== 'N/A') {
        vendorMap.set(item.supplierId, item.supplierName)
      }
    }
    return Array.from(vendorMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  // Aggregate line items by product (productId + productType)
  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedItem>()

    for (const item of items) {
      // Apply vendor filter
      if (vendorFilter !== 'all' && item.supplierId !== vendorFilter) continue

      const key = `${item.productId}__${item.productType}`
      const existing = map.get(key)

      if (existing) {
        if (!existing.poNumbers.includes(item.poNumber)) {
          existing.poNumbers.push(item.poNumber)
          existing.poIds.push(item.poId)
        }
        if (!existing.supplierNames.includes(item.supplierName)) {
          existing.supplierNames.push(item.supplierName)
          existing.supplierIds.push(item.supplierId || '')
        }
        existing.totalOrderedQty += item.orderedQty
        existing.totalReceivedQty += item.receivedQty
        existing.totalPendingQty += item.pendingQty
        if (
          item.expectedDelivery &&
          (!existing.earliestDelivery || item.expectedDelivery < existing.earliestDelivery)
        ) {
          existing.earliestDelivery = item.expectedDelivery
        }
      } else {
        map.set(key, {
          productId: item.productId,
          productType: item.productType,
          productSku: item.productSku,
          productName: item.productName,
          poNumbers: [item.poNumber],
          poIds: [item.poId],
          supplierNames: [item.supplierName],
          supplierIds: [item.supplierId || ''],
          totalOrderedQty: item.orderedQty,
          totalReceivedQty: item.receivedQty,
          totalPendingQty: item.pendingQty,
          earliestDelivery: item.expectedDelivery,
        })
      }
    }

    return Array.from(map.values())
  }, [items, vendorFilter])

  // Apply search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return aggregated
    const q = search.toLowerCase()
    return aggregated.filter(
      (item) =>
        item.productSku.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.poNumbers.some((po) => po.toLowerCase().includes(q)) ||
        item.supplierNames.some((s) => s.toLowerCase().includes(q))
    )
  }, [aggregated, search])

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary stats
  const totalPending = filtered.reduce((sum, item) => sum + item.totalPendingQty, 0)
  const totalOrdered = filtered.reduce((sum, item) => sum + item.totalOrderedQty, 0)
  const totalReceived = filtered.reduce((sum, item) => sum + item.totalReceivedQty, 0)
  const uniqueProducts = filtered.length

  // CSV export
  const handleExportCSV = () => {
    const headers = [
      'Product SKU',
      'Product Name',
      'Product Type',
      'PO Numbers',
      'Suppliers',
      'Ordered Qty',
      'Received Qty',
      'Pending Qty',
      'Expected Delivery',
    ]
    const rows = filtered.map((item) => [
      item.productSku,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.productType,
      `"${item.poNumbers.join(', ')}"`,
      `"${item.supplierNames.join(', ')}"`,
      item.totalOrderedQty,
      item.totalReceivedQty,
      item.totalPendingQty,
      item.earliestDelivery
        ? new Date(item.earliestDelivery).toLocaleDateString()
        : '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `under-production-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatProductType = (type: string) => {
    const map: Record<string, string> = {
      finished: 'Finished',
      fabric: 'Fabric',
      raw_material: 'Raw Material',
      packaging: 'Packaging',
      unknown: 'Unknown',
    }
    return map[type] || type
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Under Production"
        description="Items currently being produced - PO line items with pending quantities"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Amazon', href: '/amazon/dashboard' },
          { label: 'Under Production' },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">Products with pending quantities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ordered</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrdered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units across all POs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceived.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalOrdered > 0
                ? `${((totalReceived / totalOrdered) * 100).toFixed(1)}% fulfilled`
                : '0% fulfilled'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units awaiting delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search SKU, product, PO, vendor..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={vendorFilter}
                onValueChange={(v) => {
                  setVendorFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-muted-foreground">Loading under-production items...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-red-500">Failed to load data. Please try again.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No pending items found</p>
              <p className="text-xs text-muted-foreground">
                {search || vendorFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All PO line items have been fully received'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>PO Number(s)</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Expected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((item) => (
                    <TableRow key={`${item.productId}__${item.productType}`}>
                      <TableCell className="font-mono text-xs">{item.productSku}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium" title={item.productName}>
                        {item.productName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {formatProductType(item.productType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.poNumbers.map((po) => (
                            <Badge key={po} variant="secondary" className="text-xs font-mono">
                              {po}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={item.supplierNames.join(', ')}>
                        {item.supplierNames.join(', ')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.totalOrderedQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.totalReceivedQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold tabular-nums text-red-600">
                          {item.totalPendingQty.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.earliestDelivery
                          ? new Date(item.earliestDelivery).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1} -{' '}
                    {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
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
