'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const ADJUSTMENT_REASONS = [
  { value: 'physical_count', label: 'Physical Count Discrepancy' },
  { value: 'data_error', label: 'Data Entry Error' },
  { value: 'damage_found', label: 'Damage Found During Audit' },
  { value: 'system_migration', label: 'System Migration Correction' },
  { value: 'other', label: 'Other' },
]

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Dialog state
  const [showDialog, setShowDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)

  const [form, setForm] = useState({
    batchId: '',
    actualQuantity: '',
    reason: '',
    adjustmentDate: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const fetchAdjustments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/inventory/adjustments?page=${page}`)
      const data = await res.json()
      setAdjustments(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching adjustments:', error)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchAdjustments()
  }, [fetchAdjustments])

  const openDialog = async () => {
    setShowDialog(true)
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
  }

  const selectedBatch = batches.find(b => b.id === form.batchId)

  const handleSubmit = async () => {
    if (!form.batchId) { alert('Please select a batch'); return }
    if (!form.actualQuantity) { alert('Please enter actual quantity'); return }
    if (!form.reason) { alert('Please select a reason'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: form.batchId,
          actualQuantity: parseFloat(form.actualQuantity),
          reason: form.reason,
          adjustmentDate: form.adjustmentDate,
          notes: form.notes || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to create adjustment')
        return
      }

      const result = await res.json()
      alert(`Adjustment ${result.adjustment?.adjustmentNumber} created successfully!`)
      setShowDialog(false)
      setForm({ batchId: '', actualQuantity: '', reason: '', adjustmentDate: new Date().toISOString().split('T')[0], notes: '' })
      fetchAdjustments()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        description="Manual inventory corrections for physical count discrepancies"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Adjustments' },
        ]}
        actions={
          <Button onClick={openDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Adjustment
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : adjustments.length === 0 ? (
        <EmptyState
          title="No adjustments"
          description="Stock adjustments will appear here when created."
          action={<Button onClick={openDialog}>New Adjustment</Button>}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Adjustment History ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adjustment #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Actual Qty</TableHead>
                    <TableHead className="text-right">Adjustment</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj: any) => {
                    const isIncrease = adj.adjustmentType === 'addition'
                    return (
                      <TableRow key={adj.id}>
                        <TableCell className="font-mono text-sm">{adj.adjustmentNumber}</TableCell>
                        <TableCell>
                          {isIncrease ? (
                            <Badge className="bg-green-100 text-green-800">
                              <TrendingUp className="mr-1 h-3 w-3" />
                              Increase
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <TrendingDown className="mr-1 h-3 w-3" />
                              Decrease
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{adj.sku || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{adj.batch?.batchNumber || '-'}</TableCell>
                        <TableCell className="text-right">{Number(adj.systemQuantity)}</TableCell>
                        <TableCell className="text-right font-medium">{Number(adj.actualQuantity)}</TableCell>
                        <TableCell className={`text-right font-bold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncrease ? '+' : '-'}{Number(adj.adjustmentQuantity)}
                        </TableCell>
                        <TableCell className="capitalize text-sm">{adj.reason?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{format(new Date(adj.adjustmentDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{adj.user?.name || '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Adjustment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Stock Adjustment</DialogTitle>
            <DialogDescription>Adjust stock quantity to match physical count</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Batch *</Label>
              {loadingBatches ? (
                <div className="flex justify-center py-2"><LoadingSpinner /></div>
              ) : (
                <Select value={form.batchId} onValueChange={(v) => setForm(f => ({ ...f, batchId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an inventory batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.sku || 'N/A'} - {batch.batchNumber} (Current: {batch.currentQty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedBatch && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground">SKU</span>
                    <p className="font-mono font-medium">{selectedBatch.sku || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="capitalize">{selectedBatch.productType?.replace(/_/g, ' ') || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">System Qty</span>
                    <p className="font-bold">{selectedBatch.currentQty}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Actual Quantity *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.actualQuantity}
                  onChange={(e) => setForm(f => ({ ...f, actualQuantity: e.target.value }))}
                  placeholder="Counted quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.adjustmentDate}
                  onChange={(e) => setForm(f => ({ ...f, adjustmentDate: e.target.value }))}
                />
              </div>
            </div>

            {selectedBatch && form.actualQuantity && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                parseFloat(form.actualQuantity) > selectedBatch.currentQty
                  ? 'bg-green-50 text-green-800'
                  : parseFloat(form.actualQuantity) < selectedBatch.currentQty
                  ? 'bg-red-50 text-red-800'
                  : 'bg-gray-50 text-gray-600'
              }`}>
                {parseFloat(form.actualQuantity) === selectedBatch.currentQty
                  ? 'No difference — quantities match'
                  : `${parseFloat(form.actualQuantity) > selectedBatch.currentQty ? '+' : ''}${(parseFloat(form.actualQuantity) - selectedBatch.currentQty).toFixed(3)} unit adjustment`
                }
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={form.reason} onValueChange={(v) => setForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.batchId || !form.actualQuantity || !form.reason}>
                {submitting ? <LoadingSpinner size="sm" /> : 'Create Adjustment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
