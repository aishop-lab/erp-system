import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Details"
        description="View and manage product information"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: params.id },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>Details of this product</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Product details coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
