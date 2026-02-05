'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function CompanyInfoTab() {
  const [formData, setFormData] = useState({
    companyName: 'Thevasa',
    gstNumber: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Company info saving would go here
    // For now, this is a placeholder UI
    alert('Company information saving is not yet implemented')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Company Information</h2>
        <p className="text-sm text-muted-foreground">
          Basic company details and branding settings
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            This information will be used in invoices and official documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <Label htmlFor="gst">GST Number</Label>
              <Input
                id="gst"
                value={formData.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value.toUpperCase())}
                placeholder="15-character GSTIN"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.gstNumber.length}/15 characters
              </p>
            </div>

            <div>
              <Label htmlFor="address">Registered Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Company registered address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  placeholder="info@company.com"
                />
              </div>

              <div>
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={formData.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit">Save Company Information</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground max-w-2xl">
        Note: Company information management is a placeholder. Full implementation will include
        logo upload, tax configuration, and multi-entity support.
      </p>
    </div>
  )
}
