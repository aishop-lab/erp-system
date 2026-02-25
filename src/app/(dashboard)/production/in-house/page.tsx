'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, ArrowRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { PRODUCTION_STATUS_MAP } from '@/lib/constants'

export default function InHouseProductionPage() {
  const [productions, setProductions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchProductions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        productionType: 'in_house',
        page: page.toString(),
        pageSize: '20',
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/production/orders?${params}`)
      const data = await res.json()
      setProductions(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching productions:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchProductions()
  }, [fetchProductions])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchProductions()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="In-House Production"
        description="Manage internal production runs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'In-House' },
        ]}
        actions={
          <Button asChild>
            <Link href="/production/in-house/new">
              <Plus className="mr-2 h-4 w-4" />
              New Production
            </Link>
          </Button>
        }
      />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number, product, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : productions.length === 0 ? (
        <EmptyState
          title="No production records"
          description={search ? 'No results match your search.' : 'Create your first production run to get started.'}
          action={
            !search ? (
              <Button asChild>
                <Link href="/production/in-house/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Start Production
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Production Orders ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Production #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Planned Qty</TableHead>
                    <TableHead className="text-right">Actual Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productions.map((order: any) => {
                    const statusConfig = PRODUCTION_STATUS_MAP[order.status]
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.productionNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.productName || '-'}</div>
                          <div className="text-xs text-muted-foreground">{order.sku || ''}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {order.plannedQty ? Number(order.plannedQty) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.actualQty ? Number(order.actualQty) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig?.variant as any || 'secondary'}>
                            {statusConfig?.label || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.targetDate
                            ? format(new Date(order.targetDate), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.createdBy?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/production/in-house/${order.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
