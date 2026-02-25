'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, CheckCircle } from 'lucide-react'
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
import { PRODUCTION_STATUS_MAP } from '@/lib/constants'

export default function ProductionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [production, setProduction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeForm, setCompleteForm] = useState({
    actualQty: '',
    rejectedQty: '0',
    wasteQty: '0',
    laborCost: '',
    overheadCost: '',
    notes: '',
  })

  const fetchProduction = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/production/orders/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProduction(data)
        // Pre-fill actual qty with planned qty
        if (data.plannedQty) {
          setCompleteForm(prev => ({
            ...prev,
            actualQty: String(Number(data.plannedQty)),
          }))
        }
      } else {
        alert('Production order not found')
        router.push('/production/in-house')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    if (id) fetchProduction()
  }, [id, fetchProduction])

  const handleComplete = async () => {
    if (!completeForm.actualQty || Number(completeForm.actualQty) < 0) {
      alert('Please enter a valid actual quantity')
      return
    }

    setCompleting(true)
    try {
      const res = await fetch(`/api/production/orders/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualQty: parseFloat(completeForm.actualQty),
          rejectedQty: parseFloat(completeForm.rejectedQty) || 0,
          wasteQty: parseFloat(completeForm.wasteQty) || 0,
          laborCost: completeForm.laborCost ? parseFloat(completeForm.laborCost) : undefined,
          overheadCost: completeForm.overheadCost ? parseFloat(completeForm.overheadCost) : undefined,
          notes: completeForm.notes || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to complete production')
        return
      }

      alert('Production completed successfully!')
      setShowCompleteDialog(false)
      fetchProduction()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to complete production')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (!production) return null

  const statusConfig = PRODUCTION_STATUS_MAP[production.status]
  const canComplete = ['planned', 'materials_issued', 'in_progress'].includes(production.status)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Production ${production.productionNumber}`}
        description={production.productName || 'Production order details'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'In-House', href: '/production/in-house' },
          { label: production.productionNumber },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/production/in-house">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            {canComplete && (
              <Button onClick={() => setShowCompleteDialog(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Production
              </Button>
            )}
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Production #</span>
                <p className="font-mono font-medium">{production.productionNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p>
                  <Badge variant={statusConfig?.variant as any || 'secondary'}>
                    {statusConfig?.label || production.status}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Product</span>
                <p className="font-medium">{production.productName || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">SKU</span>
                <p className="font-mono">{production.sku || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Production Line</span>
                <p>{production.productionLine || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Location</span>
                <p>{production.location || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created By</span>
                <p>{production.createdBy?.name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created At</span>
                <p>{format(new Date(production.createdAt), 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quantities & Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Planned Qty</span>
                <p className="text-xl font-bold">
                  {production.plannedQty ? Number(production.plannedQty) : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Actual Qty</span>
                <p className="text-xl font-bold text-green-600">
                  {production.actualQty ? Number(production.actualQty) : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Rejected</span>
                <p className="font-medium text-red-600">
                  {production.rejectedQty ? Number(production.rejectedQty) : '0'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Waste</span>
                <p className="font-medium text-yellow-600">
                  {production.wasteQty ? Number(production.wasteQty) : '0'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Target Date</span>
                <p>
                  {production.targetDate
                    ? format(new Date(production.targetDate), 'MMM dd, yyyy')
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Completion Date</span>
                <p>
                  {production.completionDate
                    ? format(new Date(production.completionDate), 'MMM dd, yyyy')
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Costs (show if completed) */}
      {production.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Material Cost</span>
                <p className="font-medium">
                  {production.materialCost ? `₹${Number(production.materialCost).toLocaleString()}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Labor Cost</span>
                <p className="font-medium">
                  {production.laborCost ? `₹${Number(production.laborCost).toLocaleString()}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Overhead Cost</span>
                <p className="font-medium">
                  {production.overheadCost ? `₹${Number(production.overheadCost).toLocaleString()}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Cost</span>
                <p className="font-bold text-lg">
                  {production.totalCost ? `₹${Number(production.totalCost).toLocaleString()}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Cost/Unit</span>
                <p className="font-medium">
                  {production.costPerUnit ? `₹${Number(production.costPerUnit).toFixed(2)}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials */}
      {production.materials && production.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
            <CardDescription>Raw materials used in this production</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Batch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {production.materials.map((mat: any) => (
                    <TableRow key={mat.id}>
                      <TableCell>
                        <div className="font-medium">{mat.productType ? `${mat.productType.replace(/_/g, ' ')}` : mat.productId}</div>
                        <div className="text-xs text-muted-foreground font-mono">{mat.productId?.slice(0, 12) || ''}</div>
                      </TableCell>
                      <TableCell className="text-right">{mat.quantity}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {mat.batchId?.slice(0, 12) || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {production.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{production.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Complete Production Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Production</DialogTitle>
            <DialogDescription>
              Enter actual production results for {production.productionNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Actual Qty *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={completeForm.actualQty}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, actualQty: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Rejected</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={completeForm.rejectedQty}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, rejectedQty: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Waste</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={completeForm.wasteQty}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, wasteQty: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Labor Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={completeForm.laborCost}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, laborCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Overhead Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={completeForm.overheadCost}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, overheadCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={completeForm.notes}
                onChange={(e) => setCompleteForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Production completion notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={completing}>
                {completing ? <LoadingSpinner size="sm" /> : 'Complete Production'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
