'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Eye, Search } from 'lucide-react'
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
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'

interface GRNItem {
  id: string
  grnNumber: string
  createdAt: string
  purchaseOrder: {
    id: string
    poNumber: string
    supplier: { id: string; code: string; name: string } | null
  }
  createdBy: { id: string; name: string }
  _count: { lineItems: number }
}

export default function GRNListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page.toString())
    return `/api/inventory/grn?${params}`
  }, [search, page])

  const { data: result, isLoading } = useSWR(apiUrl, (url: string) =>
    fetch(url).then(res => res.json()),
    { keepPreviousData: true }
  )
  const data = (result?.data || []) as GRNItem[]
  const pagination = {
    page,
    total: result?.total || 0,
    totalPages: result?.totalPages || 0,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt Notes"
        description="Manage goods receipts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Goods Receipt' },
        ]}
        actions={
          <Button asChild>
            <Link href="/inventory/grn/new">
              <Plus className="mr-2 h-4 w-4" />
              New GRN
            </Link>
          </Button>
        }
      />

      {isLoading && !result ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : data.length === 0 && !search ? (
        <EmptyState
          title="No goods receipts"
          description="Create your first goods receipt note to record incoming goods."
          action={
            <Button asChild>
              <Link href="/inventory/grn/new">
                <Plus className="mr-2 h-4 w-4" />
                Create GRN
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search GRN or PO number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
          </div>

          {data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No GRNs match your search
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((grn) => (
                    <TableRow key={grn.id}>
                      <TableCell className="font-medium">{grn.grnNumber}</TableCell>
                      <TableCell>
                        <Link
                          href={`/purchase-orders/${grn.purchaseOrder.id}`}
                          className="hover:underline"
                        >
                          {grn.purchaseOrder.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{grn.purchaseOrder.supplier?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{grn._count.lineItems}</Badge>
                      </TableCell>
                      <TableCell>{grn.createdBy.name}</TableCell>
                      <TableCell>{format(new Date(grn.createdAt), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/inventory/grn/${grn.id}`}>
                            <Eye className="h-4 w-4" />
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
                Page {page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
