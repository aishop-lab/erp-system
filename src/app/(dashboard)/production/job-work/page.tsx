'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { PO_STATUS_MAP } from '@/lib/constants'

export default function JobWorkPage() {
  const [pos, setPOs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPOs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/production/job-work/eligible-pos')
      const data = await res.json()
      setPOs(data.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPOs()
  }, [fetchPOs])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Work"
        description="Issue raw materials to vendors for job work production"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'Job Work' },
        ]}
        actions={
          <Button asChild>
            <Link href="/production/job-work/issue">
              <Plus className="mr-2 h-4 w-4" />
              Issue Materials
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : pos.length === 0 ? (
        <EmptyState
          title="No job work orders"
          description="Create a PO with 'Raw Materials Issued' mode in Purchase Orders to start job work."
          action={
            <Button asChild>
              <Link href="/purchase-orders/new">
                Create Job Work PO
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Job Work Purchase Orders ({pos.length})</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {pos.map((po: any) => {
                    const statusConfig = PO_STATUS_MAP[po.status]
                    return (
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
                          <Badge variant={statusConfig?.variant as any || 'secondary'}>
                            {statusConfig?.label || po.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {po.rmIssued ? (
                            <Badge variant="default">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!po.rmIssued ? (
                            <Button variant="default" size="sm" asChild>
                              <Link href={`/production/job-work/issue?poId=${po.id}`}>
                                Issue RM
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/purchase-orders/${po.id}`}>
                                View PO
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
