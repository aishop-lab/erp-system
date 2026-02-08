import Link from 'next/link'
import { Package, Shirt, Scissors, Wrench, Box } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const libraries = [
  {
    title: 'Finished Products',
    description: 'Sellable products with style and fabric combinations',
    icon: Package,
    href: '/products/finished',
    color: 'bg-blue-500',
  },
  {
    title: 'Style Library',
    description: 'Reusable style templates with measurements',
    icon: Shirt,
    href: '/products/styles',
    color: 'bg-purple-500',
  },
  {
    title: 'Fabric Library',
    description: 'Fabric materials and specifications',
    icon: Scissors,
    href: '/products/fabrics',
    color: 'bg-green-500',
  },
  {
    title: 'Raw Materials',
    description: 'Production inputs and accessories',
    icon: Wrench,
    href: '/products/raw-materials',
    color: 'bg-orange-500',
  },
  {
    title: 'Packaging',
    description: 'Packaging materials and supplies',
    icon: Box,
    href: '/products/packaging',
    color: 'bg-pink-500',
  },
]

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Information"
        description="Manage product libraries, styles, fabrics, and materials"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {libraries.map((library) => (
          <Link key={library.href} href={library.href}>
            <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all h-full">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`${library.color} p-3 rounded-lg`}>
                    <library.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{library.title}</CardTitle>
                    <CardDescription>{library.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
