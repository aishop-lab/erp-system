'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Style {
  id: string
  styleCode: string
  styleName: string
}

interface Fabric {
  id: string
  fabricSku: string
  material: string
  color: string
}

interface Entity {
  id: string
  name: string
  code: string
}

interface SalesChannel {
  id: string
  name: string
  code: string
}

export default function NewFinishedProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [styles, setStyles] = useState<Style[]>([])
  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([])

  const [formData, setFormData] = useState({
    parentSku: '',
    childSku: '',
    styleId: '',
    fabricId: '',
    entityId: '',
    title: '',
    color: '',
    size: '',
    costAmount: '',
    sellingPrice: '',
    mrp: '',
    gstRatePct: '5',
    currency: 'INR',
    sellingChannels: [] as string[],
    notes: '',
  })

  useEffect(() => {
    fetchStyles()
    fetchFabrics()
    fetchEntities()
    fetchSalesChannels()
  }, [])

  const fetchStyles = async () => {
    try {
      const response = await fetch('/api/product-info/styles')
      if (response.ok) {
        const data = await response.json()
        setStyles(data.styles || [])
      }
    } catch (error) {
      console.error('Error fetching styles:', error)
    }
  }

  const fetchFabrics = async () => {
    try {
      const response = await fetch('/api/product-info/fabrics')
      if (response.ok) {
        const data = await response.json()
        setFabrics(data.fabrics || [])
      }
    } catch (error) {
      console.error('Error fetching fabrics:', error)
    }
  }

  const fetchEntities = async () => {
    try {
      const response = await fetch('/api/admin/settings/entities')
      if (response.ok) {
        const data = await response.json()
        setEntities(data.entities || [])
      }
    } catch (error) {
      console.error('Error fetching entities:', error)
    }
  }

  const fetchSalesChannels = async () => {
    try {
      const response = await fetch('/api/admin/settings/sales-channels')
      if (response.ok) {
        const data = await response.json()
        setSalesChannels(data.salesChannels || [])
      }
    } catch (error) {
      console.error('Error fetching sales channels:', error)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleChannelToggle = (channelCode: string) => {
    setFormData((prev) => ({
      ...prev,
      sellingChannels: prev.sellingChannels.includes(channelCode)
        ? prev.sellingChannels.filter((c) => c !== channelCode)
        : [...prev.sellingChannels, channelCode],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        parentSku: formData.parentSku,
        childSku: formData.childSku,
        styleId: formData.styleId,
        fabricId: formData.fabricId,
        entityId: formData.entityId || null,
        title: formData.title,
        color: formData.color,
        size: formData.size,
        costAmount: parseFloat(formData.costAmount),
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null,
        mrp: formData.mrp ? parseFloat(formData.mrp) : null,
        gstRatePct: parseFloat(formData.gstRatePct),
        currency: formData.currency,
        sellingChannels: formData.sellingChannels,
        notes: formData.notes || null,
      }

      const response = await fetch('/api/product-info/finished', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create finished product')
      }

      router.push('/products/finished')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Finished Product"
        description="Create a new sellable product"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Finished Products', href: '/products/finished' },
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
            <CardTitle>SKU Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parentSku">Parent SKU *</Label>
                <Input
                  id="parentSku"
                  value={formData.parentSku}
                  onChange={(e) => handleChange('parentSku', e.target.value.toUpperCase())}
                  placeholder="e.g., PROD-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="childSku">Child SKU *</Label>
                <Input
                  id="childSku"
                  value={formData.childSku}
                  onChange={(e) => handleChange('childSku', e.target.value.toUpperCase())}
                  placeholder="e.g., PROD-001-BLK-S"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Men's Cotton Casual Shirt"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Color *</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  placeholder="e.g., Black"
                  required
                />
              </div>
              <div>
                <Label htmlFor="size">Size *</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => handleChange('size', e.target.value.toUpperCase())}
                  placeholder="e.g., S, M, L, XL"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="styleId">Style *</Label>
                <Select
                  value={formData.styleId}
                  onValueChange={(value) => handleChange('styleId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.styleCode} - {style.styleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fabricId">Fabric *</Label>
                <Select
                  value={formData.fabricId}
                  onValueChange={(value) => handleChange('fabricId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fabric" />
                  </SelectTrigger>
                  <SelectContent>
                    {fabrics.map((fabric) => (
                      <SelectItem key={fabric.id} value={fabric.id}>
                        {fabric.fabricSku} - {fabric.material} ({fabric.color})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="entityId">Entity</Label>
                <Select
                  value={formData.entityId}
                  onValueChange={(value) => handleChange('entityId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name} ({entity.code})
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
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="costAmount">Cost Amount (INR) *</Label>
                <Input
                  id="costAmount"
                  type="number"
                  step="0.01"
                  value={formData.costAmount}
                  onChange={(e) => handleChange('costAmount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sellingPrice">Selling Price</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(e) => handleChange('sellingPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="mrp">MRP</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  value={formData.mrp}
                  onChange={(e) => handleChange('mrp', e.target.value)}
                  placeholder="0.00"
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selling Channels</CardTitle>
          </CardHeader>
          <CardContent>
            {salesChannels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sales channels configured. Go to Admin Settings to add channels.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {salesChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`channel-${channel.id}`}
                      checked={formData.sellingChannels.includes(channel.code)}
                      onCheckedChange={() => handleChannelToggle(channel.code)}
                    />
                    <Label
                      htmlFor={`channel-${channel.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {channel.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
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
              placeholder="Additional notes about this product..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
