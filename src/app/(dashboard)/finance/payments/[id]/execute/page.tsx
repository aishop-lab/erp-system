'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PaymentExecutionForm } from '@/components/finance/payment-execution-form'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function PaymentExecutePage() {
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [payment, setPayment] = useState<any>(null)

  const fetchPayment = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/finance/payments/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPayment(data)
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

  if (payment.status !== 'approved') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cannot Execute"
          description="Only approved payments can be executed"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Finance', href: '/finance' },
            { label: 'Payments', href: '/finance/payments' },
            { label: payment.paymentNumber },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Execute ${payment.paymentNumber}`}
        description="Enter payment details and complete execution"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payments', href: '/finance/payments' },
          { label: payment.paymentNumber, href: `/finance/payments/${payment.id}` },
          { label: 'Execute' },
        ]}
      />

      <PaymentExecutionForm payment={payment} />
    </div>
  )
}
