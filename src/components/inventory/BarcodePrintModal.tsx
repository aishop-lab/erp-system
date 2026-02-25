'use client'

import { useState, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Printer, X } from 'lucide-react'
import { FabricLabel } from './barcode-labels/FabricLabel'
import { RawMaterialLabel } from './barcode-labels/RawMaterialLabel'
import { PackagingLabel } from './barcode-labels/PackagingLabel'
import { FinishedProductLabel } from './barcode-labels/FinishedProductLabel'

export interface BarcodeItem {
  id: string
  sku: string
  productType: string
  batchNumber: string
  quantity: number
  createdAt: string | Date
  productDetails?: {
    material?: string | null
    color?: string | null
    design?: string | null
    work?: string | null
    rmType?: string | null
    pkgType?: string | null
    dimensions?: string | null
    title?: string | null
    size?: string | null
    mrp?: number | null
  }
}

interface BarcodePrintModalProps {
  open: boolean
  onClose: () => void
  items: BarcodeItem[]
  grnNumber: string
}

export function BarcodePrintModal({
  open,
  onClose,
  items,
  grnNumber,
}: BarcodePrintModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    items.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: Math.ceil(Number(item.quantity)),
      }),
      {}
    )
  )

  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Barcode_Labels_${grnNumber}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 5mm 5mm;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .no-print {
          display: none !important;
        }
        .barcode-label-grid > div {
          border: none !important;
        }
      }
    `,
  })

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, numValue) }))
  }

  const totalLabels = Object.values(quantities).reduce(
    (sum, qty) => sum + qty,
    0
  )

  const renderLabel = (item: BarcodeItem, index: number) => {
    const props = {
      sku: item.sku || '',
      batchNumber: item.batchNumber || '',
      createdAt: item.createdAt,
    }

    switch (item.productType) {
      case 'fabric':
        return (
          <FabricLabel
            key={`${item.id}-${index}`}
            {...props}
            material={item.productDetails?.material}
            color={item.productDetails?.color}
            design={item.productDetails?.design}
            work={item.productDetails?.work}
          />
        )
      case 'raw_material':
        return (
          <RawMaterialLabel
            key={`${item.id}-${index}`}
            {...props}
            rmType={item.productDetails?.rmType}
            color={item.productDetails?.color}
          />
        )
      case 'packaging':
        return (
          <PackagingLabel
            key={`${item.id}-${index}`}
            {...props}
            pkgType={item.productDetails?.pkgType}
            dimensions={item.productDetails?.dimensions}
          />
        )
      case 'finished':
        return (
          <FinishedProductLabel
            key={`${item.id}-${index}`}
            {...props}
            productName={item.productDetails?.title}
            size={item.productDetails?.size}
            color={item.productDetails?.color}
            mrp={item.productDetails?.mrp}
          />
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Barcode Labels</DialogTitle>
          <DialogDescription>
            GRN: {grnNumber} | {items.length} item(s) | {totalLabels} total
            labels
          </DialogDescription>
        </DialogHeader>

        {/* Quantity Controls */}
        <div className="no-print space-y-4 border-b pb-4">
          <h3 className="font-semibold text-sm">Adjust Label Quantities</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <Label className="flex-1 text-sm">
                  {item.sku}
                  <span className="text-muted-foreground ml-2">
                    (Received: {item.quantity})
                  </span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={quantities[item.id] ?? 0}
                  onChange={(e) =>
                    handleQuantityChange(item.id, e.target.value)
                  }
                  className="w-20"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Preview Section */}
        <div>
          <h3 className="font-semibold text-sm mb-3 no-print">Preview</h3>
          <div
            ref={printRef}
            className="barcode-label-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 50mm)',
              gridAutoRows: '25mm',
              justifyContent: 'center',
              gap: 0,
              background: 'white',
            }}
          >
            {items.flatMap((item) =>
              Array.from({ length: quantities[item.id] || 0 }, (_, index) =>
                renderLabel(item, index)
              )
            )}
            {totalLabels === 0 && (
              <p className="text-muted-foreground text-sm py-8">
                Set label quantities above to see preview
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="no-print flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Skip
          </Button>
          <Button
            variant="default"
            onClick={() => handlePrint()}
            disabled={totalLabels === 0}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print {totalLabels} Labels
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
