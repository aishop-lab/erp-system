import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function CreditsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Credits"
        description="Manage customer store credits"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Store Credits' },
        ]}
      />

      <EmptyState
        title="No store credits"
        description="Customer store credit accounts will appear here."
      />
    </div>
  )
}
