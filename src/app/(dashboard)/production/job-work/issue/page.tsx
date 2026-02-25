'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface IssuanceLineItem {
  productId: string
  batchId: string
  batchNumber: string
  sku: string
  availableQty: number
  quantity: number
}

export default function IssueMaterialsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
      <IssueMaterialsContent />
    </Suspense>
  )
}

function IssueMaterialsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPOId = searchParams.get('poId') || ''

  const [eligiblePOs, setEligiblePOs] = useState<any[]>([])
  const [selectedPOId, setSelectedPOId] = useState(preselectedPOId)
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [lineItems, setLineItems] = useState<IssuanceLineItem[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Batch selection state
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [issueQty, setIssueQty] = useState('')

  // Fetch eligible POs
  const fetchEligiblePOs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/production/job-work/eligible-pos')
      const data = await res.json()
      const eligible = (data.data || []).filter((po: any) => !po.rmIssued)
      setEligiblePOs(eligible)

      // If preselected PO, set it
      if (preselectedPOId) {
        const po = eligible.find((p: any) => p.id === preselectedPOId)
        if (po) setSelectedPO(po)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [preselectedPOId])

  useEffect(() => {
    fetchEligiblePOs()
  }, [fetchEligiblePOs])

  // Fetch available batches when PO is selected
  useEffect(() => {
    if (!selectedPOId) {
      setSelectedPO(null)
      setBatches([])
      return
    }

    const po = eligiblePOs.find(p => p.id === selectedPOId)
    setSelectedPO(po)

    const fetchBatches = async () => {
      setLoadingBatches(true)
      try {
        // Fetch all available batches (fabric, raw_material, packaging)
        const res = await fetch('/api/production/available-batches')
        const data = await res.json()
        setBatches(data.data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoadingBatches(false)
      }
    }

    fetchBatches()
  }, [selectedPOId, eligiblePOs])

  const addLineItem = () => {
    if (!selectedBatchId || !issueQty) {
      alert('Please select a batch and enter quantity')
      return
    }

    const batch = batches.find(b => b.id === selectedBatchId)
    if (!batch) return

    const qty = parseInt(issueQty)
    if (qty <= 0 || qty > batch.currentQty) {
      alert(`Quantity must be between 1 and ${batch.currentQty}`)
      return
    }

    // Check if batch already added
    if (lineItems.some(item => item.batchId === selectedBatchId)) {
      alert('This batch is already added')
      return
    }

    setLineItems(prev => [...prev, {
      productId: batch.productId,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      sku: batch.sku || '',
      availableQty: batch.currentQty,
      quantity: qty,
    }])

    setSelectedBatchId('')
    setIssueQty('')
  }

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!selectedPOId) {
      alert('Please select a purchase order')
      return
    }
    if (lineItems.length === 0) {
      alert('Please add at least one material to issue')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/production/job-work/issue-rm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: selectedPOId,
          notes: notes || undefined,
          items: lineItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            batchId: item.batchId,
          })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to issue materials')
        return
      }

      const result = await res.json()
      alert(`Materials issued successfully! Issuance: ${result.issuance?.issuanceNumber || ''}`)
      router.push('/production/job-work')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to issue materials')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue Raw Materials"
        description="Issue materials to a vendor for job work"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'Job Work', href: '/production/job-work' },
          { label: 'Issue Materials' },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/production/job-work">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      {/* PO Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Purchase Order</CardTitle>
          <CardDescription>Choose a job work PO to issue materials for</CardDescription>
        </CardHeader>
        <CardContent>
          {eligiblePOs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No eligible POs found. Create and approve a PO with &quot;Raw Materials Issued&quot; mode first.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Purchase Order *</Label>
                <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligiblePOs.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.poNumber} - {po.supplier?.name || 'No supplier'} ({po.lineItems?.length || 0} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPO && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">PO Number</span>
                      <p className="font-mono font-medium">{selectedPO.poNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supplier</span>
                      <p className="font-medium">{selectedPO.supplier?.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Items</span>
                      <p className="font-medium">{selectedPO.lineItems?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount</span>
                      <p className="font-medium">
                        {Number(selectedPO.grandTotal).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials Selection */}
      {selectedPOId && (
        <Card>
          <CardHeader>
            <CardTitle>Materials to Issue</CardTitle>
            <CardDescription>
              Select inventory batches and quantities to issue to {selectedPO?.supplier?.name || 'vendor'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Material Row */}
            {loadingBatches ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
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
                <div className="w-32 space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={issueQty}
                    onChange={(e) => setIssueQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Button onClick={addLineItem} variant="secondary">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            )}

            {/* Line Items Table */}
            {lineItems.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Issue Qty</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={item.batchId}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="font-mono text-sm">{item.batchNumber}</TableCell>
                        <TableCell className="text-right">{item.availableQty}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                          >
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
      )}

      {/* Notes & Submit */}
      {selectedPOId && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery instructions, special notes..."
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || lineItems.length === 0}
              >
                {submitting ? <LoadingSpinner size="sm" /> : 'Issue Materials'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
