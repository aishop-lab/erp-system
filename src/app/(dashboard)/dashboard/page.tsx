import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { ShoppingCart, Package, Truck, Wallet } from 'lucide-react'

const stats = [
  {
    title: 'Total Orders',
    value: '0',
    description: 'Purchase orders this month',
    icon: ShoppingCart,
  },
  {
    title: 'Products',
    value: '0',
    description: 'Active SKUs',
    icon: Package,
  },
  {
    title: 'Suppliers',
    value: '0',
    description: 'Active suppliers',
    icon: Truck,
  },
  {
    title: 'Pending Payments',
    value: '0',
    description: 'Awaiting approval',
    icon: Wallet,
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to your ERP system dashboard"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity to display.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up your first supplier, product, or purchase order to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
