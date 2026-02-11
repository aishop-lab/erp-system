'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PaymentDetail } from '@/components/finance/payment-detail'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function PaymentDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [payment, setPayment] = useState<any>(null)
  const [canApprove, setCanApprove] = useState(false)

  const fetchPayment = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/finance/payments/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPayment(data)
      }

      const meRes = await fetch('/api/me')
      if (meRes.ok) {
        const me = await meRes.json()
        setCanApprove(me.isSuperAdmin || false)
      }
    } catch (error) {
      console.error('Error fetching payment:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPayment()
  }, [fetchPayment])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Payment Not Found"
          description="The requested payment could not be found"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Finance', href: '/finance' },
            { label: 'Payments', href: '/finance/payments' },
            { label: 'Not Found' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.paymentNumber}
        description="Payment details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payments', href: '/finance/payments' },
          { label: payment.paymentNumber },
        ]}
      />

      <PaymentDetail
        payment={payment}
        onRefresh={fetchPayment}
        canApprove={canApprove}
      />
    </div>
  )
}
