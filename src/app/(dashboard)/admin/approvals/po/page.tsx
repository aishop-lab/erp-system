'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { PURCHASE_TYPE_LABELS } from '@/lib/constants'

interface PendingPO {
  id: string
  poNumber: string
  purchaseType: string
  grandTotal: number
  createdAt: string
  supplier: { id: string; code: string; name: string } | null
  createdBy: { id: string; name: string; email: string }
  _count: { lineItems: number; freeTextItems: number; refundItems: number }
}

export default function POApprovalsPage() {
  const [data, setData] = useState<PendingPO[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PendingPO | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/approvals/po')
      const result = await res.json()
      setData(result.data || [])
    } catch (error) {
      console.error('Error fetching PO approvals:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openDialog = (po: PendingPO, act: 'approve' | 'reject') => {
    setSelectedPO(po)
    setAction(act)
    setNotes('')
  }

  const closeDialog = () => {
    setSelectedPO(null)
    setAction(null)
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!selectedPO || !action) return
    if (action === 'reject' && !notes.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/approvals/po/${selectedPO.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || `Failed to ${action} PO`)
        return
      }

      closeDialog()
      fetchData()
    } catch (error) {
      console.error('Error processing approval:', error)
      alert(`Failed to ${action} purchase order`)
    } finally {
      setSubmitting(false)
    }
  }

  const itemCount = (po: PendingPO) =>
    po._count.lineItems + po._count.freeTextItems + po._count.refundItems

  return (
    <div className="space-y-6">
      <PageHeader
        title="PO Approvals"
        description="Review and approve purchase orders"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Approvals', href: '/admin/approvals' },
          { label: 'Purchase Orders' },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="Purchase orders requiring approval will appear here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>{data.length} purchase order(s) awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="font-medium hover:underline"
                      >
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {PURCHASE_TYPE_LABELS[po.purchaseType] || po.purchaseType}
                      </Badge>
                    </TableCell>
                    <TableCell>{po.supplier?.name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(po.grandTotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </TableCell>
                    <TableCell>{itemCount(po)}</TableCell>
                    <TableCell>{po.createdBy?.name}</TableCell>
                    <TableCell>{format(new Date(po.createdAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/purchase-orders/${po.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(po, 'reject')}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openDialog(po, 'approve')}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={!!action} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve' : 'Reject'} Purchase Order
            </DialogTitle>
            <DialogDescription>
              {selectedPO?.poNumber} - {selectedPO?.supplier?.name || 'No supplier'} -{' '}
              {selectedPO && Number(selectedPO.grandTotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                {action === 'reject' ? 'Rejection Reason *' : 'Notes (Optional)'}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  action === 'reject'
                    ? 'Please provide a reason for rejection...'
                    : 'Any notes...'
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={action === 'reject' ? 'destructive' : 'default'}
              onClick={handleSubmit}
              disabled={submitting || (action === 'reject' && !notes.trim())}
            >
              {submitting ? <LoadingSpinner size="sm" /> : action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
