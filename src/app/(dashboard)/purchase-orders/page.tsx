import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function PurchaseOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage all purchase orders"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Orders' },
        ]}
        actions={
          <Button asChild>
            <Link href="/purchase-orders/new">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Link>
          </Button>
        }
      />

      <EmptyState
        title="No purchase orders"
        description="Create your first purchase order to get started."
        action={
          <Button asChild>
            <Link href="/purchase-orders/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Purchase Order
            </Link>
          </Button>
        }
      />
    </div>
  )
}
