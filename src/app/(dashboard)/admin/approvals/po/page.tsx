import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function POApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="PO Approvals"
        description="Review and approve purchase orders"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Approvals', href: '/admin/approvals' },
          { label: 'Purchase Orders' },
        ]}
      />

      <EmptyState
        title="No pending approvals"
        description="Purchase orders requiring approval will appear here."
      />
    </div>
  )
}
