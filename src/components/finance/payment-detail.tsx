'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PAYMENT_STATUS_MAP } from '@/lib/constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PaymentDetailProps {
  payment: any
  onRefresh: () => void
  canApprove?: boolean
}

export function PaymentDetail({ payment, onRefresh, canApprove = false }: PaymentDetailProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const statusConfig = PAYMENT_STATUS_MAP[payment.status] || {
    label: payment.status,
    variant: 'secondary',
  }

  const isPendingApproval = payment.status === 'pending_approval'
  const isApproved = payment.status === 'approved'
  const isExecuted = payment.status === 'executed'

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/finance/payments/${payment.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (res.ok) {
        setShowApproveDialog(false)
        onRefresh()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to approve')
      }
    } catch {
      alert('Failed to approve payment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/finance/payments/${payment.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason }),
      })

      if (res.ok) {
        setShowRejectDialog(false)
        onRefresh()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to reject')
      }
    } catch {
      alert('Failed to reject payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <Badge variant={statusConfig.variant as any} className="text-sm">
          {statusConfig.label}
        </Badge>
        <div className="flex gap-2">
          {isPendingApproval && canApprove && (
            <>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                Reject
              </Button>
              <Button onClick={() => setShowApproveDialog(true)}>
                Approve
              </Button>
            </>
          )}
          {isApproved && (
            <Button asChild>
              <Link href={`/finance/payments/${payment.id}/execute`}>
                Execute Payment
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{payment.paymentNumber}</CardTitle>
          <CardDescription>
            Created by {payment.createdBy?.name} on {format(new Date(payment.createdAt), 'dd MMM yyyy HH:mm')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Entity</Label>
              <p className="font-medium">{payment.entity?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Supplier</Label>
              <p className="font-medium">{payment.supplier?.name || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Invoice Amount</Label>
              <p className="font-medium">
                {Number(payment.invoiceAmount || payment.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Invoice Number</Label>
              <p className="font-medium">{payment.invoiceNumber || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked PO */}
      {payment.purchaseOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Purchase Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">PO Number</Label>
                <Link href={`/purchase-orders/${payment.purchaseOrder.id}`} className="font-medium hover:underline block">
                  {payment.purchaseOrder.poNumber}
                </Link>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">PO Amount</Label>
                <p className="font-medium">
                  {Number(payment.purchaseOrder.grandTotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">GRNs</Label>
                <p className="font-medium">{payment.purchaseOrder.grns?.length || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Supplier</Label>
                <p className="font-medium">{payment.purchaseOrder.supplier?.name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier Bank Details */}
      {payment.supplier && (payment.supplier.bankName || payment.supplier.bankAccountNumber) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supplier Bank Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Bank</Label>
                <p className="font-medium">{payment.supplier.bankName || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Account Number</Label>
                <p className="font-medium">{payment.supplier.bankAccountNumber || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">IFSC Code</Label>
                <p className="font-medium">{payment.supplier.bankIfscCode || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution Details (if executed) */}
      {isExecuted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Execution</CardTitle>
            <CardDescription>
              Executed by {payment.executedBy?.name} on {payment.executedAt ? format(new Date(payment.executedAt), 'dd MMM yyyy HH:mm') : '-'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Payment Mode</Label>
                <p className="font-medium">{payment.paymentMode?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Transaction Ref</Label>
                <p className="font-medium">{payment.transactionReference || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Amount Paid</Label>
                <p className="font-medium">
                  {payment.amountPaid ? Number(payment.amountPaid).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">TDS Deducted</Label>
                <p className="font-medium">
                  {Number(payment.tdsDeducted || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Net Amount</Label>
                <p className="font-medium">
                  {payment.netAmountPaid ? Number(payment.netAmountPaid).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '-'}
                </p>
              </div>
              {payment.executionRemarks && (
                <div className="col-span-full">
                  <Label className="text-muted-foreground text-xs">Remarks</Label>
                  <p className="font-medium">{payment.executionRemarks}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Info */}
      {payment.status === 'rejected' && payment.rejectionReason && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{payment.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Approval Info */}
      {payment.approvedBy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Approved by <strong>{payment.approvedBy.name}</strong> on{' '}
              {payment.approvedAt ? format(new Date(payment.approvedAt), 'dd MMM yyyy HH:mm') : '-'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Approve payment {payment.paymentNumber} for{' '}
              {Number(payment.invoiceAmount || payment.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting ? <LoadingSpinner /> : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting payment {payment.paymentNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={submitting}>
              {submitting ? <LoadingSpinner /> : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
