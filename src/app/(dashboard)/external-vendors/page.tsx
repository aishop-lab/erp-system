import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function ExternalVendorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="External Vendors"
        description="Manage external vendor partnerships"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'External Vendors' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/external-vendors/shivaang">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Shivaang</CardTitle>
              <CardDescription>External production partner</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage Shivaang-related transactions and data
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
