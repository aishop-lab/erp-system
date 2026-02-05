import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Invoices"
        description="Manage customer invoices"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Invoices' },
        ]}
      />

      <EmptyState
        title="No invoices"
        description="Customer invoices will appear here when created."
      />
    </div>
  )
}
