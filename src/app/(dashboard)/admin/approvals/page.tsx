import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and approve pending items"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Approvals' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/approvals/po">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>PO Approvals</CardTitle>
              <CardDescription>Review purchase order requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Pending approval</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/approvals/payments">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Payment Approvals</CardTitle>
              <CardDescription>Review payment requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Pending approval</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
