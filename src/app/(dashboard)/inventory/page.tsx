import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Overview"
        description="View current inventory levels"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory' },
        ]}
      />

      <EmptyState
        title="No inventory data"
        description="Receive goods from purchase orders to start tracking inventory."
      />
    </div>
  )
}
