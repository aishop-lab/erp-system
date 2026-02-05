import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function ProductionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Production"
        description="Manage in-house production and job work"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/production/in-house">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>In-House Production</CardTitle>
              <CardDescription>
                Manage internal production runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Active productions</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/production/job-work">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Job Work</CardTitle>
              <CardDescription>
                Issue materials to vendors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Pending issuances</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
