'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { ReconciliationForm } from '@/components/finance/reconciliation-form'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function ReconciliationDetailPage() {
  const params = useParams()
  const poId = params?.poId as string
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null)

  const fetchPO = useCallback(async () => {
    if (!poId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/finance/reconciliation/${poId}`)
      if (res.ok) {
        const data = await res.json()
        setPurchaseOrder(data)
      }
    } catch (error) {
      console.error('Error fetching PO for reconciliation:', error)
    } finally {
      setLoading(false)
    }
  }, [poId])

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
          description="The requested purchase order could not be found or is not eligible for reconciliation"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Finance', href: '/finance' },
            { label: 'Reconciliation', href: '/finance/reconciliation' },
            { label: 'Not Found' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Reconcile ${purchaseOrder.poNumber}`}
        description="Verify three-way match and submit for payment"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reconciliation', href: '/finance/reconciliation' },
          { label: purchaseOrder.poNumber },
        ]}
      />

      <ReconciliationForm purchaseOrder={purchaseOrder} />
    </div>
  )
}
