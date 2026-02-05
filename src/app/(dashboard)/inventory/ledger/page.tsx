import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function StockLedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Ledger"
        description="Complete history of all stock movements"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Ledger' },
        ]}
      />

      <EmptyState
        title="No ledger entries"
        description="Stock movements will be recorded here automatically."
      />
    </div>
  )
}
