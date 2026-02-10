'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { POList } from '@/components/purchase-orders/po-list'

export default function PurchaseOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    purchaseType: '',
  })

  const fetchPOs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('pageSize', pagination.pageSize.toString())
      if (filters.search) params.set('search', filters.search)
      if (filters.status) params.set('status', filters.status)
      if (filters.purchaseType) params.set('purchaseType', filters.purchaseType)

      const res = await fetch(`/api/purchase-orders?${params}`)
      if (res.ok) {
        const result = await res.json()
        setData(result.data || [])
        setPagination({
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        })
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    fetchPOs()
  }, [fetchPOs])

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({ ...prev, status }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleTypeFilter = (purchaseType: string) => {
    setFilters((prev) => ({ ...prev, purchaseType }))
    setPagination((prev) => ({ ...prev, page: 1 }))
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
              New Order
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
          loading={loading}
          onRefresh={fetchPOs}
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
