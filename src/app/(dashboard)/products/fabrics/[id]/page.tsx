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

export default function EditFabricPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [formData, setFormData] = useState({
    fabricSku: '',
    material: '',
    color: '',
    design: '',
    work: '',
    widthCm: '',
    weightPerMeter: '',
    costAmount: '',
    gstRatePct: '5',
    hsnCode: '',
    uom: 'Meters',
    supplierId: '',
    notes: '',
    status: 'active',
  })

  useEffect(() => {
    fetchSuppliers()
    if (id) fetchFabric()
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

  const fetchFabric = async () => {
    try {
      const response = await fetch(`/api/product-info/fabrics/${id}`)
      if (!response.ok) throw new Error('Fabric not found')
      const data = await response.json()
      const fabric = data.fabric

      setFormData({
        fabricSku: fabric.fabricSku || '',
        material: fabric.material || '',
        color: fabric.color || '',
        design: fabric.design || '',
        work: fabric.work || '',
        widthCm: fabric.widthCm?.toString() || '',
        weightPerMeter: fabric.weightPerMeter?.toString() || '',
        costAmount: fabric.costAmount?.toString() || '',
        gstRatePct: fabric.gstRatePct?.toString() || '5',
        hsnCode: fabric.hsnCode || '',
        uom: fabric.uom || 'Meters',
        supplierId: fabric.supplierId || '',
        notes: fabric.notes || '',
        status: fabric.status || 'active',
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
      const data: any = {
        fabricSku: formData.fabricSku,
        material: formData.material,
        color: formData.color,
        design: formData.design || null,
        work: formData.work || null,
        widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
        weightPerMeter: formData.weightPerMeter ? parseFloat(formData.weightPerMeter) : null,
        costAmount: parseFloat(formData.costAmount),
        gstRatePct: parseFloat(formData.gstRatePct),
        hsnCode: formData.hsnCode || null,
        uom: formData.uom,
        supplierId: formData.supplierId || null,
        notes: formData.notes || null,
        status: formData.status,
      }

      const response = await fetch(`/api/product-info/fabrics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update fabric')
      }

      router.push('/products/fabrics')
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
        title="Edit Fabric"
        description="Update fabric details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Fabrics', href: '/products/fabrics' },
          { label: formData.fabricSku || 'Edit' },
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
                <Label htmlFor="fabricSku">Fabric SKU *</Label>
                <Input
                  id="fabricSku"
                  value={formData.fabricSku}
                  onChange={(e) => handleChange('fabricSku', e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <Label htmlFor="material">Material *</Label>
                <Input
                  id="material"
                  value={formData.material}
                  onChange={(e) => handleChange('material', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Color *</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  required
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="design">Design</Label>
                <Input
                  id="design"
                  value={formData.design}
                  onChange={(e) => handleChange('design', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="work">Work</Label>
                <Input
                  id="work"
                  value={formData.work}
                  onChange={(e) => handleChange('work', e.target.value)}
                />
              </div>
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
                <Label htmlFor="widthCm">Width (cm)</Label>
                <Input
                  id="widthCm"
                  type="number"
                  step="0.01"
                  value={formData.widthCm}
                  onChange={(e) => handleChange('widthCm', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="weightPerMeter">Weight per Meter (g)</Label>
                <Input
                  id="weightPerMeter"
                  type="number"
                  step="0.01"
                  value={formData.weightPerMeter}
                  onChange={(e) => handleChange('weightPerMeter', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="uom">Unit of Measure</Label>
                <Select
                  value={formData.uom}
                  onValueChange={(value) => handleChange('uom', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meters">Meters</SelectItem>
                    <SelectItem value="Yards">Yards</SelectItem>
                    <SelectItem value="Pieces">Pieces</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="costAmount">Cost Amount (INR) *</Label>
                <Input
                  id="costAmount"
                  type="number"
                  step="0.01"
                  value={formData.costAmount}
                  onChange={(e) => handleChange('costAmount', e.target.value)}
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
