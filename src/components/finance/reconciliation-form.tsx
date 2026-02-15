'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Upload, X } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ReconciliationFormProps {
  purchaseOrder: any
}

interface Entity {
  id: string
  name: string
  type: string
}

export function ReconciliationForm({ purchaseOrder }: ReconciliationFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [grnFile, setGrnFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    entityId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceAmount: Number(purchaseOrder.grandTotal) || 0,
    transportCharges: 0,
    notes: '',
  })

  useEffect(() => {
    async function loadEntities() {
      try {
        const res = await fetch('/api/admin/settings/entities')
        const data = await res.json()
        setEntities(Array.isArray(data) ? data.filter((e: Entity) => e.type !== undefined) : data.data || [])
      } catch (error) {
        console.error('Failed to load entities:', error)
      }
    }
    loadEntities()
  }, [])

  const poTotal = purchaseOrder.grandTotal
  const grnTotal = purchaseOrder.grnTotal
  const invoiceAmount = form.invoiceAmount
  const amountPayable = invoiceAmount + form.transportCharges
  const poVsGrn = Math.round((poTotal - grnTotal) * 100) / 100
  const poVsInvoice = Math.round((poTotal - invoiceAmount) * 100) / 100

  const handleSubmit = async () => {
    if (!form.entityId) {
      alert('Please select an entity')
      return
    }
    if (!form.invoiceNumber) {
      alert('Please enter the invoice number')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/finance/reconciliation/${purchaseOrder.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: form.entityId,
          invoiceNumber: form.invoiceNumber,
          invoiceDate: new Date(form.invoiceDate).toISOString(),
          invoiceAmount: form.invoiceAmount,
          transportCharges: form.transportCharges,
          invoiceAttachment: invoiceFile?.name,
          grnAttachment: grnFile?.name,
          notes: form.notes || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to submit reconciliation')
        return
      }

      const payment = await res.json()
      alert(`Reconciliation submitted. Payment ${payment.paymentNumber} created.`)
      router.push('/finance/payments')
    } catch (error) {
      console.error('Error submitting reconciliation:', error)
      alert('Failed to submit reconciliation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* PO Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Details</CardTitle>
          <CardDescription>{purchaseOrder.poNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">PO Number</Label>
              <p className="font-medium font-mono">{purchaseOrder.poNumber}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Vendor Name</Label>
              <p className="font-medium">{purchaseOrder.supplier?.name || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Vendor ID</Label>
              <p className="font-medium">{purchaseOrder.supplier?.code || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Purchase Type</Label>
              <p className="font-medium capitalize">{purchaseOrder.purchaseType?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">PO Date</Label>
              <p className="font-medium">{format(new Date(purchaseOrder.createdAt), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Expected Delivery</Label>
              <p className="font-medium">
                {purchaseOrder.expectedDelivery ? format(new Date(purchaseOrder.expectedDelivery), 'dd/MM/yyyy') : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">PO Value</Label>
              <p className="font-medium">
                {Number(poTotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">GRNs</Label>
              <p className="font-medium">{purchaseOrder.grns?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three-Way Match */}
      <Card>
        <CardHeader>
          <CardTitle>Three-Way Match</CardTitle>
          <CardDescription>Compare PO amount, GRN received amount, and invoice amount</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">PO Amount</p>
              <p className="text-2xl font-bold">
                {Number(poTotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">GRN Amount</p>
              <p className="text-2xl font-bold">
                {grnTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </p>
              {poVsGrn !== 0 && (
                <p className={`text-xs mt-1 ${poVsGrn > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                  Variance: {poVsGrn >= 0 ? '+' : ''}{poVsGrn.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </p>
              )}
            </div>
            <div className="text-center p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Invoice Amount</p>
              <p className="text-2xl font-bold">
                {invoiceAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </p>
              {poVsInvoice !== 0 && (
                <p className={`text-xs mt-1 ${poVsInvoice > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                  vs PO: {poVsInvoice >= 0 ? '+' : ''}{poVsInvoice.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Details</CardTitle>
          <CardDescription>Enter invoice details and select the paying entity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceAmount">Invoice Value *</Label>
              <Input
                id="invoiceAmount"
                type="number"
                step="0.01"
                value={form.invoiceAmount}
                onChange={(e) => setForm(f => ({ ...f, invoiceAmount: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityId">Entity *</Label>
              <Select
                value={form.entityId}
                onValueChange={(val) => setForm(f => ({ ...f, entityId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select paying entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={form.invoiceNumber}
                onChange={(e) => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                placeholder="INV/2026/001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setForm(f => ({ ...f, invoiceDate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line Item Description</TableHead>
                <TableHead className="text-right">Cost/Unit</TableHead>
                <TableHead className="text-right">GST Rate %</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Qty Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrder.lineItems?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sku || item.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    {Number(item.unitPrice).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </TableCell>
                  <TableCell className="text-right">{Number(item.taxRate)}%</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium">{item.totalReceived || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any reconciliation notes..."
          rows={3}
        />
      </div>

      {/* Transport / Other Charges */}
      <div className="space-y-2">
        <Label htmlFor="transportCharges">Other/Transport Charges</Label>
        <Input
          id="transportCharges"
          type="number"
          step="0.01"
          value={form.transportCharges}
          onChange={(e) => setForm(f => ({ ...f, transportCharges: parseFloat(e.target.value) || 0 }))}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">
          Additional charges like transportation, handling, packaging, etc.
        </p>
      </div>

      {/* Amount Payable */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">Amount Payable</span>
          <span className="text-2xl font-bold">
            {amountPayable.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          </span>
        </div>
        {form.transportCharges > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Invoice: {invoiceAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} + Transport: {form.transportCharges.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          </p>
        )}
      </div>

      {/* File Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Attach Invoice</Label>
          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
            <Upload className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {invoiceFile ? invoiceFile.name : 'Upload Invoice'}
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) setInvoiceFile(e.target.files[0])
              }}
            />
          </label>
          {invoiceFile && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{invoiceFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setInvoiceFile(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Attach Signed GRN</Label>
          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
            <Upload className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {grnFile ? grnFile.name : 'Upload Signed GRN'}
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) setGrnFile(e.target.files[0])
              }}
            />
          </label>
          {grnFile && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{grnFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setGrnFile(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Bank Details */}
      {purchaseOrder.supplier && (purchaseOrder.supplier.bankName || purchaseOrder.supplier.bankAccountNumber) && (
        <div className="p-4 border rounded-lg bg-muted/30">
          <p className="text-sm font-medium mb-2">Supplier Bank Details</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Bank</p>
              <p>{purchaseOrder.supplier.bankName || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account</p>
              <p>{purchaseOrder.supplier.bankAccountNumber || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">IFSC</p>
              <p>{purchaseOrder.supplier.bankIfscCode || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* GRN History */}
      {purchaseOrder.grns?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>GRN History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {purchaseOrder.grns.map((grn: any) => (
                <div key={grn.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{grn.grnNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(grn.grnDate), 'dd MMM yyyy')} - {grn.lineItems?.length || 0} items
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {grn.user?.name || '-'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !form.entityId || !form.invoiceNumber}>
          {submitting ? <LoadingSpinner /> : 'Submit for Payment'}
        </Button>
      </div>
    </div>
  )
}
