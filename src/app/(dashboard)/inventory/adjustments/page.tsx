import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function AdjustmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        description="Manage manual stock adjustments"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Adjustments' },
        ]}
      />

      <EmptyState
        title="No adjustments"
        description="Stock adjustments will appear here when created."
      />
    </div>
  )
}
