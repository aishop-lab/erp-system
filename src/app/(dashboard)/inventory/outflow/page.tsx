import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function OutflowPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Outflow"
        description="Track stock movements out"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Outflow' },
        ]}
      />

      <EmptyState
        title="No outflow records"
        description="Record sales, samples, or production consumption to track outflow."
      />
    </div>
  )
}
