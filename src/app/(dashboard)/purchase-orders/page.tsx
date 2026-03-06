'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { POList } from '@/components/purchase-orders/po-list'

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    purchaseType: '',
  })

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.purchaseType) params.set('purchaseType', filters.purchaseType)
    return `/api/purchase-orders?${params}`
  }, [page, pageSize, filters])

  const { data: result, isLoading: loading, mutate } = useSWR(apiUrl)

  const data = result?.data || []
  const pagination = {
    page: result?.page || 1,
    pageSize: result?.pageSize || pageSize,
    total: result?.total || 0,
    totalPages: result?.totalPages || 0,
  }

  const handlePageChange = (p: number) => setPage(p)

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }))
    setPage(1)
  }

  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({ ...prev, status }))
    setPage(1)
  }

  const handleTypeFilter = (purchaseType: string) => {
    setFilters((prev) => ({ ...prev, purchaseType }))
    setPage(1)
  }

  const isEmpty = !loading && data.length === 0 && !filters.search && !filters.status && !filters.purchaseType

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage all purchase orders"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Orders' },
        ]}
        actions={
          <Button asChild>
            <Link href="/purchase-orders/new">
              <Plus className="mr-2 h-4 w-4" />
              New PO
            </Link>
          </Button>
        }
      />

      {isEmpty ? (
        <EmptyState
          title="No purchase orders"
          description="Create your first purchase order to get started."
          action={
            <Button asChild>
              <Link href="/purchase-orders/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Purchase Order
              </Link>
            </Button>
          }
        />
      ) : (
        <POList
          data={data}
          loading={loading && !result}
          onRefresh={() => mutate()}
          pagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          onStatusFilter={handleStatusFilter}
          onTypeFilter={handleTypeFilter}
        />
      )}
    </div>
  )
}
