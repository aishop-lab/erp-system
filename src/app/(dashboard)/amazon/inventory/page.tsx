'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import {
  Search,
  Download,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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

interface InventoryItem {
  sku: string
  asin: string | null
  barcode: string | null
  styleName: string | null
  category: string | null
  color: string | null
  size: string | null
  title: string | null
  finishedProductId: string | null
  actualQty: number
  amazonQty: number
  diff: number
  priority: 'none' | 'low' | 'medium' | 'high'
}

interface Summary {
  totalSkus: number
  matching: number
  discrepancies: number
  highPriority: number
}

interface FiltersData {
  styles: string[]
  colors: string[]
  categories: string[]
}

interface ApiResponse {
  data: InventoryItem[]
  summary: Summary
  filters: FiltersData
}

const PRIORITY_CONFIG = {
  none: { label: 'Match', variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  low: { label: 'Low', variant: 'default' as const, className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  medium: { label: 'Medium', variant: 'default' as const, className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  high: { label: 'High', variant: 'destructive' as const, className: '' },
}

export default function AmazonInventoryComparisonPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [styleFilter, setStyleFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showOnly, setShowOnly] = useState<'all' | 'discrepancies' | 'matching'>('all')

  // Debounce search
  const searchTimer = useMemo(() => {
    let timer: NodeJS.Timeout
    return (value: string) => {
      setSearch(value)
      clearTimeout(timer)
      timer = setTimeout(() => {
        setDebouncedSearch(value)
      }, 300)
    }
  }, [])

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (styleFilter) params.set('style', styleFilter)
    if (colorFilter) params.set('color', colorFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    return `/api/amazon/inventory?${params}`
  }, [debouncedSearch, styleFilter, colorFilter, categoryFilter])

  const { data: result, isLoading: loading } = useSWR<ApiResponse>(apiUrl)
  const allData = result?.data || []
  const summary = result?.summary || null
  const filterOptions = result?.filters || { styles: [], colors: [], categories: [] }

  // Client-side filter for match/discrepancy view
  const data = useMemo(() => {
    if (showOnly === 'discrepancies') return allData.filter(i => i.diff !== 0)
    if (showOnly === 'matching') return allData.filter(i => i.diff === 0)
    return allData
  }, [allData, showOnly])

  const getDiffDisplay = (diff: number) => {
    if (diff === 0) return <span className="text-green-600 font-medium">0</span>
    if (diff > 0) return <span className="text-blue-600 font-medium">+{diff}</span>
    return <span className="text-red-600 font-medium">{diff}</span>
  }

  const getRowHighlight = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50/60'
      case 'medium': return 'bg-orange-50/50'
      case 'low': return 'bg-yellow-50/40'
      default: return ''
    }
  }

  const exportToCSV = () => {
    if (!data.length) return

    const headers = [
      'SKU', 'ASIN', 'Barcode', 'Style', 'Color', 'Size', 'Category',
      'Actual Qty', 'Amazon Qty', 'Difference', 'Priority',
    ]
    const rows = data.map(item => [
      item.sku,
      item.asin || '',
      item.barcode || '',
      item.styleName || '',
      item.color || '',
      item.size || '',
      item.category || '',
      item.actualQty,
      item.amazonQty,
      item.diff,
      item.priority,
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `amazon-inventory-comparison-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStyleFilter('')
    setColorFilter('')
    setCategoryFilter('')
    setShowOnly('all')
  }

  const hasActiveFilters = styleFilter || colorFilter || categoryFilter || showOnly !== 'all' || debouncedSearch

  return (
    <div className="space-y-5">
      <PageHeader
        title="Amazon Inventory Comparison"
        description="Compare actual warehouse inventory against Amazon FBA listings"
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Amazon', href: '/sales/amazon' },
          { label: 'Inventory Comparison' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!data.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalSkus}</div>
              <p className="text-xs text-muted-foreground">
                Tracked across warehouses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Matching</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.matching}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalSkus > 0
                  ? `${((summary.matching / summary.totalSkus) * 100).toFixed(1)}% of total`
                  : 'No data'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.discrepancies}</div>
              <p className="text-xs text-muted-foreground">
                Qty mismatch between actual and Amazon
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.highPriority}</div>
              <p className="text-xs text-muted-foreground">
                Difference greater than 10 units
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs">Search SKU / ASIN</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => searchTimer(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Style</Label>
            <Select
              value={styleFilter || 'all'}
              onValueChange={(v) => setStyleFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Styles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles</SelectItem>
                {filterOptions.styles.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Color</Label>
            <Select
              value={colorFilter || 'all'}
              onValueChange={(v) => setColorFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Colors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colors</SelectItem>
                {filterOptions.colors.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Category</Label>
            <Select
              value={categoryFilter || 'all'}
              onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {filterOptions.categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Show</Label>
            <Select
              value={showOnly}
              onValueChange={(v) => setShowOnly(v as 'all' | 'discrepancies' | 'matching')}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SKUs</SelectItem>
                <SelectItem value="discrepancies">Discrepancies Only</SelectItem>
                <SelectItem value="matching">Matching Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Inventory Comparison
            {data.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({data.length} {data.length === 1 ? 'item' : 'items'})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !result ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : data.length === 0 && !hasActiveFilters ? (
            <div className="px-6 pb-6">
              <EmptyState
                title="No inventory data"
                description="Warehouse stock data will appear here once inventory is synced from Amazon and your warehouses."
              />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items match your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">SKU</TableHead>
                    <TableHead className="font-semibold">ASIN</TableHead>
                    <TableHead className="font-semibold">Style</TableHead>
                    <TableHead className="font-semibold">Color</TableHead>
                    <TableHead className="font-semibold">Size</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold text-right">Actual Qty</TableHead>
                    <TableHead className="font-semibold text-right">Amazon Qty</TableHead>
                    <TableHead className="font-semibold text-right">Diff</TableHead>
                    <TableHead className="font-semibold text-center">Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, idx) => {
                    const priorityConfig = PRIORITY_CONFIG[item.priority]
                    const rowBg = getRowHighlight(item.priority)
                    return (
                      <TableRow
                        key={item.sku}
                        className={`${rowBg} ${idx % 2 === 0 && !rowBg ? 'bg-background' : !rowBg ? 'bg-muted/20' : ''}`}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {item.sku}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.asin || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.styleName || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.color || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.size || '-'}
                        </TableCell>
                        <TableCell>
                          {item.category ? (
                            <Badge variant="outline" className="text-xs font-normal capitalize">
                              {item.category}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-sm">
                          {item.actualQty}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-sm">
                          {item.amazonQty}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {getDiffDisplay(item.diff)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={priorityConfig.variant}
                            className={`text-xs ${priorityConfig.className}`}
                          >
                            {priorityConfig.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
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
