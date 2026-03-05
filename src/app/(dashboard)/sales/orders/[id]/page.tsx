'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { SALES_ORDER_STATUS_MAP } from '@/lib/constants'
import { Package, User, CreditCard, Truck, Calendar } from 'lucide-react'

export default function SalesOrderDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/sales/orders/${id}`)
      .then(r => r.json())
      .then(data => { setOrder(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const formatCurrency = (amount: string | number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount))

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
  }

  if (!order) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Order not found</div>
  }

  const statusInfo = SALES_ORDER_STATUS_MAP[order.status] || { label: order.status, variant: 'secondary' }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${order.orderNumber}`}
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Orders', href: '/sales/orders' },
          { label: order.orderNumber },
        ]}
        actions={
          <Badge variant={statusInfo.variant as any} className="text-sm px-3 py-1">
            {statusInfo.label}
          </Badge>
        }
      />

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Platform</p>
                <p className="font-medium capitalize">{order.platform?.displayName || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fulfillment</p>
                <p className="font-medium capitalize">{order.fulfillmentStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Ordered</p>
                <p className="font-medium">{formatDate(order.orderedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order Items ({order.items?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.items || []).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[250px]">
                      <p className="font-medium truncate">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.sku || '-'}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-red-500">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              {Number(order.shippingCharge) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(order.shippingCharge)}</span>
                </div>
              )}
              {Number(order.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{order.customerName || 'N/A'}</p>
              {order.customerEmail && <p className="text-muted-foreground">{order.customerEmail}</p>}
              {order.customerPhone && <p className="text-muted-foreground">{order.customerPhone}</p>}
            </CardContent>
          </Card>

          {/* Shipping */}
          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.courier && <p>Courier: {order.courier}</p>}
                <p>Tracking: {order.trackingNumber}</p>
                {order.shippedAt && <p>Shipped: {formatDate(order.shippedAt)}</p>}
                {order.deliveredAt && <p>Delivered: {formatDate(order.deliveredAt)}</p>}
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          {order.salesPayments?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Payments ({order.salesPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.salesPayments.map((payment: any) => (
                  <div key={payment.id} className="flex justify-between text-sm">
                    <div>
                      <p className="capitalize">{payment.method || 'Payment'}</p>
                      <p className="text-muted-foreground">{formatDate(payment.paidAt)}</p>
                    </div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.orderedAt && <p>Ordered: {formatDate(order.orderedAt)}</p>}
              {order.shippedAt && <p>Shipped: {formatDate(order.shippedAt)}</p>}
              {order.deliveredAt && <p>Delivered: {formatDate(order.deliveredAt)}</p>}
              {order.cancelledAt && <p className="text-red-500">Cancelled: {formatDate(order.cancelledAt)}</p>}
              <p className="text-muted-foreground">Created: {formatDate(order.createdAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
