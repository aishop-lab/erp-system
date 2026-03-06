'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Edit,
  Send,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { FileDown } from 'lucide-react'
import { PO_STATUS_MAP, PURCHASE_TYPE_LABELS, ENTRY_MODE_LABELS } from '@/lib/constants'
import { POStatus } from '@/types/enums'

interface PODetailProps {
  purchaseOrder: any
  onRefresh: () => void
  canApprove?: boolean
}

export function PODetail({ purchaseOrder, onRefresh, canApprove = false }: PODetailProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const statusConfig = PO_STATUS_MAP[purchaseOrder.status] || {
    label: purchaseOrder.status,
    variant: 'secondary',
  }

  const handleSubmitForApproval = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrder.id}/submit`, {
        method: 'POST',
      })

      if (res.ok) {
        onRefresh()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to submit for approval')
      }
    } catch (error) {
      console.error('Error submitting PO:', error)
      alert('Failed to submit for approval')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrder.id}/approve`, {
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
    } catch (error) {
      console.error('Error approving PO:', error)
      alert('Failed to approve')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrder.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectionReason }),
      })

      if (res.ok) {
        setShowRejectDialog(false)
        setRejectionReason('')
        onRefresh()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to reject')
      }
    } catch (error) {
      console.error('Error rejecting PO:', error)
      alert('Failed to reject')
    } finally {
      setSubmitting(false)
    }
  }

  const [generatingPdf, setGeneratingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const element = document.getElementById('po-detail-content')
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = pdfHeight
      let position = 0
      const pageHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${purchaseOrder.poNumber}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const isDraft = purchaseOrder.status === POStatus.DRAFT
  const isPendingApproval = purchaseOrder.status === POStatus.PENDING_APPROVAL
  const isGoodsReceived = purchaseOrder.status === POStatus.GOODS_RECEIVED

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Button variant="outline" asChild>
          <Link href="/purchase-orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Link>
        </Button>

        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/purchase-orders/${purchaseOrder.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button onClick={handleSubmitForApproval} disabled={submitting}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </>
          )}

          {isPendingApproval && canApprove && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                disabled={submitting}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={() => setShowApproveDialog(true)} disabled={submitting}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}

          {isGoodsReceived && (
            <Button asChild>
              <Link href={`/finance/reconciliation/${purchaseOrder.id}`}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Reconcile
              </Link>
            </Button>
          )}

          <Button variant="outline" onClick={handleDownloadPdf} disabled={generatingPdf}>
            {generatingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* PO Detail Content (for PDF export) */}
      <div id="po-detail-content">
      {/* PO Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{purchaseOrder.poNumber}</CardTitle>
              <CardDescription>
                {PURCHASE_TYPE_LABELS[purchaseOrder.purchaseType] || purchaseOrder.purchaseType}
                {' - '}
                {ENTRY_MODE_LABELS[purchaseOrder.entryMode] || purchaseOrder.entryMode}
              </CardDescription>
            </div>
            <Badge variant={statusConfig.variant as any} className="text-sm">
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Supplier</h4>
              <p className="mt-1">
                {purchaseOrder.supplier ? (
                  <>
                    <span className="font-medium">{purchaseOrder.supplier.name}</span>
                    <br />
                    <span className="text-sm text-muted-foreground">
                      {purchaseOrder.supplier.code}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Entity</h4>
              <p className="mt-1 font-medium">{purchaseOrder.entity?.name || '-'}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Created</h4>
              <p className="mt-1">
                {format(new Date(purchaseOrder.createdAt), 'dd MMM yyyy, hh:mm a')}
                <br />
                <span className="text-sm text-muted-foreground">
                  by {purchaseOrder.createdBy?.name}
                </span>
              </p>
            </div>

            {purchaseOrder.approvedAt && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  {purchaseOrder.status === POStatus.REJECTED ? 'Rejected' : 'Approved'}
                </h4>
                <p className="mt-1">
                  {format(new Date(purchaseOrder.approvedAt), 'dd MMM yyyy, hh:mm a')}
                  <br />
                  <span className="text-sm text-muted-foreground">
                    by {purchaseOrder.approvedBy?.name}
                  </span>
                </p>
              </div>
            )}

            {purchaseOrder.rejectionReason && (
              <div className="col-span-full">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Rejection Reason
                </h4>
                <p className="mt-1 text-destructive">{purchaseOrder.rejectionReason}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      {purchaseOrder.lineItems && purchaseOrder.lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Catalog Items</CardTitle>
            <CardDescription>
              {purchaseOrder.lineItems.length} item(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.lineItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {item.productSku || '-'}
                        </span>
                        <br />
                        <span className="text-sm text-muted-foreground">
                          {item.productName || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.taxAmount).toFixed(2)} ({item.taxRate}%)
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(item.totalAmount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Free Text Items */}
      {purchaseOrder.freeTextItems && purchaseOrder.freeTextItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Free Text Items</CardTitle>
            <CardDescription>
              {purchaseOrder.freeTextItems.length} item(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.freeTextItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.taxAmount).toFixed(2)} ({item.taxRate}%)
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(item.totalAmount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Refund Items */}
      {purchaseOrder.refundItems && purchaseOrder.refundItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Refund Items</CardTitle>
            <CardDescription>
              {purchaseOrder.refundItems.length} item(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.refundItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.customerName}</TableCell>
                    <TableCell>{item.orderNumber || '-'}</TableCell>
                    <TableCell>{item.reason || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(item.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end space-y-2">
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{Number(purchaseOrder.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Tax:</span>
              <span>{Number(purchaseOrder.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64 text-lg font-semibold border-t pt-2">
              <span>Grand Total:</span>
              <span>{Number(purchaseOrder.grandTotal).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Attachments from Payments */}
      {purchaseOrder.payments && purchaseOrder.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment & Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {purchaseOrder.payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{payment.paymentNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {payment.status} {payment.amountPaid ? `| Paid: ₹${Number(payment.amountPaid).toFixed(2)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {payment.invoiceAttachment && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={payment.invoiceAttachment} target="_blank" rel="noopener noreferrer">
                          <FileDown className="mr-1 h-3 w-3" />
                          Invoice
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      </div>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this purchase order ({purchaseOrder.poNumber})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={submitting}>
              {submitting ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this purchase order ({purchaseOrder.poNumber}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={submitting || !rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
