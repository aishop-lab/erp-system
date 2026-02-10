'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PODetail } from '@/components/purchase-orders/po-detail'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null)
  const [canApprove, setCanApprove] = useState(false)

  const fetchPO = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/purchase-orders/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPurchaseOrder(data)
      }

      // Check if current user can approve POs
      const meRes = await fetch('/api/me')
      if (meRes.ok) {
        const me = await meRes.json()
        setCanApprove(me.isSuperAdmin || false)
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPO()
  }, [fetchPO])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Purchase Order Not Found"
          description="The requested purchase order could not be found"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Purchase Orders', href: '/purchase-orders' },
            { label: 'Not Found' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={purchaseOrder.poNumber}
        description="Purchase order details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Orders', href: '/purchase-orders' },
          { label: purchaseOrder.poNumber },
        ]}
      />

      <PODetail
        purchaseOrder={purchaseOrder}
        onRefresh={fetchPO}
        canApprove={canApprove}
      />
    </div>
  )
}
