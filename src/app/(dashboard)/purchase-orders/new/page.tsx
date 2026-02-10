'use client'

import { PageHeader } from '@/components/shared/page-header'
import { POForm } from '@/components/purchase-orders/po-form'

export default function NewPurchaseOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Create a new purchase order"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Orders', href: '/purchase-orders' },
          { label: 'New' },
        ]}
      />

      <POForm />
    </div>
  )
}
