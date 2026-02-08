'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewStylePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
    // Chest measurements
    chest32: '',
    chest34: '',
    chest36: '',
    chest38: '',
    chest40: '',
    // Length measurements
    length32: '',
    length34: '',
    length36: '',
    length38: '',
    length40: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Convert measurement fields to numbers
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
      }

      // Add measurements if provided
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

      const response = await fetch('/api/product-info/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create style')
      }

      router.push('/products/styles')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Style"
        description="Add a new style template to the library"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Styles', href: '/products/styles' },
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
                <Label htmlFor="styleCode">Style Code *</Label>
                <Input
                  id="styleCode"
                  value={formData.styleCode}
                  onChange={(e) => handleChange('styleCode', e.target.value.toUpperCase())}
                  placeholder="e.g., DD, HH"
                  required
                />
              </div>
              <div>
                <Label htmlFor="styleName">Style Name *</Label>
                <Input
                  id="styleName"
                  value={formData.styleName}
                  onChange={(e) => handleChange('styleName', e.target.value)}
                  placeholder="e.g., Divine Depth"
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
                  placeholder="e.g., Women"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="e.g., Blouse"
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
                  placeholder="e.g., 3/4 Sleeves"
                />
              </div>
              <div>
                <Label htmlFor="neckShape">Neck Shape</Label>
                <Input
                  id="neckShape"
                  value={formData.neckShape}
                  onChange={(e) => handleChange('neckShape', e.target.value)}
                  placeholder="e.g., Round Neck"
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
                  placeholder="e.g., Back Opening"
                />
              </div>
              <div>
                <Label htmlFor="openMechanism">Open Mechanism</Label>
                <Input
                  id="openMechanism"
                  value={formData.openMechanism}
                  onChange={(e) => handleChange('openMechanism', e.target.value)}
                  placeholder="e.g., Side Zip"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="padding">Padding</Label>
              <Input
                id="padding"
                value={formData.padding}
                onChange={(e) => handleChange('padding', e.target.value)}
                placeholder="e.g., Without Padding"
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
                    placeholder="0.00"
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
                    placeholder="0.00"
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
              placeholder="Additional notes about this style..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Style'}
          </Button>
        </div>
      </form>
    </div>
  )
}
