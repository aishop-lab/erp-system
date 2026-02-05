import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Order Details"
        description={`Viewing order ${params.id}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Orders', href: '/purchase-orders' },
          { label: params.id },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
          <CardDescription>Details of this purchase order</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Order details coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
