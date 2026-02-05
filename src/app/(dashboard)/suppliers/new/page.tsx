'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { cn } from '@/lib/utils'

const SUPPLY_CATEGORIES = [
  { value: 'finished', label: 'Finished Goods' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'corporate_assets', label: 'Corporate Assets' },
  { value: 'samples', label: 'Samples' },
  { value: 'influencer_samples', label: 'Influencer Samples' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'office_expenses', label: 'Office Expenses' },
  { value: 'software', label: 'Software' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'misc', label: 'Miscellaneous' },
  { value: 'customer_refunds', label: 'Customer Refunds' },
] as const

interface Contact {
  name: string
  phone: string
  email: string
  isPrimary: boolean
}

export default function NewSupplierPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstNumber: '',
    panNumber: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    paymentTerms: '',
    supplyCategories: [] as string[],
    isActive: true,
  })

  // Validation functions
  const validateName = (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'Supplier name is required'
    }
    if (value.trim().length < 2) {
      return 'Supplier name must be at least 2 characters'
    }
    return null
  }

  const validateEmail = (value: string): string | null => {
    if (!value) return null // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address'
    }
    return null
  }

  const validatePhone = (value: string): string | null => {
    if (!value) return null // Optional field
    const cleanPhone = value.replace(/[\s\-\+]/g, '')
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return 'Phone number must be 10-15 digits'
    }
    return null
  }

  const validateGST = (value: string): string | null => {
    if (!value) return null // Optional field
    if (value.length !== 15) {
      return 'GST number must be exactly 15 characters'
    }
    // GST format: 22AAAAA0000A1Z5
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    if (!gstRegex.test(value)) {
      return 'Invalid GST format (e.g., 22AAAAA0000A1Z5)'
    }
    return null
  }

  const validatePAN = (value: string): string | null => {
    if (!value) return null // Optional field
    if (value.length !== 10) {
      return 'PAN number must be exactly 10 characters'
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    if (!panRegex.test(value)) {
      return 'Invalid PAN format (e.g., AAAAA0000A)'
    }
    return null
  }

  const validateIFSC = (value: string): string | null => {
    if (!value) return null // Optional field
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
    if (!ifscRegex.test(value)) {
      return 'Invalid IFSC format (e.g., HDFC0001234)'
    }
    return null
  }

  const validateSupplyCategories = (categories: string[]): string | null => {
    if (categories.length === 0) {
      return 'Please select at least one supply category'
    }
    return null
  }

  // Update field with validation
  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Run validation for the field
    let fieldError: string | null = null
    switch (field) {
      case 'name':
        fieldError = validateName(value as string)
        break
      case 'email':
        fieldError = validateEmail(value as string)
        break
      case 'phone':
        fieldError = validatePhone(value as string)
        break
      case 'gstNumber':
        fieldError = validateGST(value as string)
        break
      case 'panNumber':
        fieldError = validatePAN(value as string)
        break
      case 'bankIfscCode':
        fieldError = validateIFSC(value as string)
        break
    }

    setErrors((prev) => {
      const newErrors = { ...prev }
      if (fieldError) {
        newErrors[field] = fieldError
      } else {
        delete newErrors[field]
      }
      return newErrors
    })
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const toggleSupplyCategory = (category: string) => {
    const newCategories = formData.supplyCategories.includes(category)
      ? formData.supplyCategories.filter((c) => c !== category)
      : [...formData.supplyCategories, category]

    setFormData((prev) => ({
      ...prev,
      supplyCategories: newCategories,
    }))

    // Validate categories
    const categoryError = validateSupplyCategories(newCategories)
    setErrors((prev) => {
      const newErrors = { ...prev }
      if (categoryError) {
        newErrors.supplyCategories = categoryError
      } else {
        delete newErrors.supplyCategories
      }
      return newErrors
    })
    setTouched((prev) => ({ ...prev, supplyCategories: true }))
  }

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      { name: '', phone: '', email: '', isPrimary: prev.length === 0 },
    ])
  }

  const removeContact = (index: number) => {
    setContacts((prev) => {
      const newContacts = prev.filter((_, i) => i !== index)
      if (prev[index].isPrimary && newContacts.length > 0) {
        newContacts[0].isPrimary = true
      }
      return newContacts
    })
  }

  const updateContact = (index: number, field: keyof Contact, value: string | boolean) => {
    setContacts((prev) =>
      prev.map((contact, i) => {
        if (i !== index) {
          if (field === 'isPrimary' && value === true) {
            return { ...contact, isPrimary: false }
          }
          return contact
        }
        return { ...contact, [field]: value }
      })
    )
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const nameError = validateName(formData.name)
    if (nameError) newErrors.name = nameError

    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError

    const phoneError = validatePhone(formData.phone)
    if (phoneError) newErrors.phone = phoneError

    const gstError = validateGST(formData.gstNumber)
    if (gstError) newErrors.gstNumber = gstError

    const panError = validatePAN(formData.panNumber)
    if (panError) newErrors.panNumber = panError

    const ifscError = validateIFSC(formData.bankIfscCode)
    if (ifscError) newErrors.bankIfscCode = ifscError

    const categoryError = validateSupplyCategories(formData.supplyCategories)
    if (categoryError) newErrors.supplyCategories = categoryError

    setErrors(newErrors)
    setTouched({
      name: true,
      email: true,
      phone: true,
      gstNumber: true,
      panNumber: true,
      bankIfscCode: true,
      supplyCategories: true,
    })

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      setError('Please fix the errors in the form before submitting')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contacts: contacts.filter((c) => c.name.trim()),
        }),
      })

      // Try to parse response, handle empty body
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): Unable to parse response`)
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || `Failed to create supplier (${response.status})`)
      }

      router.push('/suppliers')
    } catch (err: any) {
      console.error('Error creating supplier:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const hasErrors = Object.keys(errors).length > 0
  const isFormValid = formData.name.trim().length >= 2 && formData.supplyCategories.length > 0 && !hasErrors

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Supplier"
        description="Register a new supplier"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Suppliers', href: '/suppliers' },
          { label: 'New' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the supplier&apos;s basic details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="Enter supplier name"
                  className={cn(
                    touched.name && errors.name && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                {touched.name && errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="supplier@example.com"
                  className={cn(
                    touched.email && errors.email && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                {touched.email && errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  placeholder="+91 98765 43210"
                  className={cn(
                    touched.phone && errors.phone && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                {touched.phone && errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive suppliers won&apos;t appear in dropdowns
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleFieldChange('isActive', checked)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Enter full address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Supply Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Supply Categories *</CardTitle>
            <CardDescription>
              Select what types of goods/services this supplier provides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {SUPPLY_CATEGORIES.map((category) => (
                <div key={category.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.value}`}
                    checked={formData.supplyCategories.includes(category.value)}
                    onCheckedChange={() => toggleSupplyCategory(category.value)}
                  />
                  <Label
                    htmlFor={`category-${category.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
            {touched.supplyCategories && errors.supplyCategories && (
              <p className="text-xs text-destructive mt-2">{errors.supplyCategories}</p>
            )}
            {formData.supplyCategories.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {formData.supplyCategories.length} categor{formData.supplyCategories.length === 1 ? 'y' : 'ies'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tax Information */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
            <CardDescription>
              GST and PAN details for invoicing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={formData.gstNumber}
                  onChange={(e) => handleFieldChange('gstNumber', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('gstNumber')}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className={cn(
                    touched.gstNumber && errors.gstNumber && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                {touched.gstNumber && errors.gstNumber && (
                  <p className="text-xs text-destructive">{errors.gstNumber}</p>
                )}
                {!errors.gstNumber && formData.gstNumber && (
                  <p className="text-xs text-muted-foreground">
                    {formData.gstNumber.length}/15 characters
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input
                  id="panNumber"
                  value={formData.panNumber}
                  onChange={(e) => handleFieldChange('panNumber', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('panNumber')}
                  placeholder="AAAAA0000A"
                  maxLength={10}
                  className={cn(
                    touched.panNumber && errors.panNumber && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                {touched.panNumber && errors.panNumber && (
                  <p className="text-xs text-destructive">{errors.panNumber}</p>
                )}
                {!errors.panNumber && formData.panNumber && (
                  <p className="text-xs text-muted-foreground">
                    {formData.panNumber.length}/10 characters
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banking Details */}
        <Card>
          <CardHeader>
            <CardTitle>Banking Details</CardTitle>
            <CardDescription>
              Bank account information for payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => handleFieldChange('bankName', e.target.value)}
                  placeholder="e.g., HDFC Bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankIfscCode">IFSC Code</Label>
                <Input
                  id="bankIfscCode"
                  value={formData.bankIfscCode}
                  onChange={(e) => handleFieldChange('bankIfscCode', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('bankIfscCode')}
                  placeholder="HDFC0001234"
                  maxLength={11}
                  className={cn(
                    touched.bankIfscCode && errors.bankIfscCode && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                {touched.bankIfscCode && errors.bankIfscCode && (
                  <p className="text-xs text-destructive">{errors.bankIfscCode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleFieldChange('bankAccountNumber', e.target.value)}
                  placeholder="Enter account number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
                  placeholder="e.g., Net 30, 50% advance"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              Add contact persons for this supplier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Contact {index + 1}</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`primary-${index}`}
                        checked={contact.isPrimary}
                        onCheckedChange={(checked) => updateContact(index, 'isPrimary', checked)}
                      />
                      <Label htmlFor={`primary-${index}`} className="text-sm">
                        Primary
                      </Label>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removeContact(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Name *"
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="Phone"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addContact}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !isFormValid}>
            {loading ? 'Creating...' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </div>
  )
}
