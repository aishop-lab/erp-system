import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewPurchaseOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Create a new purchase order"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Orders', href: '/purchase-orders' },
          { label: 'New' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Form</CardTitle>
          <CardDescription>
            Fill in the details to create a new purchase order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Purchase order form coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
