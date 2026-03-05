'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Store, ShoppingBag, Link as LinkIcon } from 'lucide-react'

export default function SalesPlatformsPage() {
  const [platforms, setPlatforms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sales/platforms')
      .then(r => r.json())
      .then(data => { setPlatforms(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
  }

  const platformIcons: Record<string, any> = {
    amazon: ShoppingBag,
    shopify: Store,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Platforms"
        description="Connected e-commerce platforms and their status"
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Platforms' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {platforms.map(platform => {
          const Icon = platformIcons[platform.name] || LinkIcon
          return (
            <Card key={platform.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {platform.displayName}
                </CardTitle>
                <Badge variant={platform.isActive ? 'success' : 'secondary'}>
                  {platform.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-2xl font-bold">{platform._count?.salesOrders || 0}</p>
                    <p className="text-sm text-muted-foreground">Orders</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{platform._count?.platformMappings || 0}</p>
                    <p className="text-sm text-muted-foreground">Products Mapped</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Added {new Date(platform.createdAt).toLocaleDateString('en-IN')}
                </p>
              </CardContent>
            </Card>
          )
        })}

        {platforms.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Store className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p>No platforms configured yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
