'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface Supplier {
  id: string
  code: string
  name: string
  supplyCategories: string[]
  email?: string
  gstNumber?: string
}

interface VendorSelectorProps {
  purchaseType: string
  value?: string
  onChange: (supplierId: string, supplier: Supplier | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function VendorSelector({
  purchaseType,
  value,
  onChange,
  label = 'Vendor',
  placeholder = 'Select a vendor',
  disabled = false,
  required = false,
}: VendorSelectorProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!purchaseType) {
      setSuppliers([])
      return
    }

    const fetchSuppliers = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/suppliers/by-purchase-type?purchaseType=${encodeURIComponent(purchaseType)}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch vendors')
        }

        const data = await response.json()
        setSuppliers(data || [])
      } catch (err: any) {
        setError(err.message)
        setSuppliers([])
      } finally {
        setLoading(false)
      }
    }

    fetchSuppliers()
  }, [purchaseType])

  const handleChange = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId) || null
    onChange(supplierId, supplier)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}{required && ' *'}</Label>}
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted">
          <LoadingSpinner className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">Loading vendors...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}{required && ' *'}</Label>}
        <div className="text-sm text-destructive">{error}</div>
      </div>
    )
  }

  if (!purchaseType) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}{required && ' *'}</Label>}
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Select purchase type first" />
          </SelectTrigger>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}{required && ' *'}</Label>}
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={disabled || suppliers.length === 0}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              suppliers.length === 0
                ? 'No vendors for this purchase type'
                : placeholder
            }
          />
        </SelectTrigger>
        <SelectContent>
          {suppliers.map((supplier) => (
            <SelectItem key={supplier.id} value={supplier.id}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {supplier.code}
                </span>
                <span>{supplier.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {suppliers.length === 0 && purchaseType && (
        <p className="text-xs text-muted-foreground">
          No active vendors supply this purchase type. Add vendors with this supply category.
        </p>
      )}
    </div>
  )
}
