import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Manage supplier payments"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Payments' },
        ]}
      />

      <EmptyState
        title="No payments"
        description="Payments will appear here when purchase orders are ready for payment."
      />
    </div>
  )
}
