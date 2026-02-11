import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Manage reconciliation, payments, settlements, and invoices"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/finance/reconciliation">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reconciliation</CardTitle>
              <CardDescription>PO, GRN &amp; invoice matching</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Three-way match &amp; submit for payment</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/finance/payments">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payments</CardTitle>
              <CardDescription>Supplier payments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Approve &amp; execute payments</p>
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
              <p className="text-xs text-muted-foreground">Coming soon</p>
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
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
