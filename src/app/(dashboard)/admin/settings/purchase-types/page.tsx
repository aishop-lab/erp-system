import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PurchaseTypesSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Types"
        description="Configure purchase type settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Purchase Types' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Purchase Type Configuration</CardTitle>
          <CardDescription>
            Manage the different types of purchases and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Purchase type configuration coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
