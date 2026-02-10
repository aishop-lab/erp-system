'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { POForm } from '@/components/purchase-orders/po-form'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { POStatus } from '@/types/enums'

export default function EditPurchaseOrderPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null)

  const fetchPO = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/purchase-orders/${id}`)
      if (res.ok) {
        const data = await res.json()

        // Only allow editing draft POs
        if (data.status !== POStatus.DRAFT) {
          alert('Only draft purchase orders can be edited')
          router.push(`/purchase-orders/${id}`)
          return
        }

        // Transform data for the form
        const formData = {
          ...data,
          lineItems: data.lineItems?.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            sku: item.product?.sku || item.product?.childSku || '-',
            title: item.product?.title || item.product?.name || '-',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate),
            uom: item.product?.uom || 'Pcs',
          })) || [],
          freeTextItems: data.freeTextItems?.map((item: any) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate),
          })) || [],
          refundItems: data.refundItems?.map((item: any) => ({
            id: item.id,
            customerName: item.customerName || '',
            orderNumber: item.orderId || '',
            reason: item.reason || '',
            amount: Number(item.amount),
            refundMode: item.refundMode || 'bank_transfer',
          })) || [],
        }

        setPurchaseOrder(formData)
      } else {
        router.push('/purchase-orders')
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error)
      router.push('/purchase-orders')
    } finally {
      setLoading(false)
    }
  }, [id, router])

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
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${purchaseOrder.poNumber}`}
        description="Edit purchase order details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Orders', href: '/purchase-orders' },
          { label: purchaseOrder.poNumber, href: `/purchase-orders/${id}` },
          { label: 'Edit' },
        ]}
      />

      <POForm mode="edit" initialData={purchaseOrder} />
    </div>
  )
}
