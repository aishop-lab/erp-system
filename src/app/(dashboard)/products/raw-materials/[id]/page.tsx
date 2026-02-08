'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export default function EditRawMaterialPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [formData, setFormData] = useState({
    rmSku: '',
    rmType: '',
    color: '',
    measurementUnit: 'Pieces',
    unitsPerQuantity: '1',
    costPerSku: '',
    gstRatePct: '5',
    hsnCode: '',
    supplierId: '',
    notes: '',
    status: 'active',
  })

  useEffect(() => {
    fetchSuppliers()
    if (id) fetchRawMaterial()
  }, [id])

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

  const fetchRawMaterial = async () => {
    try {
      const response = await fetch(`/api/product-info/raw-materials/${id}`)
      if (!response.ok) throw new Error('Raw material not found')
      const data = await response.json()
      const rm = data.rawMaterial

      setFormData({
        rmSku: rm.rmSku || '',
        rmType: rm.rmType || '',
        color: rm.color || '',
        measurementUnit: rm.measurementUnit || 'Pieces',
        unitsPerQuantity: rm.unitsPerQuantity?.toString() || '1',
        costPerSku: rm.costPerSku?.toString() || '',
        gstRatePct: rm.gstRatePct?.toString() || '5',
        hsnCode: rm.hsnCode || '',
        supplierId: rm.supplierId || '',
        notes: rm.notes || '',
        status: rm.status || 'active',
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const data = {
        rmSku: formData.rmSku,
        rmType: formData.rmType,
        color: formData.color || null,
        measurementUnit: formData.measurementUnit,
        unitsPerQuantity: parseInt(formData.unitsPerQuantity),
        costPerSku: parseFloat(formData.costPerSku),
        gstRatePct: parseFloat(formData.gstRatePct),
        hsnCode: formData.hsnCode || null,
        supplierId: formData.supplierId || null,
        notes: formData.notes || null,
        status: formData.status,
      }

      const response = await fetch(`/api/product-info/raw-materials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update raw material')
      }

      router.push('/products/raw-materials')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Raw Material"
        description="Update raw material details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Raw Materials', href: '/products/raw-materials' },
          { label: formData.rmSku || 'Edit' },
        ]}
        actions={
          <Badge variant={formData.status === 'active' ? 'default' : 'secondary'}>
            {formData.status}
          </Badge>
        }
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
                <Label htmlFor="rmSku">RM SKU *</Label>
                <Input
                  id="rmSku"
                  value={formData.rmSku}
                  onChange={(e) => handleChange('rmSku', e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rmType">Type *</Label>
                <Input
                  id="rmType"
                  value={formData.rmType}
                  onChange={(e) => handleChange('rmType', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quantity & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="Meters">Meters</SelectItem>
                    <SelectItem value="Grams">Grams</SelectItem>
                    <SelectItem value="Sets">Sets</SelectItem>
                    <SelectItem value="Packets">Packets</SelectItem>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="costPerSku">Cost per SKU (INR) *</Label>
                <Input
                  id="costPerSku"
                  type="number"
                  step="0.01"
                  value={formData.costPerSku}
                  onChange={(e) => handleChange('costPerSku', e.target.value)}
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
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
