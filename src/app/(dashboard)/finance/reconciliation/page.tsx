import { PageHeader } from '@/components/shared/page-header'
import { ReconciliationList } from '@/components/finance/reconciliation-list'

export default function ReconciliationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliation"
        description="Match PO amounts with GRN receipts and supplier invoices"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reconciliation' },
        ]}
      />

      <ReconciliationList />
    </div>
  )
}
