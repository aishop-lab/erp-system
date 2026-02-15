'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { format } from 'date-fns'

interface FabricLabelProps {
  sku: string
  batchNumber: string
  createdAt: string | Date
  material?: string | null
  color?: string | null
  design?: string | null
  work?: string | null
}

export function FabricLabel({
  sku,
  batchNumber,
  createdAt,
  material,
  color,
  design,
  work,
}: FabricLabelProps) {
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
      className="fabric-label"
      style={{
        width: '50mm',
        height: '25mm',
        padding: '2mm',
        border: '1px solid #ddd',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        fontSize: '2.2mm',
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
          <div style={{ fontSize: '1.8mm', marginTop: '0.5mm' }}>{batchNumber}</div>
        </div>
        <div style={{ fontSize: '1.8mm' }}>
          {material && <div>Mat: {material}</div>}
          {color && <div>Col: {color}</div>}
          {design && <div>Des: {design}</div>}
          {work && <div>Wrk: {work}</div>}
        </div>
      </div>
    </div>
  )
}
