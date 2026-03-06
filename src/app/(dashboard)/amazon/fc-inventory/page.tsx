'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Download, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function FCInventoryPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25

  // Fetch sales dashboard data which includes platform inventory
  const { data, isLoading } = useSWR('/api/sales/dashboard', (url: string) =>
    fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  )

  // For now, show a placeholder with the data we have from sales dashboard
  const platformData = data?.platforms || []
  const amazonPlatform = platformData.find((p: any) =>
    p.name?.toLowerCase().includes('amazon')
  )

  // Use inventory stock data instead
  const { data: stockData, isLoading: stockLoading } = useSWR(
    '/api/inventory/stock-overview',
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  )

  const stockItems = useMemo(() => {
    if (!stockData?.data) return []
    return stockData.data
  }, [stockData])

  // Filter stock items
  const filteredItems = useMemo(() => {
    if (!search) return stockItems
    const q = search.toLowerCase()
    return stockItems.filter((item: any) =>
      (item.sku || '').toLowerCase().includes(q) ||
      (item.productType || '').toLowerCase().includes(q)
    )
  }, [stockItems, search])

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize)
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)

  // Summary stats
  const summary = stockData?.summary || {}

  const handleExportCSV = () => {
    const headers = ['SKU', 'Product Type', 'Total Qty', 'Batches', 'Status']
    const rows = filteredItems.map((item: any) => [
      item.sku || '',
      item.productType || '',
      item.totalQty || 0,
      item.batchCount || 0,
      item.status || '',
    ])
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fc-inventory-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loading = isLoading || stockLoading

  return (
    <div className="space-y-6">
      <PageHeader
        title="FC Inventory"
        description="Fulfillment center inventory overview and stock levels"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Amazon', href: '/amazon/dashboard' },
          { label: 'FC Inventory' },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground">Total SKUs</p>
                <p className="text-2xl font-bold">{summary.totalSkus || filteredItems.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground">In Stock</p>
                <p className="text-2xl font-bold text-green-600">{summary.inStock || '-'}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{summary.lowStock || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{summary.outOfStock || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Amazon Platform Info */}
          {amazonPlatform && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Amazon Platform Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Platform</p>
                    <p className="font-medium">{amazonPlatform.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Orders</p>
                    <p className="font-medium">{amazonPlatform.orderCount?.toLocaleString() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Revenue</p>
                    <p className="font-medium">
                      {amazonPlatform.totalRevenue
                        ? Number(amazonPlatform.totalRevenue).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last Sync</p>
                    <p className="font-medium">
                      {amazonPlatform.lastSyncAt
                        ? new Date(amazonPlatform.lastSyncAt).toLocaleString('en-IN')
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search SKU..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Stock Table */}
          {pagedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No inventory data available
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Type</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedItems.map((item: any, i: number) => (
                    <TableRow key={item.sku || i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                      <TableCell className="font-medium font-mono text-sm">{item.sku || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {(item.productType || '').replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {item.totalQty || 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.batchCount || 0}
                      </TableCell>
                      <TableCell>
                        {(item.totalQty || 0) === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : (item.totalQty || 0) < 5 ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">Low Stock</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({filteredItems.length} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
