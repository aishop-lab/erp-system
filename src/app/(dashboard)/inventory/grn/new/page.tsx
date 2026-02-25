'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BarcodePrintModal, type BarcodeItem } from '@/components/inventory/BarcodePrintModal'
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
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface EligiblePO {
  id: string
  poNumber: string
  purchaseType: string
  supplier: { id: string; code: string; name: string } | null
  hasRemainingItems: boolean
  lineItems: {
    id: string
    productId: string | null
    productType: string | null
    quantity: number
    unitPrice: number
    receivedQty: number
    remainingQty: number
  }[]
}

interface POForGRN {
  id: string
  poNumber: string
  purchaseType: string
  status: string
  supplier: { id: string; code: string; name: string } | null
  lineItems: {
    id: string
    productId: string | null
    productType: string | null
    productDescription: string | null
    quantity: number
    unitPrice: number
    taxRate: number
    receivedQty: number
    remainingQty: number
  }[]
  allLineItems: {
    id: string
    productId: string | null
    productType: string | null
    productDescription: string | null
    quantity: number
    unitPrice: number
    taxRate: number
    receivedQty: number
    remainingQty: number
  }[]
}

interface GRNLineEntry {
  poLineItemId: string
  productId: string | null
  productType: string | null
  productDescription: string | null
  orderedQty: number
  previouslyReceived: number
  pendingQty: number
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  condition: string
  notes: string
}

export default function NewGRNPage() {
  const router = useRouter()
  const [eligiblePOs, setEligiblePOs] = useState<EligiblePO[]>([])
  const [loadingPOs, setLoadingPOs] = useState(true)
  const [selectedPOId, setSelectedPOId] = useState('')
  const [poDetails, setPODetails] = useState<POForGRN | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [grnNotes, setGrnNotes] = useState('')
  const [lineItems, setLineItems] = useState<GRNLineEntry[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [barcodeItems, setBarcodeItems] = useState<BarcodeItem[]>([])
  const [createdGRNNumber, setCreatedGRNNumber] = useState('')

  // Fetch eligible POs
  const fetchEligiblePOs = useCallback(async () => {
    setLoadingPOs(true)
    try {
      const res = await fetch('/api/inventory/grn/eligible-pos')
      const result = await res.json()
      setEligiblePOs(result.data || [])
    } catch (error) {
      console.error('Error fetching eligible POs:', error)
    } finally {
      setLoadingPOs(false)
    }
  }, [])

  useEffect(() => {
    fetchEligiblePOs()
  }, [fetchEligiblePOs])

  // Fetch PO details when selected
  useEffect(() => {
    if (!selectedPOId) {
      setPODetails(null)
      setLineItems([])
      return
    }

    const fetchDetails = async () => {
      setLoadingDetails(true)
      try {
        const res = await fetch(`/api/inventory/grn/po/${selectedPOId}`)
        if (res.ok) {
          const data = await res.json()
          setPODetails(data)

          // Initialize line items from PO (only items with remaining qty)
          const items: GRNLineEntry[] = data.lineItems.map((item: any) => ({
            poLineItemId: item.id,
            productId: item.productId,
            productType: item.productType,
            productDescription: item.productDescription,
            orderedQty: item.quantity,
            previouslyReceived: item.receivedQty,
            pendingQty: item.remainingQty,
            receivedQty: item.remainingQty, // Default to full pending qty
            acceptedQty: item.remainingQty,
            rejectedQty: 0,
            condition: 'good',
            notes: '',
          }))
          setLineItems(items)
        } else {
          alert('Failed to load PO details')
        }
      } catch (error) {
        console.error('Error fetching PO details:', error)
      } finally {
        setLoadingDetails(false)
      }
    }

    fetchDetails()
  }, [selectedPOId])

  const updateLineItem = (index: number, field: string, value: any) => {
    setLineItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }

      // Auto-adjust accepted/rejected when receivedQty changes
      if (field === 'receivedQty') {
        const received = Number(value) || 0
        item.acceptedQty = received
        item.rejectedQty = 0
      }

      // Ensure accepted + rejected <= received
      if (field === 'acceptedQty') {
        const accepted = Number(value) || 0
        item.rejectedQty = Math.max(0, item.receivedQty - accepted)
      }
      if (field === 'rejectedQty') {
        const rejected = Number(value) || 0
        item.acceptedQty = Math.max(0, item.receivedQty - rejected)
      }

      updated[index] = item
      return updated
    })
  }

  const handleSubmit = async () => {
    if (!selectedPOId) {
      alert('Please select a purchase order')
      return
    }

    const itemsToSubmit = lineItems.filter(item => item.receivedQty > 0)
    if (itemsToSubmit.length === 0) {
      alert('Please enter received quantities for at least one item')
      return
    }

    // Validate quantities
    for (const item of itemsToSubmit) {
      if (item.receivedQty > item.pendingQty) {
        alert(`Received qty cannot exceed pending qty (${item.pendingQty})`)
        return
      }
      if (item.acceptedQty + item.rejectedQty > item.receivedQty) {
        alert('Accepted + Rejected cannot exceed Received')
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/inventory/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: selectedPOId,
          notes: grnNotes || undefined,
          lineItems: itemsToSubmit.map(item => ({
            poLineItemId: item.poLineItemId,
            receivedQty: item.receivedQty,
            acceptedQty: item.acceptedQty,
            rejectedQty: item.rejectedQty,
            condition: item.condition,
            notes: item.notes || undefined,
          })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to create GRN')
        return
      }

      const result = await res.json()
      alert(`GRN created successfully: ${result.grnNumber}`)

      // Prepare barcode items from inventory batches
      if (result.inventoryBatches && result.inventoryBatches.length > 0) {
        const items: BarcodeItem[] = result.inventoryBatches.map((batch: any) => ({
          id: batch.id,
          sku: batch.sku || '',
          productType: batch.productType || '',
          batchNumber: batch.batchNumber || '',
          quantity: Number(batch.initialQty),
          createdAt: batch.createdAt,
          productDetails: batch.productDetails || undefined,
        }))
        setBarcodeItems(items)
        setCreatedGRNNumber(result.grnNumber)
        setShowBarcodeModal(true)
      } else {
        router.push('/inventory/grn')
      }
    } catch (error) {
      console.error('Error creating GRN:', error)
      alert('Failed to create GRN')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseBarcodeModal = () => {
    setShowBarcodeModal(false)
    router.push('/inventory/grn')
  }

  const totalReceiving = lineItems.reduce((sum, item) => sum + item.receivedQty, 0)
  const totalAccepted = lineItems.reduce((sum, item) => sum + item.acceptedQty, 0)
  const totalRejected = lineItems.reduce((sum, item) => sum + item.rejectedQty, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Goods Receipt"
        description="Record incoming goods from supplier"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Goods Receipt', href: '/inventory/grn' },
          { label: 'New' },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/grn">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        }
      />

      {/* PO Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Purchase Order</CardTitle>
          <CardDescription>Choose an approved PO to receive goods for</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPOs ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : eligiblePOs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No approved purchase orders available for GRN. Approve a PO first.
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
                        {po.poNumber} - {po.supplier?.name || 'No supplier'} ({po.lineItems.length} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {poDetails && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">PO Number:</span>
                      <p className="font-medium">{poDetails.poNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supplier:</span>
                      <p className="font-medium">{poDetails.supplier?.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="font-medium capitalize">{poDetails.purchaseType.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="secondary" className="ml-1">{poDetails.status.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                  {poDetails.allLineItems.length > poDetails.lineItems.length && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {poDetails.allLineItems.length - poDetails.lineItems.length} item(s) already fully received
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      {loadingDetails ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : lineItems.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Items to Receive</CardTitle>
              <CardDescription>
                Enter received quantities for each item. Only items with pending quantities are shown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Product</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Prev. Received</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right min-w-[100px]">Received Now</TableHead>
                      <TableHead className="text-right min-w-[100px]">Accepted</TableHead>
                      <TableHead className="text-right min-w-[100px]">Rejected</TableHead>
                      <TableHead className="min-w-[120px]">Condition</TableHead>
                      <TableHead className="min-w-[150px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={item.poLineItemId}>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {item.productDescription || item.productId?.slice(0, 12) || '-'}
                          </div>
                          {item.productType && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {item.productType.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{item.orderedQty}</TableCell>
                        <TableCell className="text-right">{item.previouslyReceived}</TableCell>
                        <TableCell className="text-right font-medium">{item.pendingQty}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={item.pendingQty}
                            value={item.receivedQty}
                            onChange={(e) => updateLineItem(index, 'receivedQty', Number(e.target.value) || 0)}
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={item.receivedQty}
                            value={item.acceptedQty}
                            onChange={(e) => updateLineItem(index, 'acceptedQty', Number(e.target.value) || 0)}
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={item.receivedQty}
                            value={item.rejectedQty}
                            onChange={(e) => updateLineItem(index, 'rejectedQty', Number(e.target.value) || 0)}
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.condition}
                            onValueChange={(val) => updateLineItem(index, 'condition', val)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="damaged">Damaged</SelectItem>
                              <SelectItem value="defective">Defective</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.notes}
                            onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                            placeholder="Remarks..."
                            className="w-36"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Receiving</p>
                    <p className="text-xl font-bold">{totalReceiving}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Accepted</p>
                    <p className="text-xl font-bold text-green-600">{totalAccepted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rejected</p>
                    <p className="text-xl font-bold text-red-600">{totalRejected}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Submit */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={grnNotes}
                onChange={(e) => setGrnNotes(e.target.value)}
                placeholder="Any general notes about this goods receipt..."
                rows={3}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting || lineItems.length === 0}>
                  {submitting ? <LoadingSpinner size="sm" /> : 'Create GRN'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Barcode Print Modal */}
      <BarcodePrintModal
        open={showBarcodeModal}
        onClose={handleCloseBarcodeModal}
        items={barcodeItems}
        grnNumber={createdGRNNumber}
      />
    </div>
  )
}
