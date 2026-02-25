'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ProductSearch } from './product-search'
import { AddLineItemDialog } from './add-line-item-dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { PurchaseType, EntryMode, RawMaterialMode } from '@/types/enums'
import { PURCHASE_TYPE_LABELS } from '@/lib/constants'

interface Supplier {
  id: string
  name: string
  code: string
}

interface LineItem {
  id: string
  productId: string
  sku: string
  title: string
  quantity: number
  unitPrice: number
  taxRate: number
  uom: string
}

interface FreeTextItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}

interface RefundItem {
  id: string
  customerName: string
  orderNumber: string
  reason: string
  amount: number
  refundMode: string
}

// Map purchase types to entry modes
const PURCHASE_TYPE_ENTRY_MODES: Record<string, EntryMode> = {
  [PurchaseType.FINISHED]: EntryMode.CATALOG,
  [PurchaseType.FABRIC]: EntryMode.CATALOG,
  [PurchaseType.RAW_MATERIAL]: EntryMode.CATALOG,
  [PurchaseType.PACKAGING]: EntryMode.CATALOG,
  [PurchaseType.CORPORATE_ASSETS]: EntryMode.CATALOG,
  [PurchaseType.SAMPLES]: EntryMode.LINK_FINISHED,
  [PurchaseType.INFLUENCER_SAMPLES]: EntryMode.LINK_FINISHED,
  [PurchaseType.TRANSPORTATION]: EntryMode.FREE_TEXT,
  [PurchaseType.ADVERTISEMENT]: EntryMode.FREE_TEXT,
  [PurchaseType.OFFICE_EXPENSES]: EntryMode.FREE_TEXT,
  [PurchaseType.SOFTWARE]: EntryMode.FREE_TEXT,
  [PurchaseType.FEEDBACK]: EntryMode.FREE_TEXT,
  [PurchaseType.MISC]: EntryMode.FREE_TEXT,
  [PurchaseType.CUSTOMER_REFUNDS]: EntryMode.SPECIAL,
}

// Map purchase types to product types for search
const PURCHASE_TYPE_PRODUCT_TYPES: Record<string, string> = {
  [PurchaseType.FINISHED]: 'finished',
  [PurchaseType.FABRIC]: 'fabric',
  [PurchaseType.RAW_MATERIAL]: 'raw_material',
  [PurchaseType.PACKAGING]: 'packaging',
  [PurchaseType.CORPORATE_ASSETS]: 'finished', // Use finished products for assets
  [PurchaseType.SAMPLES]: 'finished',
  [PurchaseType.INFLUENCER_SAMPLES]: 'finished',
}

// Default GST rates by purchase type
const DEFAULT_GST_RATES: Record<string, number> = {
  [PurchaseType.FINISHED]: 5,
  [PurchaseType.FABRIC]: 5,
  [PurchaseType.RAW_MATERIAL]: 18,
  [PurchaseType.PACKAGING]: 18,
  [PurchaseType.CORPORATE_ASSETS]: 18,
  [PurchaseType.SAMPLES]: 0,
  [PurchaseType.INFLUENCER_SAMPLES]: 0,
  [PurchaseType.TRANSPORTATION]: 18,
  [PurchaseType.ADVERTISEMENT]: 18,
  [PurchaseType.OFFICE_EXPENSES]: 18,
  [PurchaseType.SOFTWARE]: 18,
  [PurchaseType.FEEDBACK]: 0,
  [PurchaseType.MISC]: 18,
  [PurchaseType.CUSTOMER_REFUNDS]: 0,
}

interface POFormProps {
  mode?: 'create' | 'edit'
  initialData?: any
}

export function POForm({ mode = 'create', initialData }: POFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Form state
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(
    initialData?.purchaseType || PurchaseType.FINISHED
  )
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || '')
  const [rawMaterialMode, setRawMaterialMode] = useState<RawMaterialMode | ''>(
    initialData?.rawMaterialMode || ''
  )
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [expectedDelivery, setExpectedDelivery] = useState(
    initialData?.expectedDelivery?.split('T')[0] || ''
  )

  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems || []
  )
  const [freeTextItems, setFreeTextItems] = useState<FreeTextItem[]>(
    initialData?.freeTextItems || []
  )
  const [refundItems, setRefundItems] = useState<RefundItem[]>(
    initialData?.refundItems || []
  )

  // Dialog state for cascading dropdown
  const [addLineItemDialogOpen, setAddLineItemDialogOpen] = useState(false)

  const entryMode = PURCHASE_TYPE_ENTRY_MODES[purchaseType]
  const productType = PURCHASE_TYPE_PRODUCT_TYPES[purchaseType] as any
  const defaultGst = DEFAULT_GST_RATES[purchaseType]

  // Fetch suppliers filtered by purchase type
  useEffect(() => {
    if (!purchaseType) {
      setSuppliers([])
      return
    }
    const fetchSuppliers = async () => {
      try {
        const res = await fetch(`/api/suppliers/by-purchase-type?purchaseType=${encodeURIComponent(purchaseType)}`)
        if (res.ok) {
          const data = await res.json()
          setSuppliers(data || [])
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error)
        setSuppliers([])
      }
    }
    fetchSuppliers()
  }, [purchaseType])

  // Clear supplier when purchase type changes
  useEffect(() => {
    if (mode === 'create') {
      setSupplierId('')
    }
  }, [purchaseType])

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0
    let taxTotal = 0

    lineItems.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice
      const lineTax = lineTotal * (item.taxRate / 100)
      subtotal += lineTotal
      taxTotal += lineTax
    })

    freeTextItems.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice
      const lineTax = lineTotal * (item.taxRate / 100)
      subtotal += lineTotal
      taxTotal += lineTax
    })

    refundItems.forEach((item) => {
      subtotal += item.amount
    })

    return {
      subtotal,
      taxTotal,
      grandTotal: subtotal + taxTotal,
    }
  }

  const totals = calculateTotals()

  // Handle product selection from search
  const handleProductSelect = (product: any) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      sku: product.sku,
      title: product.title,
      quantity: 1,
      unitPrice: product.costPrice,
      taxRate: product.gstPct || defaultGst,
      uom: product.uom,
    }
    setLineItems([...lineItems, newItem])
  }

  // Handle product selection from cascading dropdown dialog
  const handleDialogAddLineItem = (item: {
    productId: string
    sku: string
    title: string
    quantity: number
    unitPrice: number
    taxRate: number
    uom: string
  }) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      ...item,
    }
    setLineItems([...lineItems, newItem])
  }

  // Get selected supplier code for display
  const selectedSupplier = suppliers.find(s => s.id === supplierId)

  // Update line item
  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  // Add free text item
  const addFreeTextItem = () => {
    const newItem: FreeTextItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: defaultGst,
    }
    setFreeTextItems([...freeTextItems, newItem])
  }

  // Update free text item
  const updateFreeTextItem = (id: string, field: string, value: any) => {
    setFreeTextItems(
      freeTextItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  // Remove free text item
  const removeFreeTextItem = (id: string) => {
    setFreeTextItems(freeTextItems.filter((item) => item.id !== id))
  }

  // Add refund item
  const addRefundItem = () => {
    const newItem: RefundItem = {
      id: crypto.randomUUID(),
      customerName: '',
      orderNumber: '',
      reason: '',
      amount: 0,
      refundMode: 'bank_transfer',
    }
    setRefundItems([...refundItems, newItem])
  }

  // Update refund item
  const updateRefundItem = (id: string, field: string, value: any) => {
    setRefundItems(
      refundItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  // Remove refund item
  const removeRefundItem = (id: string) => {
    setRefundItems(refundItems.filter((item) => item.id !== id))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, action: 'save' | 'submit') => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        purchaseType,
        supplierId: supplierId || null,
        entryMode,
        rawMaterialMode: purchaseType === PurchaseType.FINISHED && rawMaterialMode ? rawMaterialMode : null,
        notes: notes || null,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : null,
        lineItems: entryMode === EntryMode.CATALOG || entryMode === EntryMode.LINK_FINISHED
          ? lineItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          }))
          : undefined,
        freeTextItems: entryMode === EntryMode.FREE_TEXT
          ? freeTextItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          }))
          : undefined,
        refundItems: entryMode === EntryMode.SPECIAL
          ? refundItems.map((item) => ({
            customerName: item.customerName,
            orderNumber: item.orderNumber,
            reason: item.reason,
            amount: item.amount,
            refundMode: item.refundMode,
          }))
          : undefined,
      }

      const url = mode === 'create'
        ? '/api/purchase-orders'
        : `/api/purchase-orders/${initialData.id}`

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save purchase order')
      }

      const po = await res.json()

      // If submitting, call the submit endpoint
      if (action === 'submit') {
        const submitRes = await fetch(`/api/purchase-orders/${po.id}/submit`, {
          method: 'POST',
        })
        if (!submitRes.ok) {
          throw new Error('Failed to submit purchase order')
        }
      }

      router.push('/purchase-orders')
      router.refresh()
    } catch (error: any) {
      console.error('Error saving PO:', error)
      alert(error.message || 'Failed to save purchase order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, 'save')} className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Purchase Type */}
            <div className="space-y-2">
              <Label htmlFor="purchaseType">Purchase Type *</Label>
              <Select
                value={purchaseType}
                onValueChange={(value) => {
                  setPurchaseType(value as PurchaseType)
                  // Clear items when type changes
                  setLineItems([])
                  setFreeTextItems([])
                  setRefundItems([])
                }}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PurchaseType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {PURCHASE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Raw Material Mode (for Finished only) */}
            {purchaseType === PurchaseType.FINISHED && (
              <div className="space-y-2">
                <Label htmlFor="rawMaterialMode">Raw Material Mode *</Label>
                <Select
                  value={rawMaterialMode}
                  onValueChange={(value) => setRawMaterialMode(value as RawMaterialMode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RawMaterialMode.DIRECT_PURCHASE}>
                      Direct Purchase
                    </SelectItem>
                    <SelectItem value={RawMaterialMode.RAW_MATERIALS_ISSUED}>
                      Raw Materials Issued (Job Work)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplierId">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.code} - {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expected Delivery */}
            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected Delivery</Label>
              <DatePicker
                value={expectedDelivery}
                onChange={setExpectedDelivery}
                placeholder="Select delivery date"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card - Catalog Mode */}
      {(entryMode === EntryMode.CATALOG || entryMode === EntryMode.LINK_FINISHED) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            {/* Show Add button for all catalog types with cascading dropdown */}
            {(purchaseType === PurchaseType.FINISHED ||
              purchaseType === PurchaseType.FABRIC ||
              purchaseType === PurchaseType.RAW_MATERIAL ||
              purchaseType === PurchaseType.PACKAGING ||
              purchaseType === PurchaseType.SAMPLES ||
              purchaseType === PurchaseType.INFLUENCER_SAMPLES) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddLineItemDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Search - for corporate assets type (uses finished products) */}
            {purchaseType === PurchaseType.CORPORATE_ASSETS && (
              <div className="max-w-md">
                <Label>Add Product</Label>
                <ProductSearch
                  productType={productType}
                  onSelect={handleProductSelect}
                  placeholder={`Search ${PURCHASE_TYPE_LABELS[purchaseType]}...`}
                />
              </div>
            )}

            {/* Line Items Table */}
            {lineItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-24">GST %</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => {
                    const lineTotal = item.quantity * item.unitPrice
                    const lineTax = lineTotal * (item.taxRate / 100)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {item.title}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>{item.uom}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.taxRate}
                            onChange={(e) =>
                              updateLineItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{(lineTotal + lineTax).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {lineItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {purchaseType === PurchaseType.CORPORATE_ASSETS
                  ? 'Search and add products to this purchase order'
                  : 'Click "Add Product" to select products for this purchase order'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line Items Card - Free Text Mode */}
      {entryMode === EntryMode.FREE_TEXT && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addFreeTextItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {freeTextItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-24">GST %</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freeTextItems.map((item) => {
                    const lineTotal = item.quantity * item.unitPrice
                    const lineTax = lineTotal * (item.taxRate / 100)
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateFreeTextItem(item.id, 'description', e.target.value)
                            }
                            placeholder="Enter description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateFreeTextItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateFreeTextItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.taxRate}
                            onChange={(e) =>
                              updateFreeTextItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{(lineTotal + lineTax).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFreeTextItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {freeTextItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Click "Add Item" to add line items
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line Items Card - Refund Mode */}
      {entryMode === EntryMode.SPECIAL && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Refund Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addRefundItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Refund
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {refundItems.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 space-y-4 relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeRefundItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Name *</Label>
                    <Input
                      value={item.customerName}
                      onChange={(e) =>
                        updateRefundItem(item.id, 'customerName', e.target.value)
                      }
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order Number</Label>
                    <Input
                      value={item.orderNumber}
                      onChange={(e) =>
                        updateRefundItem(item.id, 'orderNumber', e.target.value)
                      }
                      placeholder="Order number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Refund Amount *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) =>
                        updateRefundItem(item.id, 'amount', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Refund Mode *</Label>
                    <Select
                      value={item.refundMode}
                      onValueChange={(value) =>
                        updateRefundItem(item.id, 'refundMode', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="store_credit">Store Credit</SelectItem>
                        <SelectItem value="original_payment">Original Payment Method</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Input
                      value={item.reason}
                      onChange={(e) =>
                        updateRefundItem(item.id, 'reason', e.target.value)
                      }
                      placeholder="Reason for refund"
                    />
                  </div>
                </div>
              </div>
            ))}

            {refundItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Click "Add Refund" to add refund items
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Totals Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="space-y-2 text-right">
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">GST:</span>
                <span>₹{totals.taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-8 text-lg font-semibold border-t pt-2">
                <span>Grand Total:</span>
                <span>₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" variant="secondary" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save as Draft'
          )}
        </Button>
        <Button
          type="button"
          onClick={(e) => handleSubmit(e, 'submit')}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Save & Submit'
          )}
        </Button>
      </div>

      {/* Add Line Item Dialog - Cascading Dropdown for All Product Types */}
      <AddLineItemDialog
        open={addLineItemDialogOpen}
        onOpenChange={setAddLineItemDialogOpen}
        purchaseType={purchaseType}
        supplierId={supplierId}
        supplierCode={selectedSupplier?.code}
        rawMaterialMode={rawMaterialMode}
        onAdd={handleDialogAddLineItem}
      />
    </form>
  )
}
