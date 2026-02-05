import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ShivaangPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shivaang"
        description="External vendor management"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'External Vendors', href: '/external-vendors' },
          { label: 'Shivaang' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Shivaang partnership summary</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Shivaang vendor data coming soon...
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Recent activity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No recent transactions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
