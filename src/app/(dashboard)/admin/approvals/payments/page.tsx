import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function PaymentApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Approvals"
        description="Review and approve payment requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Approvals', href: '/admin/approvals' },
          { label: 'Payments' },
        ]}
      />

      <EmptyState
        title="No pending approvals"
        description="Payments requiring approval will appear here."
      />
    </div>
  )
}
