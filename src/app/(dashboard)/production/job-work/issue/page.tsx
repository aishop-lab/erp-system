import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function IssueMaterialsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue Raw Materials"
        description="Issue materials to a vendor for job work"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'Job Work', href: '/production/job-work' },
          { label: 'Issue Materials' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Material Issuance</CardTitle>
          <CardDescription>
            Select a purchase order and materials to issue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Material issuance form coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
