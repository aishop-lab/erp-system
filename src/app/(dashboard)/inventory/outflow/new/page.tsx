'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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

const OUTFLOW_TYPES = [
  { value: 'sale', label: 'Sale' },
  { value: 'sample', label: 'Sample' },
  { value: 'damage', label: 'Damage / Wastage' },
  { value: 'return_to_supplier', label: 'Return to Supplier' },
  { value: 'internal_use', label: 'Internal Use' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'theft_loss', label: 'Theft / Loss' },
  { value: 'other', label: 'Other' },
]

const RECIPIENT_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'internal', label: 'Internal' },
]

interface LineItem {
  batchId: string
  batchNumber: string
  sku: string
  productType: string
  availableQty: number
  quantity: number
  reason: string
}

export default function NewOutflowPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    outflowType: '',
    recipientName: '',
    recipientType: '',
    outflowDate: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [issueQty, setIssueQty] = useState('')
  const [itemReason, setItemReason] = useState('')

  // Fetch available batches
  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true)
    try {
      const res = await fetch('/api/production/available-batches')
      const data = await res.json()
      setBatches(data.data || [])
    } catch (error) {
      console.error('Error loading batches:', error)
    } finally {
      setLoadingBatches(false)
    }
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const addLineItem = () => {
    if (!selectedBatchId || !issueQty) {
      alert('Please select a batch and enter quantity')
      return
    }

    const batch = batches.find(b => b.id === selectedBatchId)
    if (!batch) return

    const qty = parseFloat(issueQty)
    if (qty <= 0 || qty > batch.currentQty) {
      alert(`Quantity must be between 1 and ${batch.currentQty}`)
      return
    }

    if (lineItems.some(item => item.batchId === selectedBatchId)) {
      alert('This batch is already added')
      return
    }

    setLineItems(prev => [...prev, {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      sku: batch.sku || '',
      productType: batch.productType || '',
      availableQty: batch.currentQty,
      quantity: qty,
      reason: itemReason,
    }])

    setSelectedBatchId('')
    setIssueQty('')
    setItemReason('')
  }

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!form.outflowType) {
      alert('Please select an outflow type')
      return
    }
    if (lineItems.length === 0) {
      alert('Please add at least one item')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/inventory/outflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outflowType: form.outflowType,
          recipientName: form.recipientName || undefined,
          recipientType: form.recipientType || undefined,
          outflowDate: form.outflowDate,
          notes: form.notes || undefined,
          lineItems: lineItems.map(item => ({
            batchId: item.batchId,
            quantity: item.quantity,
            reason: item.reason || undefined,
          })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to create outflow')
        return
      }

      const result = await res.json()
      alert(`Outflow ${result.outflow?.outflowNumber} created successfully!`)
      router.push('/inventory/outflow')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create outflow')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Inventory Outflow"
        description="Record stock leaving the warehouse"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Outflow', href: '/inventory/outflow' },
          { label: 'New' },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/outflow">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      {/* Outflow Details */}
      <Card>
        <CardHeader>
          <CardTitle>Outflow Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Outflow Type *</Label>
              <Select value={form.outflowType} onValueChange={(v) => setForm(f => ({ ...f, outflowType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {OUTFLOW_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.outflowDate}
                onChange={(e) => setForm(f => ({ ...f, outflowDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <Input
                value={form.recipientName}
                onChange={(e) => setForm(f => ({ ...f, recipientName: e.target.value }))}
                placeholder="Customer, influencer, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Recipient Type</Label>
              <Select value={form.recipientType} onValueChange={(v) => setForm(f => ({ ...f, recipientType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPIENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional details..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Select inventory batches and quantities to issue out</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingBatches ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : (
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[250px] space-y-2">
                <Label>Batch</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an inventory batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches
                      .filter(b => !lineItems.some(li => li.batchId === b.id))
                      .map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.sku || 'N/A'} - {batch.batchNumber} (Avail: {batch.currentQty})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="w-48 space-y-2">
                <Label>Reason</Label>
                <Input
                  value={itemReason}
                  onChange={(e) => setItemReason(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <Button onClick={addLineItem} variant="secondary">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          )}

          {lineItems.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Qty Out</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={item.batchId}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-mono text-sm">{item.batchNumber}</TableCell>
                      <TableCell className="capitalize text-sm">{item.productType?.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-right">{item.availableQty}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.reason || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeLineItem(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {lineItems.length > 0 && (
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <strong>Total items:</strong> {lineItems.length} |{' '}
              <strong>Total qty:</strong> {lineItems.reduce((sum, i) => sum + i.quantity, 0)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting || !form.outflowType || lineItems.length === 0}>
          {submitting ? <LoadingSpinner size="sm" /> : 'Create Outflow'}
        </Button>
      </div>
    </div>
  )
}
