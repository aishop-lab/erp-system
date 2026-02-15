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

interface PendingPayment {
  id: string
  paymentNumber: string
  amount: number
  invoiceAmount: number | null
  invoiceNumber: string | null
  createdAt: string
  purchaseOrder: { id: string; poNumber: string } | null
  supplier: { id: string; name: string } | null
  entity: { id: string; name: string }
  createdBy: { id: string; name: string }
}

export default function PaymentApprovalsPage() {
  const [data, setData] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/payments?status=pending_approval&pageSize=100')
      const result = await res.json()
      setData(result.data || [])
    } catch (error) {
      console.error('Error fetching payment approvals:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openDialog = (payment: PendingPayment, act: 'approve' | 'reject') => {
    setSelectedPayment(payment)
    setAction(act)
    setReason('')
  }

  const closeDialog = () => {
    setSelectedPayment(null)
    setAction(null)
    setReason('')
  }

  const handleSubmit = async () => {
    if (!selectedPayment || !action) return
    if (action === 'reject' && !reason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/finance/payments/${selectedPayment.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: reason || undefined }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || `Failed to ${action} payment`)
        return
      }

      alert(`Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      closeDialog()
      fetchData()
    } catch (error) {
      console.error('Error processing approval:', error)
      alert(`Failed to ${action} payment`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Approvals"
        description="Review and approve payment requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Approvals', href: '/admin/approvals' },
          { label: 'Payments' },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="Payments requiring approval will appear here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Payment Approvals</CardTitle>
            <CardDescription>{data.length} payment(s) awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Link
                        href={`/finance/payments/${payment.id}`}
                        className="font-medium hover:underline"
                      >
                        {payment.paymentNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {payment.purchaseOrder ? (
                        <Link
                          href={`/purchase-orders/${payment.purchaseOrder.id}`}
                          className="hover:underline"
                        >
                          {payment.purchaseOrder.poNumber}
                        </Link>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{payment.supplier?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{payment.entity?.name}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{payment.invoiceNumber || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(payment.invoiceAmount || payment.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </TableCell>
                    <TableCell>{payment.createdBy?.name}</TableCell>
                    <TableCell>{format(new Date(payment.createdAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/finance/payments/${payment.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(payment, 'reject')}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openDialog(payment, 'approve')}
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
              {action === 'approve' ? 'Approve' : 'Reject'} Payment
            </DialogTitle>
            <DialogDescription>
              {selectedPayment?.paymentNumber} - {selectedPayment?.supplier?.name || 'No supplier'} -{' '}
              {selectedPayment && Number(selectedPayment.invoiceAmount || selectedPayment.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                {action === 'reject' ? 'Rejection Reason *' : 'Notes (Optional)'}
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
              disabled={submitting || (action === 'reject' && !reason.trim())}
            >
              {submitting ? <LoadingSpinner /> : action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
