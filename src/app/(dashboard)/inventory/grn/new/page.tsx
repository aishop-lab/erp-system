import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewGRNPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Goods Receipt"
        description="Record incoming goods"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Goods Receipt', href: '/inventory/grn' },
          { label: 'New' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Goods Receipt Form</CardTitle>
          <CardDescription>
            Select a purchase order and record received items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            GRN form coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
