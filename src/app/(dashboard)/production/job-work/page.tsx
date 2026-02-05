import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function JobWorkPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Work"
        description="Issue raw materials to vendors"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'Job Work' },
        ]}
        actions={
          <Button asChild>
            <Link href="/production/job-work/issue">
              <Plus className="mr-2 h-4 w-4" />
              Issue Materials
            </Link>
          </Button>
        }
      />

      <EmptyState
        title="No material issuances"
        description="Issue materials to vendors for job work production."
        action={
          <Button asChild>
            <Link href="/production/job-work/issue">
              <Plus className="mr-2 h-4 w-4" />
              Issue Materials
            </Link>
          </Button>
        }
      />
    </div>
  )
}
