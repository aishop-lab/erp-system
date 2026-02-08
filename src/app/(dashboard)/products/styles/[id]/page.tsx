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

export default function EditStylePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    styleCode: '',
    styleName: '',
    gender: '',
    category: '',
    sleeves: '',
    neckShape: '',
    backShape: '',
    openMechanism: '',
    padding: '',
    notes: '',
    status: 'active',
    chest32: '',
    chest34: '',
    chest36: '',
    chest38: '',
    chest40: '',
    length32: '',
    length34: '',
    length36: '',
    length38: '',
    length40: '',
  })

  useEffect(() => {
    if (id) fetchStyle()
  }, [id])

  const fetchStyle = async () => {
    try {
      const response = await fetch(`/api/product-info/styles/${id}`)
      if (!response.ok) throw new Error('Style not found')
      const data = await response.json()
      const style = data.style

      setFormData({
        styleCode: style.styleCode || '',
        styleName: style.styleName || '',
        gender: style.gender || '',
        category: style.category || '',
        sleeves: style.sleeves || '',
        neckShape: style.neckShape || '',
        backShape: style.backShape || '',
        openMechanism: style.openMechanism || '',
        padding: style.padding || '',
        notes: style.notes || '',
        status: style.status || 'active',
        chest32: style.chest32?.toString() || '',
        chest34: style.chest34?.toString() || '',
        chest36: style.chest36?.toString() || '',
        chest38: style.chest38?.toString() || '',
        chest40: style.chest40?.toString() || '',
        length32: style.length32?.toString() || '',
        length34: style.length34?.toString() || '',
        length36: style.length36?.toString() || '',
        length38: style.length38?.toString() || '',
        length40: style.length40?.toString() || '',
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
        styleCode: formData.styleCode,
        styleName: formData.styleName,
        gender: formData.gender || null,
        category: formData.category || null,
        sleeves: formData.sleeves || null,
        neckShape: formData.neckShape || null,
        backShape: formData.backShape || null,
        openMechanism: formData.openMechanism || null,
        padding: formData.padding || null,
        notes: formData.notes || null,
        status: formData.status,
      }

      const measurementFields = [
        'chest32', 'chest34', 'chest36', 'chest38', 'chest40',
        'length32', 'length34', 'length36', 'length38', 'length40',
      ]
      measurementFields.forEach((field) => {
        const value = formData[field as keyof typeof formData]
        if (value) {
          data[field] = parseFloat(value)
        }
      })

      const response = await fetch(`/api/product-info/styles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update style')
      }

      router.push('/products/styles')
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
        title="Edit Style"
        description="Update style template details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Styles', href: '/products/styles' },
          { label: formData.styleCode || 'Edit' },
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
                <Label htmlFor="styleCode">Style Code *</Label>
                <Input
                  id="styleCode"
                  value={formData.styleCode}
                  onChange={(e) => handleChange('styleCode', e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <Label htmlFor="styleName">Style Name *</Label>
                <Input
                  id="styleName"
                  value={formData.styleName}
                  onChange={(e) => handleChange('styleName', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Attributes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sleeves">Sleeves</Label>
                <Input
                  id="sleeves"
                  value={formData.sleeves}
                  onChange={(e) => handleChange('sleeves', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="neckShape">Neck Shape</Label>
                <Input
                  id="neckShape"
                  value={formData.neckShape}
                  onChange={(e) => handleChange('neckShape', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backShape">Back Shape</Label>
                <Input
                  id="backShape"
                  value={formData.backShape}
                  onChange={(e) => handleChange('backShape', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="openMechanism">Open Mechanism</Label>
                <Input
                  id="openMechanism"
                  value={formData.openMechanism}
                  onChange={(e) => handleChange('openMechanism', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="padding">Padding</Label>
              <Input
                id="padding"
                value={formData.padding}
                onChange={(e) => handleChange('padding', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Measurements - Chest (inches)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {['32', '34', '36', '38', '40'].map((size) => (
                <div key={`chest${size}`}>
                  <Label htmlFor={`chest${size}`}>Size {size}</Label>
                  <Input
                    id={`chest${size}`}
                    type="number"
                    step="0.01"
                    value={formData[`chest${size}` as keyof typeof formData]}
                    onChange={(e) => handleChange(`chest${size}`, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Measurements - Length (inches)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {['32', '34', '36', '38', '40'].map((size) => (
                <div key={`length${size}`}>
                  <Label htmlFor={`length${size}`}>Size {size}</Label>
                  <Input
                    id={`length${size}`}
                    type="number"
                    step="0.01"
                    value={formData[`length${size}` as keyof typeof formData]}
                    onChange={(e) => handleChange(`length${size}`, e.target.value)}
                  />
                </div>
              ))}
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
