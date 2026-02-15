'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Package,
  Clock,
  CheckCircle,
  IndianRupee,
  ArrowUpRight,
  FileText,
} from 'lucide-react'
import { PO_STATUS_MAP, PAYMENT_STATUS_MAP } from '@/lib/constants'

interface ShivaangData {
  overview: {
    totalOrders: number
    pendingOrders: number
    completedOrders: number
    totalPaid: number
    pendingPayments: number
  }
  transactions: {
    type: 'order' | 'payment'
    id: string
    date: string
    description: string
    amount: number
    status: string
  }[]
  pendingOrders: {
    id: string
    poNumber: string
    purchaseType: string
    status: string
    grandTotal: number
    createdAt: string
    supplierName: string | null
    supplierCode: string | null
    itemCount: number
  }[]
  paymentHistory: {
    id: string
    paymentNumber: string
    poNumber: string | null
    poId: string | null
    supplierName: string | null
    amount: number
    amountPaid: number | null
    tdsDeducted: number | null
    netAmountPaid: number | null
    status: string
    createdAt: string
    executedAt: string | null
  }[]
}

function getStatusBadge(status: string, type: 'po' | 'payment') {
  const map = type === 'po' ? PO_STATUS_MAP : PAYMENT_STATUS_MAP
  const config = map[status] || { label: status, variant: 'secondary' }
  return <Badge variant={config.variant as any}>{config.label}</Badge>
}

const inr = (n: number) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

export default function ShivaangPage() {
  const [data, setData] = useState<ShivaangData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/external-vendors/shivaang')
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to load data')
        return
      }
      setData(await res.json())
    } catch {
      setError('Failed to load Shivaang data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Shivaang"
          description="External vendor management"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'External Vendors', href: '/external-vendors' },
            { label: 'Shivaang' },
          ]}
        />
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Shivaang"
          description="External vendor management"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'External Vendors', href: '/external-vendors' },
            { label: 'Shivaang' },
          ]}
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{error || 'No data available'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { overview } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shivaang"
        description="External production partner - job work management"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'External Vendors', href: '/external-vendors' },
          { label: 'Shivaang' },
        ]}
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Job work orders placed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{overview.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Orders in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Fully paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inr(overview.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">Lifetime payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Orders
            {overview.pendingOrders > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {overview.pendingOrders}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Partnership Summary</CardTitle>
                <CardDescription>Shivaang job work partnership</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-medium">{overview.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Orders</span>
                  <span className="font-medium text-yellow-600">{overview.pendingOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium text-green-600">{overview.completedOrders}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-bold">{inr(overview.totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Payments</span>
                  <span className="font-medium text-yellow-600">{inr(overview.pendingPayments)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/purchase-orders/new">
                    <Package className="mr-2 h-4 w-4" />
                    Create New Job Work Order
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/finance/reconciliation">
                    <FileText className="mr-2 h-4 w-4" />
                    View Pending Reconciliations
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/finance/payments">
                    <IndianRupee className="mr-2 h-4 w-4" />
                    View All Payments
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest transactions with Shivaang</CardDescription>
            </CardHeader>
            <CardContent>
              {data.transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent transactions
                </div>
              ) : (
                <div className="space-y-4">
                  {data.transactions.map((txn) => (
                    <div key={`${txn.type}-${txn.id}`} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-2 ${txn.type === 'order' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                          {txn.type === 'order' ? (
                            <Package className="h-4 w-4" />
                          ) : (
                            <IndianRupee className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{txn.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(txn.date), 'dd MMM yyyy, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-medium">{inr(txn.amount)}</p>
                        {getStatusBadge(txn.status, txn.type === 'order' ? 'po' : 'payment')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Orders Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Orders</CardTitle>
              <CardDescription>Orders currently in progress with Shivaang</CardDescription>
            </CardHeader>
            <CardContent>
              {data.pendingOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending orders
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pendingOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell>
                          <Link href={`/purchase-orders/${po.id}`} className="font-mono font-medium hover:underline">
                            {po.poNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{po.supplierName || '-'}</TableCell>
                        <TableCell>{po.itemCount}</TableCell>
                        <TableCell className="text-right font-medium">
                          {inr(po.grandTotal)}
                        </TableCell>
                        <TableCell>{getStatusBadge(po.status, 'po')}</TableCell>
                        <TableCell>{format(new Date(po.createdAt), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/purchase-orders/${po.id}`}>
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payments made through Shivaang entity</CardDescription>
            </CardHeader>
            <CardContent>
              {data.paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payment history
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Link href={`/finance/payments/${payment.id}`} className="font-mono font-medium hover:underline">
                            {payment.paymentNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {payment.poId ? (
                            <Link href={`/purchase-orders/${payment.poId}`} className="font-mono hover:underline">
                              {payment.poNumber}
                            </Link>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{payment.supplierName || '-'}</TableCell>
                        <TableCell className="text-right">{inr(payment.amount)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {payment.amountPaid != null ? inr(payment.amountPaid) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status, 'payment')}</TableCell>
                        <TableCell>
                          {format(new Date(payment.executedAt || payment.createdAt), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/finance/payments/${payment.id}`}>
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
