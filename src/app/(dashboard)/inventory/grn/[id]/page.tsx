'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

export default function GRNDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [grn, setGRN] = useState<any>(null)

  const fetchGRN = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/inventory/grn/${id}`)
      if (res.ok) {
        const data = await res.json()
        setGRN(data)
      }
    } catch (error) {
      console.error('Error fetching GRN:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchGRN()
  }, [fetchGRN])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!grn) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="GRN Not Found"
          description="The requested goods receipt could not be found"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Inventory', href: '/inventory' },
            { label: 'Goods Receipt', href: '/inventory/grn' },
            { label: 'Not Found' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={grn.grnNumber}
        description="Goods receipt details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Goods Receipt', href: '/inventory/grn' },
          { label: grn.grnNumber },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/grn">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        }
      />

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{grn.grnNumber}</CardTitle>
          <CardDescription>
            Created by {grn.createdBy?.name} on {format(new Date(grn.createdAt), 'dd MMM yyyy HH:mm')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Purchase Order</p>
              <Link
                href={`/purchase-orders/${grn.purchaseOrder?.id}`}
                className="font-medium hover:underline"
              >
                {grn.purchaseOrder?.poNumber}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium">{grn.purchaseOrder?.supplier?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="font-medium">{grn.lineItems?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received At</p>
              <p className="font-medium">{format(new Date(grn.createdAt), 'dd MMM yyyy')}</p>
            </div>
          </div>
          {grn.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="mt-1">{grn.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      {grn.lineItems && grn.lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Received Items</CardTitle>
            <CardDescription>{grn.lineItems.length} item(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grn.lineItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {item.productDescription || item.poLineItem?.productId?.slice(0, 16) || '-'}
                        </div>
                        {item.poLineItem?.productType && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.poLineItem.productType.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.receivedQty}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {item.acceptedQty}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {item.rejectedQty || 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.condition === 'good' ? 'secondary' : 'destructive'}
                        >
                          {item.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {item.batchNumber || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
