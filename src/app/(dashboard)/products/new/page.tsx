import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Product"
        description="Register a new product"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'New' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            Enter the product details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Product form coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
