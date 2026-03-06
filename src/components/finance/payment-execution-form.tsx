'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PaymentExecutionFormProps {
  payment: any
}

interface PaymentMode {
  id: string
  name: string
}

export function PaymentExecutionForm({ payment }: PaymentExecutionFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([])
  const [form, setForm] = useState({
    paymentModeId: '',
    transactionReference: '',
    amountPaid: Number(payment.invoiceAmount || payment.amount),
    tdsDeducted: 0,
    remarks: '',
  })
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoiceUrl, setInvoiceUrl] = useState<string>('')
  const [uploadingInvoice, setUploadingInvoice] = useState(false)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load payment modes from the entity
    if (payment.entity?.paymentModes) {
      setPaymentModes(payment.entity.paymentModes)
    } else if (payment.entityId) {
      fetch(`/api/admin/settings/entities/${payment.entityId}/payment-modes`)
        .then(res => res.json())
        .then(data => setPaymentModes(Array.isArray(data) ? data : data.data || []))
        .catch(console.error)
    }
  }, [payment.entity, payment.entityId])

  const netAmount = form.amountPaid - form.tdsDeducted

  const handleInvoiceUpload = async (file: File) => {
    setUploadingInvoice(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `payments/${payment.id}/invoice-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('product-media').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path)
      setInvoiceUrl(publicUrl)
      setInvoiceFile(file)
    } catch (error) {
      console.error('Error uploading invoice:', error)
      alert('Failed to upload invoice')
    } finally {
      setUploadingInvoice(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.paymentModeId) {
      alert('Please select a payment mode')
      return
    }
    if (!form.transactionReference) {
      alert('Please enter the transaction reference')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/finance/payments/${payment.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentModeId: form.paymentModeId,
          transactionReference: form.transactionReference,
          amountPaid: form.amountPaid,
          tdsDeducted: form.tdsDeducted,
          invoiceAttachment: invoiceUrl || undefined,
          remarks: form.remarks || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to execute payment')
        return
      }

      alert('Payment executed successfully!')
      router.push(`/finance/payments/${payment.id}`)
    } catch (error) {
      console.error('Error executing payment:', error)
      alert('Failed to execute payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>{payment.paymentNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">PO Number</Label>
              <p className="font-medium">{payment.purchaseOrder?.poNumber || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Supplier</Label>
              <p className="font-medium">{payment.supplier?.name || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Entity</Label>
              <p className="font-medium">{payment.entity?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Invoice Amount</Label>
              <p className="text-xl font-bold">
                {Number(payment.invoiceAmount || payment.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Execution Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Execution</CardTitle>
          <CardDescription>Enter payment details and transaction reference</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMode">Payment Mode *</Label>
              <Select
                value={form.paymentModeId}
                onValueChange={(val) => setForm(f => ({ ...f, paymentModeId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode.id} value={mode.id}>
                      {mode.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentModes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No payment modes configured for this entity
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionReference">Transaction Reference *</Label>
              <Input
                id="transactionReference"
                value={form.transactionReference}
                onChange={(e) => setForm(f => ({ ...f, transactionReference: e.target.value }))}
                placeholder="NEFT/UTR number, cheque #, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountPaid">Amount Paid *</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                value={form.amountPaid}
                onChange={(e) => setForm(f => ({ ...f, amountPaid: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdsDeducted">TDS Deducted</Label>
              <Input
                id="tdsDeducted"
                type="number"
                step="0.01"
                value={form.tdsDeducted}
                onChange={(e) => setForm(f => ({ ...f, tdsDeducted: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* Net Amount Display */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Net Amount Paid</span>
              <span className="text-xl font-bold">
                {netAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </span>
            </div>
          </div>

          {/* Invoice Upload */}
          <div className="space-y-2">
            <Label>Invoice Attachment</Label>
            <input
              ref={invoiceInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleInvoiceUpload(file)
              }}
            />
            {invoiceFile || invoiceUrl ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">
                  {invoiceFile?.name || 'Invoice attached'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => { setInvoiceFile(null); setInvoiceUrl(''); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => invoiceInputRef.current?.click()}
                disabled={uploadingInvoice}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingInvoice ? 'Uploading...' : 'Upload Invoice (PDF/Image)'}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={form.remarks}
              onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Any payment remarks..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <LoadingSpinner /> : 'Execute Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
