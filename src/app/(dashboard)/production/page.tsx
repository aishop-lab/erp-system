'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { format } from 'date-fns'
import { Factory, Truck, Package, ArrowRight, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PRODUCTION_STATUS_MAP, PO_STATUS_MAP } from '@/lib/constants'

export default function ProductionDashboard() {
  const { data: prodData, isLoading: prodLoading } = useSWR('/api/production/orders?pageSize=50')
  const { data: jwData, isLoading: jwLoading } = useSWR('/api/production/job-work/eligible-pos')
  const productions: any[] = prodData?.data || []
  const jobWorkPOs: any[] = jwData?.data || []
  const loading = (prodLoading && !prodData) || (jwLoading && !jwData)

  const inHouseStats = {
    total: productions.filter(p => p.productionType === 'in_house').length,
    inProgress: productions.filter(p =>
      p.productionType === 'in_house' &&
      ['materials_issued', 'in_progress'].includes(p.status)
    ).length,
    completed: productions.filter(p =>
      p.productionType === 'in_house' && p.status === 'completed'
    ).length,
  }

  const jobWorkStats = {
    total: jobWorkPOs.length,
    pendingIssuance: jobWorkPOs.filter((p: any) =>
      ['approved', 'approved_pending_rm_issuance'].includes(p.status)
    ).length,
    atVendor: jobWorkPOs.filter((p: any) =>
      p.status === 'rm_issued_pending_goods'
    ).length,
  }

  const getStatusBadge = (status: string, map: Record<string, any>) => {
    const config = map[status]
    if (!config) return <Badge variant="secondary">{status.replace(/_/g, ' ')}</Badge>
    return <Badge variant={config.variant as any}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production"
        description="Manage in-house production and job work orders"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production' },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-House Orders</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inHouseStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {inHouseStats.inProgress} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Work POs</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobWorkStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {jobWorkStats.pendingIssuance} pending RM issuance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inHouseStats.completed}
            </div>
            <p className="text-xs text-muted-foreground">In-house production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Vendor</CardTitle>
            <Truck className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {jobWorkStats.atVendor}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting goods receipt</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="in-house">
        <TabsList>
          <TabsTrigger value="in-house">In-House Production</TabsTrigger>
          <TabsTrigger value="job-work">Job Work Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="in-house" className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/production/in-house/new">
                <Plus className="mr-2 h-4 w-4" />
                New Production Order
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Production Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {productions.filter(p => p.productionType === 'in_house').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No in-house production orders yet.{' '}
                  <Link href="/production/in-house/new" className="text-primary underline">
                    Create one
                  </Link>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Production #</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Planned</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Target Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productions
                        .filter(p => p.productionType === 'in_house')
                        .map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.productionNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{order.productName || '-'}</div>
                              <div className="text-sm text-muted-foreground">{order.sku || ''}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              {order.plannedQty ? Number(order.plannedQty) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {order.actualQty ? Number(order.actualQty) : '-'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status, PRODUCTION_STATUS_MAP)}
                            </TableCell>
                            <TableCell>
                              {order.targetDate
                                ? format(new Date(order.targetDate), 'MMM dd, yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/production/in-house/${order.id}`}>
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="job-work" className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/production/job-work/issue">
                <Plus className="mr-2 h-4 w-4" />
                Issue Materials
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Job Work Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {jobWorkPOs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No job work orders. Create a PO with &quot;Job Work&quot; mode in Purchase Orders.
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>RM Issued</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobWorkPOs.map((po: any) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-mono text-sm">{po.poNumber}</TableCell>
                          <TableCell>{po.supplier?.name || '-'}</TableCell>
                          <TableCell className="text-right">{po.lineItems?.length || 0}</TableCell>
                          <TableCell className="text-right">
                            {Number(po.grandTotal).toLocaleString('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                              maximumFractionDigits: 0,
                            })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(po.status, PO_STATUS_MAP)}
                          </TableCell>
                          <TableCell>
                            {po.rmIssued ? (
                              <Badge variant="default">Yes</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {['approved', 'approved_pending_rm_issuance'].includes(po.status) && !po.rmIssued ? (
                              <Button variant="default" size="sm" asChild>
                                <Link href={`/production/job-work/issue?poId=${po.id}`}>
                                  Issue RM
                                </Link>
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/purchase-orders/${po.id}`}>
                                  View
                                </Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
