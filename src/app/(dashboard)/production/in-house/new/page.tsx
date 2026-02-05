import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewProductionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Production Run"
        description="Create a new in-house production"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'In-House', href: '/production/in-house' },
          { label: 'New' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Production Details</CardTitle>
          <CardDescription>
            Define the output product and required materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Production form coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
