import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function SettlementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace Settlements"
        description="Track marketplace payment settlements"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Settlements' },
        ]}
      />

      <EmptyState
        title="No settlements"
        description="Marketplace settlements will appear here when recorded."
      />
    </div>
  )
}
