'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function NewProductionPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    sku: '',
    productName: '',
    plannedQty: '',
    targetDate: '',
    productionLine: '',
    location: '',
    notes: '',
  })

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.sku || !formData.productName || !formData.plannedQty || !formData.targetDate) {
      alert('Please fill in all required fields (SKU, Product Name, Planned Qty, Target Date)')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionType: 'in_house',
          sku: formData.sku,
          productName: formData.productName,
          plannedQty: parseFloat(formData.plannedQty),
          targetDate: formData.targetDate,
          productionLine: formData.productionLine || undefined,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to create production order')
        return
      }

      const result = await res.json()
      alert(`Production order created: ${result.productionNumber}`)
      router.push(`/production/in-house/${result.id}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create production order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Production Run"
        description="Create a new in-house production order"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Production', href: '/production' },
          { label: 'In-House', href: '/production/in-house' },
          { label: 'New' },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/production/in-house">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Production Details</CardTitle>
          <CardDescription>
            Define the output product and production parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">Product SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => updateField('sku', e.target.value)}
                placeholder="e.g. FIN-BLK-M-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder="e.g. Black Kurta - Medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plannedQty">Planned Quantity *</Label>
              <Input
                id="plannedQty"
                type="number"
                step="0.001"
                min="0"
                value={formData.plannedQty}
                onChange={(e) => updateField('plannedQty', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date *</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => updateField('targetDate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productionLine">Production Line</Label>
              <Input
                id="productionLine"
                value={formData.productionLine}
                onChange={(e) => updateField('productionLine', e.target.value)}
                placeholder="e.g. Line 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. Production Floor A"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any special instructions..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? <LoadingSpinner size="sm" /> : 'Create Production Order'}
        </Button>
      </div>
    </div>
  )
}
