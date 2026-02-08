'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Supplier {
  id: string
  name: string
  code: string
}

export default function NewPackagingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [formData, setFormData] = useState({
    pkgSku: '',
    pkgType: '',
    description: '',
    channel: '',
    dimensions: '',
    measurementUnit: 'Pieces',
    unitsPerQuantity: '1',
    costPerUnit: '',
    gstRatePct: '5',
    hsnCode: '',
    supplierId: '',
    notes: '',
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers/active')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers || [])
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        pkgSku: formData.pkgSku,
        pkgType: formData.pkgType,
        description: formData.description || null,
        channel: formData.channel || null,
        dimensions: formData.dimensions || null,
        measurementUnit: formData.measurementUnit,
        unitsPerQuantity: parseInt(formData.unitsPerQuantity),
        costPerUnit: parseFloat(formData.costPerUnit),
        gstRatePct: parseFloat(formData.gstRatePct),
        hsnCode: formData.hsnCode || null,
        supplierId: formData.supplierId || null,
        notes: formData.notes || null,
      }

      const response = await fetch('/api/product-info/packaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create packaging')
      }

      router.push('/products/packaging')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Packaging"
        description="Add new packaging material to the library"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Packaging', href: '/products/packaging' },
          { label: 'New' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pkgSku">Packaging SKU *</Label>
                <Input
                  id="pkgSku"
                  value={formData.pkgSku}
                  onChange={(e) => handleChange('pkgSku', e.target.value.toUpperCase())}
                  placeholder="e.g., PKG-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pkgType">Type *</Label>
                <Input
                  id="pkgType"
                  value={formData.pkgType}
                  onChange={(e) => handleChange('pkgType', e.target.value)}
                  placeholder="e.g., Box, Polybag"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="channel">Channel</Label>
                <Input
                  id="channel"
                  value={formData.channel}
                  onChange={(e) => handleChange('channel', e.target.value)}
                  placeholder="e.g., Amazon, Myntra"
                />
              </div>
              <div>
                <Label htmlFor="supplierId">Supplier</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) => handleChange('supplierId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Description of the packaging..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => handleChange('dimensions', e.target.value)}
                  placeholder="e.g., 30x20x10 cm"
                />
              </div>
              <div>
                <Label htmlFor="measurementUnit">Measurement Unit *</Label>
                <Select
                  value={formData.measurementUnit}
                  onValueChange={(value) => handleChange('measurementUnit', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pieces">Pieces</SelectItem>
                    <SelectItem value="Sets">Sets</SelectItem>
                    <SelectItem value="Packets">Packets</SelectItem>
                    <SelectItem value="Rolls">Rolls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unitsPerQuantity">Units per Quantity *</Label>
                <Input
                  id="unitsPerQuantity"
                  type="number"
                  value={formData.unitsPerQuantity}
                  onChange={(e) => handleChange('unitsPerQuantity', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="costPerUnit">Cost per Unit (INR) *</Label>
                <Input
                  id="costPerUnit"
                  type="number"
                  step="0.01"
                  value={formData.costPerUnit}
                  onChange={(e) => handleChange('costPerUnit', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gstRatePct">GST Rate (%)</Label>
                <Input
                  id="gstRatePct"
                  type="number"
                  step="0.01"
                  value={formData.gstRatePct}
                  onChange={(e) => handleChange('gstRatePct', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="hsnCode">HSN Code</Label>
                <Input
                  id="hsnCode"
                  value={formData.hsnCode}
                  onChange={(e) => handleChange('hsnCode', e.target.value)}
                  placeholder="e.g., 48194000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Packaging'}
          </Button>
        </div>
      </form>
    </div>
  )
}
