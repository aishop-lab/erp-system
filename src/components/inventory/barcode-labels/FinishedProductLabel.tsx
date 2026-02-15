'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { format } from 'date-fns'

interface FinishedProductLabelProps {
  sku: string
  batchNumber: string
  createdAt: string | Date
  productName?: string | null
  size?: string | null
  color?: string | null
  mrp?: number | null
}

export function FinishedProductLabel({
  sku,
  batchNumber,
  createdAt,
  productName,
  size,
  color,
  mrp,
}: FinishedProductLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (barcodeRef.current && sku) {
      JsBarcode(barcodeRef.current, sku, {
        format: 'CODE128',
        width: 1.5,
        height: 32,
        displayValue: false,
        margin: 0,
      })
    }
  }, [sku])

  const dateStr = format(new Date(createdAt), 'MMyy')

  return (
    <div
      className="finished-product-label"
      style={{
        width: '50mm',
        height: '25mm',
        padding: '1.6mm',
        border: '1px solid #ddd',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        pageBreakInside: 'avoid',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top: Brand and Price */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '2.2mm',
          fontWeight: '600',
        }}
      >
        <span>thevasa.in</span>
        {mrp && (
          <span style={{ fontSize: '2.6mm', fontWeight: '700' }}>
            ₹{mrp}
          </span>
        )}
      </div>

      {/* Barcode */}
      <div
        style={{
          marginTop: '0.3mm',
          height: '8mm',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg ref={barcodeRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* SKU and Product Name */}
      <div
        style={{
          marginTop: '0.3mm',
          fontSize: '2.3mm',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {sku} - {productName || ''}
      </div>

      {/* Batch and Date */}
      <div
        style={{
          marginTop: '0.2mm',
          fontSize: '2mm',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{batchNumber}</span>
        <span>{dateStr}</span>
      </div>

      {/* Size and Color */}
      {(size || color) && (
        <div
          style={{
            marginTop: '0.2mm',
            fontSize: '1.8mm',
            color: '#666',
          }}
        >
          {size && <span>Size: {size}</span>}
          {size && color && <span> | </span>}
          {color && <span>Color: {color}</span>}
        </div>
      )}
    </div>
  )
}
