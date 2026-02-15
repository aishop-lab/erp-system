'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { format } from 'date-fns'

interface RawMaterialLabelProps {
  sku: string
  batchNumber: string
  createdAt: string | Date
  rmType?: string | null
  color?: string | null
}

export function RawMaterialLabel({
  sku,
  batchNumber,
  createdAt,
  rmType,
  color,
}: RawMaterialLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (barcodeRef.current && sku) {
      JsBarcode(barcodeRef.current, sku, {
        format: 'CODE128',
        width: 1.4,
        height: 48,
        displayValue: false,
        margin: 0,
      })
    }
  }, [sku])

  const dateStr = format(new Date(createdAt), 'dd/MM/yy')

  return (
    <div
      className="raw-material-label"
      style={{
        width: '50mm',
        height: '25mm',
        padding: '2mm',
        border: '1px solid #ddd',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        pageBreakInside: 'avoid',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5mm',
      }}
    >
      <div
        style={{
          height: '12mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg ref={barcodeRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1mm',
          fontSize: '2mm',
          flex: 1,
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '2.3mm' }}>{sku}</div>
          <div style={{ fontSize: '1.8mm', marginTop: '0.5mm' }}>{dateStr}</div>
          <div style={{ fontSize: '1.8mm', marginTop: '0.5mm' }}>{color || ''}</div>
        </div>
        <div style={{ fontSize: '1.8mm' }}>
          {rmType && <div>Type: {rmType}</div>}
          <div>Batch: {batchNumber}</div>
        </div>
      </div>
    </div>
  )
}
