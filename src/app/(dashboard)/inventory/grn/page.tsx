import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function GRNListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt Notes"
        description="Manage goods receipts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Goods Receipt' },
        ]}
        actions={
          <Button asChild>
            <Link href="/inventory/grn/new">
              <Plus className="mr-2 h-4 w-4" />
              New GRN
            </Link>
          </Button>
        }
      />

      <EmptyState
        title="No goods receipts"
        description="Create your first goods receipt note to record incoming goods."
        action={
          <Button asChild>
            <Link href="/inventory/grn/new">
              <Plus className="mr-2 h-4 w-4" />
              Create GRN
            </Link>
          </Button>
        }
      />
    </div>
  )
}
