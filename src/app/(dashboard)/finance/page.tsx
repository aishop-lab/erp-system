import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Manage payments, settlements, and invoices"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/finance/payments">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payments</CardTitle>
              <CardDescription>Supplier payments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/finance/settlements">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Settlements</CardTitle>
              <CardDescription>Marketplace settlements</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/finance/invoices">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Invoices</CardTitle>
              <CardDescription>Customer invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/finance/credits">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Store Credits</CardTitle>
              <CardDescription>Customer credits</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Active accounts</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
