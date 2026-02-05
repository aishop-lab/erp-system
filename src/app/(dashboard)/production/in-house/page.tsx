import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function InHouseProductionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="In-House Production"
        description="Manage internal production runs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'In-House' },
        ]}
        actions={
          <Button asChild>
            <Link href="/production/in-house/new">
              <Plus className="mr-2 h-4 w-4" />
              New Production
            </Link>
          </Button>
        }
      />

      <EmptyState
        title="No production records"
        description="Create your first production run to get started."
        action={
          <Button asChild>
            <Link href="/production/in-house/new">
              <Plus className="mr-2 h-4 w-4" />
              Start Production
            </Link>
          </Button>
        }
      />
    </div>
  )
}
