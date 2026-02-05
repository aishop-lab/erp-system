'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Upload, Download, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
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
  id?: string
  name: string
  phone: string
  email: string
  isPrimary: boolean
}

interface Pricing {
  id: string
  unitPrice: number
  currency: string
  minQty: number | null
  product: {
    id: string
    sku: string
    name: string
    unit: string
  }
}

interface Supplier {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  gstNumber: string | null
  panNumber: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankIfscCode: string | null
  paymentTerms: string | null
  supplyCategories: string[]
  isActive: boolean
  contacts: Contact[]
  pricings: Pricing[]
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pricings, setPricings] = useState<Pricing[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // CSV upload state
  const [uploadingPricing, setUploadingPricing] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'contact' | 'pricing'
    id: string
    name: string
  } | null>(null)

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
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address'
    }
    return null
  }

  const validatePhone = (value: string): string | null => {
    if (!value) return null
    const cleanPhone = value.replace(/[\s\-\+]/g, '')
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return 'Phone number must be 10-15 digits'
    }
    return null
  }

  const validateGST = (value: string): string | null => {
    if (!value) return null
    if (value.length !== 15) {
      return 'GST number must be exactly 15 characters'
    }
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    if (!gstRegex.test(value)) {
      return 'Invalid GST format (e.g., 22AAAAA0000A1Z5)'
    }
    return null
  }

  const validatePAN = (value: string): string | null => {
    if (!value) return null
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
    if (!value) return null
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

  useEffect(() => {
    fetchSupplier()
  }, [id])

  const fetchSupplier = async () => {
    try {
      const response = await fetch(`/api/suppliers/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/suppliers')
          return
        }
        throw new Error('Failed to fetch supplier')
      }

      const data: Supplier = await response.json()
      setSupplier(data)
      setFormData({
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        gstNumber: data.gstNumber || '',
        panNumber: data.panNumber || '',
        bankName: data.bankName || '',
        bankAccountNumber: data.bankAccountNumber || '',
        bankIfscCode: data.bankIfscCode || '',
        paymentTerms: data.paymentTerms || '',
        supplyCategories: data.supplyCategories || [],
        isActive: data.isActive,
      })
      setContacts(data.contacts.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        isPrimary: c.isPrimary,
      })))
      setPricings(data.pricings)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
      setError('Please fix the errors in the form before saving')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        throw new Error(data?.error || `Failed to update supplier (${response.status})`)
      }

      await syncContacts()
      await fetchSupplier()
    } catch (err: any) {
      console.error('Error updating supplier:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const syncContacts = async () => {
    for (const contact of contacts) {
      if (!contact.id && contact.name.trim()) {
        await fetch(`/api/suppliers/${id}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
        })
      } else if (contact.id) {
        await fetch(`/api/suppliers/${id}/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
        })
      }
    }
  }

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      { name: '', phone: '', email: '', isPrimary: prev.length === 0 },
    ])
  }

  const removeContact = (index: number) => {
    const contact = contacts[index]
    if (contact.id) {
      setDeleteTarget({
        type: 'contact',
        id: contact.id,
        name: contact.name || 'this contact',
      })
      setConfirmOpen(true)
    } else {
      setContacts((prev) => prev.filter((_, i) => i !== index))
    }
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

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      if (deleteTarget.type === 'contact') {
        await fetch(`/api/suppliers/${id}/contacts/${deleteTarget.id}`, {
          method: 'DELETE',
        })
        setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      } else if (deleteTarget.type === 'pricing') {
        await fetch(`/api/suppliers/${id}/pricing/${deleteTarget.id}`, {
          method: 'DELETE',
        })
        setPricings((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deletePricing = (pricing: Pricing) => {
    setDeleteTarget({
      type: 'pricing',
      id: pricing.id,
      name: `${pricing.product.sku} - ${pricing.product.name}`,
    })
    setConfirmOpen(true)
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPricing(true)
    setPricingError(null)

    try {
      const text = await file.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim())

      const skuIndex = headers.indexOf('sku')
      const priceIndex = headers.indexOf('unitprice') !== -1 ? headers.indexOf('unitprice') : headers.indexOf('price')
      const currencyIndex = headers.indexOf('currency')
      const minQtyIndex = headers.indexOf('minqty') !== -1 ? headers.indexOf('minqty') : headers.indexOf('min_qty')

      if (skuIndex === -1 || priceIndex === -1) {
        throw new Error('CSV must have "sku" and "unitPrice" (or "price") columns')
      }

      const csvPricing = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (!values[skuIndex]) continue

        csvPricing.push({
          sku: values[skuIndex],
          unitPrice: parseFloat(values[priceIndex]),
          currency: currencyIndex !== -1 ? values[currencyIndex] || 'INR' : 'INR',
          minQty: minQtyIndex !== -1 && values[minQtyIndex] ? parseInt(values[minQtyIndex]) : undefined,
        })
      }

      const response = await fetch(`/api/suppliers/${id}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvPricing }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload pricing')
      }

      if (result.errors && result.errors.length > 0) {
        setPricingError(`Uploaded ${result.count} items. Errors: ${result.errors.join(', ')}`)
      }

      await fetchSupplier()
    } catch (err: any) {
      setPricingError(err.message)
    } finally {
      setUploadingPricing(false)
      e.target.value = ''
    }
  }

  const downloadCsvTemplate = () => {
    const template = 'sku,unitPrice,currency,minQty\nSKU001,100.00,INR,1\nSKU002,250.50,INR,5'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pricing_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Supplier not found</p>
        <Button className="mt-4" onClick={() => router.push('/suppliers')}>
          Back to Suppliers
        </Button>
      </div>
    )
  }

  const hasErrors = Object.keys(errors).length > 0
  const isFormValid = formData.name.trim().length >= 2 && formData.supplyCategories.length > 0 && !hasErrors

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={`Supplier Code: ${supplier.code}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Suppliers', href: '/suppliers' },
          { label: supplier.code },
        ]}
        actions={
          <div className="flex gap-2">
            <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
              {supplier.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
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
              Update the supplier&apos;s basic details
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => handleFieldChange('bankName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankIfscCode">IFSC Code</Label>
                <Input
                  id="bankIfscCode"
                  value={formData.bankIfscCode}
                  onChange={(e) => handleFieldChange('bankIfscCode', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('bankIfscCode')}
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
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
              Manage contact persons for this supplier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={contact.id || index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Contact {index + 1}
                    {contact.isPrimary && (
                      <Badge variant="secondary" className="ml-2">Primary</Badge>
                    )}
                  </h4>
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

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !isFormValid}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Pricing Catalog */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pricing Catalog</CardTitle>
              <CardDescription>
                Product pricing from this supplier
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
              <label>
                <Button variant="outline" size="sm" asChild disabled={uploadingPricing}>
                  <span className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingPricing ? 'Uploading...' : 'Upload CSV'}
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                  disabled={uploadingPricing}
                />
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pricingError && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md mb-4">
              {pricingError}
            </div>
          )}

          {pricings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pricing data. Upload a CSV to add product pricing.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Min Qty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricings.map((pricing) => (
                    <TableRow key={pricing.id}>
                      <TableCell className="font-mono text-sm">
                        {pricing.product.sku}
                      </TableCell>
                      <TableCell>{pricing.product.name}</TableCell>
                      <TableCell>{pricing.product.unit}</TableCell>
                      <TableCell className="text-right">
                        {pricing.currency} {Number(pricing.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {pricing.minQty || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePricing(pricing)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={deleteTarget?.type === 'contact' ? 'Delete Contact' : 'Delete Pricing'}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
