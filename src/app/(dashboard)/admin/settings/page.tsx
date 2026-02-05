import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System configuration and settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Settings' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/settings/purchase-types">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Purchase Types</CardTitle>
              <CardDescription>Configure purchase type settings</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/sales-channels">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Sales Channels</CardTitle>
              <CardDescription>Manage marketplace channels</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/entities">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Entities</CardTitle>
              <CardDescription>Configure business entities</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/company">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic company details and branding</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
