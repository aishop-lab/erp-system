'use client'

import { useState, useEffect, useMemo } from 'react'
import { Check, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { PurchaseType } from '@/types/enums'

// ============================================
// Types
// ============================================

interface Style {
  id: string
  styleCode: string
  styleName: string
}

interface ProductDetails {
  id: string
  childSku: string
  parentSku: string
  title: string
  color: string
  size: string
  costPrice: number
  gstPct: number
  style: {
    id: string
    styleCode: string
    styleName: string
    category: string | null
  }
}

interface FabricDetails {
  id: string
  fabricSku: string
  material: string
  color: string
  design: string | null
  work: string | null
  costPrice: number
  gstPct: number
  hsnCode: string | null
  uom: string
}

interface RawMaterialDetails {
  id: string
  rmSku: string
  rmType: string
  color: string | null
  measurementUnit: string
  unitsPerQuantity: number
  costPrice: number
  gstPct: number
  hsnCode: string | null
}

interface PackagingDetails {
  id: string
  pkgSku: string
  pkgType: string
  description: string | null
  channel: string | null
  dimensions: string | null
  measurementUnit: string
  unitsPerQuantity: number
  costPrice: number
  gstPct: number
  hsnCode: string | null
}

interface SupplierPricing {
  unitPrice: number | null
  jobWorkRate: number | null
  directPurchaseRate: number | null
  minQty: number | null
  validFrom: string | null
  validTo: string | null
}

interface AddLineItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseType: PurchaseType
  supplierId?: string
  supplierCode?: string
  rawMaterialMode?: string
  onAdd: (lineItem: {
    productId: string
    sku: string
    title: string
    quantity: number
    unitPrice: number
    taxRate: number
    uom: string
  }) => void
}

interface SearchableDropdownProps {
  label: string
  placeholder: string
  disabledPlaceholder?: string
  options: { value: string; label: string; subtitle?: string }[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  loading?: boolean
}

// ============================================
// SearchableDropdown Component
// ============================================

function SearchableDropdown({
  label,
  placeholder,
  disabledPlaceholder,
  options,
  value,
  onChange,
  disabled,
  loading,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const searchLower = search.toLowerCase()
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(searchLower) ||
        opt.subtitle?.toLowerCase().includes(searchLower)
    )
  }, [options, search])

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          onClick={() => !disabled && !loading && setOpen(!open)}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : disabled ? (
            <span className="text-muted-foreground">{disabledPlaceholder || placeholder}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg">
              <div className="p-2 border-b">
                <Input
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8"
                  autoFocus
                />
              </div>
              <div className="max-h-[200px] overflow-auto p-1">
                {filteredOptions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No results found
                  </p>
                ) : (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        'w-full flex items-center px-2 py-1.5 text-sm rounded-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                        value === opt.value && 'bg-accent'
                      )}
                      onClick={() => {
                        onChange(opt.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          value === opt.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col items-start">
                        <span>{opt.label}</span>
                        {opt.subtitle && (
                          <span className="text-xs text-muted-foreground">
                            {opt.subtitle}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// Main Dialog Component
// ============================================

export function AddLineItemDialog({
  open,
  onOpenChange,
  purchaseType,
  supplierId,
  supplierCode,
  rawMaterialMode,
  onAdd,
}: AddLineItemDialogProps) {
  // Common state
  const [quantity, setQuantity] = useState(1)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [supplierPricing, setSupplierPricing] = useState<SupplierPricing | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)

  // Finished Products state
  const [categories, setCategories] = useState<string[]>([])
  const [styles, setStyles] = useState<Style[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStyleId, setSelectedStyleId] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)

  // Fabric state
  const [materials, setMaterials] = useState<string[]>([])
  const [fabricColors, setFabricColors] = useState<string[]>([])
  const [designs, setDesigns] = useState<string[]>([])
  const [works, setWorks] = useState<string[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedFabricColor, setSelectedFabricColor] = useState('')
  const [selectedDesign, setSelectedDesign] = useState('')
  const [selectedWork, setSelectedWork] = useState('')
  const [fabricDetails, setFabricDetails] = useState<FabricDetails | null>(null)

  // Raw Material state
  const [rmTypes, setRmTypes] = useState<string[]>([])
  const [rmColors, setRmColors] = useState<string[]>([])
  const [selectedRmType, setSelectedRmType] = useState('')
  const [selectedRmColor, setSelectedRmColor] = useState('')
  const [rawMaterialDetails, setRawMaterialDetails] = useState<RawMaterialDetails | null>(null)

  // Packaging state
  const [pkgTypes, setPkgTypes] = useState<string[]>([])
  const [channels, setChannels] = useState<string[]>([])
  const [dimensions, setDimensions] = useState<string[]>([])
  const [selectedPkgType, setSelectedPkgType] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('')
  const [selectedDimensions, setSelectedDimensions] = useState('')
  const [packagingDetails, setPackagingDetails] = useState<PackagingDetails | null>(null)

  // Loading states
  const [loadingFirst, setLoadingFirst] = useState(false)
  const [loadingSecond, setLoadingSecond] = useState(false)
  const [loadingThird, setLoadingThird] = useState(false)
  const [loadingFourth, setLoadingFourth] = useState(false)

  // ============================================
  // Effects for Finished Products
  // ============================================

  useEffect(() => {
    if (open && isFinishedType()) {
      loadCategories()
    } else if (!open) {
      resetForm()
    }
  }, [open, purchaseType])

  useEffect(() => {
    if (isFinishedType() && selectedCategory) {
      loadStyles(selectedCategory)
    } else if (isFinishedType()) {
      setStyles([])
    }
    setSelectedStyleId('')
    setSelectedColor('')
    setSelectedSize('')
    setProductDetails(null)
    setSupplierPricing(null)
  }, [selectedCategory])

  useEffect(() => {
    if (isFinishedType() && selectedStyleId) {
      loadColors(selectedStyleId)
    } else if (isFinishedType()) {
      setColors([])
    }
    setSelectedColor('')
    setSelectedSize('')
    setProductDetails(null)
    setSupplierPricing(null)
  }, [selectedStyleId])

  useEffect(() => {
    if (isFinishedType() && selectedStyleId && selectedColor) {
      loadSizes(selectedStyleId, selectedColor)
    } else if (isFinishedType()) {
      setSizes([])
    }
    setSelectedSize('')
    setProductDetails(null)
    setSupplierPricing(null)
  }, [selectedStyleId, selectedColor])

  useEffect(() => {
    if (isFinishedType() && selectedStyleId && selectedColor && selectedSize) {
      loadProductDetails(selectedStyleId, selectedColor, selectedSize)
    } else if (isFinishedType()) {
      setProductDetails(null)
      setSupplierPricing(null)
    }
  }, [selectedStyleId, selectedColor, selectedSize, supplierId])

  // ============================================
  // Effects for Fabrics
  // ============================================

  useEffect(() => {
    if (open && purchaseType === PurchaseType.FABRIC) {
      loadMaterials()
    }
  }, [open, purchaseType])

  useEffect(() => {
    if (purchaseType === PurchaseType.FABRIC && selectedMaterial) {
      loadFabricColors(selectedMaterial)
    } else if (purchaseType === PurchaseType.FABRIC) {
      setFabricColors([])
    }
    setSelectedFabricColor('')
    setSelectedDesign('')
    setSelectedWork('')
    setFabricDetails(null)
    setSupplierPricing(null)
  }, [selectedMaterial])

  useEffect(() => {
    if (purchaseType === PurchaseType.FABRIC && selectedMaterial && selectedFabricColor) {
      loadDesigns(selectedMaterial, selectedFabricColor)
    } else if (purchaseType === PurchaseType.FABRIC) {
      setDesigns([])
    }
    setSelectedDesign('')
    setSelectedWork('')
    setFabricDetails(null)
    setSupplierPricing(null)
  }, [selectedMaterial, selectedFabricColor])

  useEffect(() => {
    if (purchaseType === PurchaseType.FABRIC && selectedMaterial && selectedFabricColor && selectedDesign) {
      loadWorks(selectedMaterial, selectedFabricColor, selectedDesign)
    } else if (purchaseType === PurchaseType.FABRIC) {
      setWorks([])
    }
    setSelectedWork('')
    setFabricDetails(null)
    setSupplierPricing(null)
  }, [selectedMaterial, selectedFabricColor, selectedDesign])

  useEffect(() => {
    if (purchaseType === PurchaseType.FABRIC && selectedMaterial && selectedFabricColor && selectedDesign && selectedWork) {
      loadFabricDetails()
    } else if (purchaseType === PurchaseType.FABRIC) {
      setFabricDetails(null)
      setSupplierPricing(null)
    }
  }, [selectedMaterial, selectedFabricColor, selectedDesign, selectedWork, supplierId])

  // ============================================
  // Effects for Raw Materials
  // ============================================

  useEffect(() => {
    if (open && purchaseType === PurchaseType.RAW_MATERIAL) {
      loadRmTypes()
    }
  }, [open, purchaseType])

  useEffect(() => {
    if (purchaseType === PurchaseType.RAW_MATERIAL && selectedRmType) {
      loadRmColors(selectedRmType)
    } else if (purchaseType === PurchaseType.RAW_MATERIAL) {
      setRmColors([])
    }
    setSelectedRmColor('')
    setRawMaterialDetails(null)
    setSupplierPricing(null)
  }, [selectedRmType])

  useEffect(() => {
    if (purchaseType === PurchaseType.RAW_MATERIAL && selectedRmType && selectedRmColor) {
      loadRawMaterialDetails()
    } else if (purchaseType === PurchaseType.RAW_MATERIAL) {
      setRawMaterialDetails(null)
      setSupplierPricing(null)
    }
  }, [selectedRmType, selectedRmColor, supplierId])

  // ============================================
  // Effects for Packaging
  // ============================================

  useEffect(() => {
    if (open && purchaseType === PurchaseType.PACKAGING) {
      loadPkgTypes()
    }
  }, [open, purchaseType])

  useEffect(() => {
    if (purchaseType === PurchaseType.PACKAGING && selectedPkgType) {
      loadChannels(selectedPkgType)
    } else if (purchaseType === PurchaseType.PACKAGING) {
      setChannels([])
    }
    setSelectedChannel('')
    setSelectedDimensions('')
    setPackagingDetails(null)
    setSupplierPricing(null)
  }, [selectedPkgType])

  useEffect(() => {
    if (purchaseType === PurchaseType.PACKAGING && selectedPkgType && selectedChannel) {
      loadDimensions(selectedPkgType, selectedChannel)
    } else if (purchaseType === PurchaseType.PACKAGING) {
      setDimensions([])
    }
    setSelectedDimensions('')
    setPackagingDetails(null)
    setSupplierPricing(null)
  }, [selectedPkgType, selectedChannel])

  useEffect(() => {
    if (purchaseType === PurchaseType.PACKAGING && selectedPkgType && selectedChannel && selectedDimensions) {
      loadPackagingDetails()
    } else if (purchaseType === PurchaseType.PACKAGING) {
      setPackagingDetails(null)
      setSupplierPricing(null)
    }
  }, [selectedPkgType, selectedChannel, selectedDimensions, supplierId])

  // ============================================
  // Helper Functions
  // ============================================

  function isFinishedType() {
    return purchaseType === PurchaseType.FINISHED ||
      purchaseType === PurchaseType.SAMPLES ||
      purchaseType === PurchaseType.INFLUENCER_SAMPLES
  }

  function getDialogTitle() {
    switch (purchaseType) {
      case PurchaseType.FABRIC:
        return 'Add Fabric'
      case PurchaseType.RAW_MATERIAL:
        return 'Add Raw Material'
      case PurchaseType.PACKAGING:
        return 'Add Packaging'
      default:
        return 'Add Line Item'
    }
  }

  // ============================================
  // API Loaders - Finished Products
  // ============================================

  async function loadCategories() {
    setLoadingFirst(true)
    try {
      const res = await fetch('/api/product-info/finished/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingFirst(false)
    }
  }

  async function loadStyles(category: string) {
    setLoadingSecond(true)
    try {
      const res = await fetch(
        `/api/product-info/finished/styles-by-category?category=${encodeURIComponent(category)}`
      )
      if (res.ok) {
        const data = await res.json()
        setStyles(data.styles || [])
      }
    } catch (error) {
      console.error('Error loading styles:', error)
    } finally {
      setLoadingSecond(false)
    }
  }

  async function loadColors(styleId: string) {
    setLoadingThird(true)
    try {
      const res = await fetch(
        `/api/product-info/finished/colors?styleId=${styleId}`
      )
      if (res.ok) {
        const data = await res.json()
        setColors(data.colors || [])
      }
    } catch (error) {
      console.error('Error loading colors:', error)
    } finally {
      setLoadingThird(false)
    }
  }

  async function loadSizes(styleId: string, color: string) {
    setLoadingFourth(true)
    try {
      const res = await fetch(
        `/api/product-info/finished/sizes?styleId=${styleId}&color=${encodeURIComponent(color)}`
      )
      if (res.ok) {
        const data = await res.json()
        setSizes(data.sizes || [])
      }
    } catch (error) {
      console.error('Error loading sizes:', error)
    } finally {
      setLoadingFourth(false)
    }
  }

  async function loadProductDetails(styleId: string, color: string, size: string) {
    setLoadingProduct(true)
    setLookupError(null)
    try {
      let url = `/api/product-info/finished/lookup?styleId=${styleId}&color=${encodeURIComponent(color)}&size=${encodeURIComponent(size)}`
      if (supplierId) {
        url += `&supplierId=${supplierId}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (res.ok && data.product) {
        setProductDetails(data.product)
        setSupplierPricing(data.supplierPricing)
        setLookupError(null)
      } else {
        setProductDetails(null)
        setLookupError(data.error || 'Product not found with the selected attributes')
      }
    } catch (error) {
      console.error('Error loading product details:', error)
      setProductDetails(null)
      setLookupError('Failed to load product details')
    } finally {
      setLoadingProduct(false)
    }
  }

  // ============================================
  // API Loaders - Fabrics
  // ============================================

  async function loadMaterials() {
    setLoadingFirst(true)
    try {
      const res = await fetch('/api/product-info/fabrics/materials')
      if (res.ok) {
        const data = await res.json()
        setMaterials(data.materials || [])
      }
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setLoadingFirst(false)
    }
  }

  async function loadFabricColors(material: string) {
    setLoadingSecond(true)
    try {
      const res = await fetch(
        `/api/product-info/fabrics/colors?material=${encodeURIComponent(material)}`
      )
      if (res.ok) {
        const data = await res.json()
        setFabricColors(data.colors || [])
      }
    } catch (error) {
      console.error('Error loading fabric colors:', error)
    } finally {
      setLoadingSecond(false)
    }
  }

  async function loadDesigns(material: string, color: string) {
    setLoadingThird(true)
    try {
      const res = await fetch(
        `/api/product-info/fabrics/designs?material=${encodeURIComponent(material)}&color=${encodeURIComponent(color)}`
      )
      if (res.ok) {
        const data = await res.json()
        setDesigns(data.designs || [])
      }
    } catch (error) {
      console.error('Error loading designs:', error)
    } finally {
      setLoadingThird(false)
    }
  }

  async function loadWorks(material: string, color: string, design: string) {
    setLoadingFourth(true)
    try {
      const res = await fetch(
        `/api/product-info/fabrics/works?material=${encodeURIComponent(material)}&color=${encodeURIComponent(color)}&design=${encodeURIComponent(design)}`
      )
      if (res.ok) {
        const data = await res.json()
        setWorks(data.works || [])
      }
    } catch (error) {
      console.error('Error loading works:', error)
    } finally {
      setLoadingFourth(false)
    }
  }

  async function loadFabricDetails() {
    setLoadingProduct(true)
    setLookupError(null)
    try {
      let url = `/api/product-info/fabrics/lookup?material=${encodeURIComponent(selectedMaterial)}&color=${encodeURIComponent(selectedFabricColor)}&design=${encodeURIComponent(selectedDesign)}&work=${encodeURIComponent(selectedWork)}`
      if (supplierId) {
        url += `&supplierId=${supplierId}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (res.ok && data.fabric) {
        setFabricDetails(data.fabric)
        setSupplierPricing(data.supplierPricing)
        setLookupError(null)
      } else {
        setFabricDetails(null)
        setLookupError(data.error || 'Fabric not found with the selected attributes')
      }
    } catch (error) {
      console.error('Error loading fabric details:', error)
      setFabricDetails(null)
      setLookupError('Failed to load fabric details')
    } finally {
      setLoadingProduct(false)
    }
  }

  // ============================================
  // API Loaders - Raw Materials
  // ============================================

  async function loadRmTypes() {
    setLoadingFirst(true)
    try {
      const res = await fetch('/api/product-info/raw-materials/types')
      if (res.ok) {
        const data = await res.json()
        setRmTypes(data.types || [])
      }
    } catch (error) {
      console.error('Error loading RM types:', error)
    } finally {
      setLoadingFirst(false)
    }
  }

  async function loadRmColors(rmType: string) {
    setLoadingSecond(true)
    try {
      const res = await fetch(
        `/api/product-info/raw-materials/colors?rmType=${encodeURIComponent(rmType)}`
      )
      if (res.ok) {
        const data = await res.json()
        setRmColors(data.colors || [])
      }
    } catch (error) {
      console.error('Error loading RM colors:', error)
    } finally {
      setLoadingSecond(false)
    }
  }

  async function loadRawMaterialDetails() {
    setLoadingProduct(true)
    setLookupError(null)
    try {
      let url = `/api/product-info/raw-materials/lookup?rmType=${encodeURIComponent(selectedRmType)}&color=${encodeURIComponent(selectedRmColor)}`
      if (supplierId) {
        url += `&supplierId=${supplierId}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (res.ok && data.rawMaterial) {
        setRawMaterialDetails(data.rawMaterial)
        setSupplierPricing(data.supplierPricing)
        setLookupError(null)
      } else {
        setRawMaterialDetails(null)
        setLookupError(data.error || 'Raw material not found with the selected attributes')
      }
    } catch (error) {
      console.error('Error loading raw material details:', error)
      setRawMaterialDetails(null)
      setLookupError('Failed to load raw material details')
    } finally {
      setLoadingProduct(false)
    }
  }

  // ============================================
  // API Loaders - Packaging
  // ============================================

  async function loadPkgTypes() {
    setLoadingFirst(true)
    try {
      const res = await fetch('/api/product-info/packaging/types')
      if (res.ok) {
        const data = await res.json()
        setPkgTypes(data.types || [])
      }
    } catch (error) {
      console.error('Error loading packaging types:', error)
    } finally {
      setLoadingFirst(false)
    }
  }

  async function loadChannels(pkgType: string) {
    setLoadingSecond(true)
    try {
      const res = await fetch(
        `/api/product-info/packaging/channels?pkgType=${encodeURIComponent(pkgType)}`
      )
      if (res.ok) {
        const data = await res.json()
        setChannels(data.channels || [])
      }
    } catch (error) {
      console.error('Error loading channels:', error)
    } finally {
      setLoadingSecond(false)
    }
  }

  async function loadDimensions(pkgType: string, channel: string) {
    setLoadingThird(true)
    try {
      const res = await fetch(
        `/api/product-info/packaging/dimensions?pkgType=${encodeURIComponent(pkgType)}&channel=${encodeURIComponent(channel)}`
      )
      if (res.ok) {
        const data = await res.json()
        setDimensions(data.dimensions || [])
      }
    } catch (error) {
      console.error('Error loading dimensions:', error)
    } finally {
      setLoadingThird(false)
    }
  }

  async function loadPackagingDetails() {
    setLoadingProduct(true)
    setLookupError(null)
    try {
      let url = `/api/product-info/packaging/lookup?pkgType=${encodeURIComponent(selectedPkgType)}&channel=${encodeURIComponent(selectedChannel)}&dimensions=${encodeURIComponent(selectedDimensions)}`
      if (supplierId) {
        url += `&supplierId=${supplierId}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (res.ok && data.packaging) {
        setPackagingDetails(data.packaging)
        setSupplierPricing(data.supplierPricing)
        setLookupError(null)
      } else {
        setPackagingDetails(null)
        setLookupError(data.error || 'Packaging not found with the selected attributes')
      }
    } catch (error) {
      console.error('Error loading packaging details:', error)
      setPackagingDetails(null)
      setLookupError('Failed to load packaging details')
    } finally {
      setLoadingProduct(false)
    }
  }

  // ============================================
  // Reset Form
  // ============================================

  function resetForm() {
    // Common
    setQuantity(1)
    setSupplierPricing(null)
    setLookupError(null)

    // Finished
    setSelectedCategory('')
    setSelectedStyleId('')
    setSelectedColor('')
    setSelectedSize('')
    setProductDetails(null)
    setCategories([])
    setStyles([])
    setColors([])
    setSizes([])

    // Fabric
    setSelectedMaterial('')
    setSelectedFabricColor('')
    setSelectedDesign('')
    setSelectedWork('')
    setFabricDetails(null)
    setMaterials([])
    setFabricColors([])
    setDesigns([])
    setWorks([])

    // Raw Material
    setSelectedRmType('')
    setSelectedRmColor('')
    setRawMaterialDetails(null)
    setRmTypes([])
    setRmColors([])

    // Packaging
    setSelectedPkgType('')
    setSelectedChannel('')
    setSelectedDimensions('')
    setPackagingDetails(null)
    setPkgTypes([])
    setChannels([])
    setDimensions([])
  }

  // ============================================
  // Handle Add
  // ============================================

  function handleAdd() {
    if (isFinishedType() && productDetails) {
      let unitPrice = productDetails.costPrice
      if (rawMaterialMode === 'raw_materials_issued' && supplierPricing?.jobWorkRate) {
        unitPrice = supplierPricing.jobWorkRate
      } else if (supplierPricing?.directPurchaseRate) {
        unitPrice = supplierPricing.directPurchaseRate
      } else if (supplierPricing?.unitPrice) {
        unitPrice = supplierPricing.unitPrice
      }
      const lineItem = {
        productId: productDetails.id,
        sku: productDetails.childSku,
        title: productDetails.title,
        quantity,
        unitPrice,
        taxRate: productDetails.gstPct,
        uom: 'Pcs',
      }
      onAdd(lineItem)
    } else if (purchaseType === PurchaseType.FABRIC && fabricDetails) {
      const unitPrice = supplierPricing?.unitPrice ?? fabricDetails.costPrice
      const lineItem = {
        productId: fabricDetails.id,
        sku: fabricDetails.fabricSku,
        title: `${fabricDetails.material} - ${fabricDetails.color}${fabricDetails.design ? ` - ${fabricDetails.design}` : ''}`,
        quantity,
        unitPrice,
        taxRate: fabricDetails.gstPct,
        uom: fabricDetails.uom,
      }
      onAdd(lineItem)
    } else if (purchaseType === PurchaseType.RAW_MATERIAL && rawMaterialDetails) {
      const unitPrice = supplierPricing?.unitPrice ?? rawMaterialDetails.costPrice
      const lineItem = {
        productId: rawMaterialDetails.id,
        sku: rawMaterialDetails.rmSku,
        title: `${rawMaterialDetails.rmType}${rawMaterialDetails.color ? ` - ${rawMaterialDetails.color}` : ''}`,
        quantity,
        unitPrice,
        taxRate: rawMaterialDetails.gstPct,
        uom: rawMaterialDetails.measurementUnit,
      }
      onAdd(lineItem)
    } else if (purchaseType === PurchaseType.PACKAGING && packagingDetails) {
      const unitPrice = supplierPricing?.unitPrice ?? packagingDetails.costPrice
      const lineItem = {
        productId: packagingDetails.id,
        sku: packagingDetails.pkgSku,
        title: packagingDetails.description || `${packagingDetails.pkgType}${packagingDetails.dimensions ? ` - ${packagingDetails.dimensions}` : ''}`,
        quantity,
        unitPrice,
        taxRate: packagingDetails.gstPct,
        uom: packagingDetails.measurementUnit,
      }
      onAdd(lineItem)
    } else {
      console.error('❌ No matching product type or details missing')
    }

    onOpenChange(false)
  }

  // ============================================
  // Check if can add
  // ============================================

  function canAdd() {
    if (loadingProduct) return false
    if (isFinishedType()) return !!productDetails
    if (purchaseType === PurchaseType.FABRIC) return !!fabricDetails
    if (purchaseType === PurchaseType.RAW_MATERIAL) return !!rawMaterialDetails
    if (purchaseType === PurchaseType.PACKAGING) return !!packagingDetails
    return false
  }

  // ============================================
  // Get current details for display
  // ============================================

  function getFinishedUnitPrice(): number {
    if (!productDetails) return 0
    if (rawMaterialMode === 'raw_materials_issued' && supplierPricing?.jobWorkRate) {
      return supplierPricing.jobWorkRate
    }
    if (supplierPricing?.directPurchaseRate) {
      return supplierPricing.directPurchaseRate
    }
    if (supplierPricing?.unitPrice) {
      return supplierPricing.unitPrice
    }
    return productDetails.costPrice
  }

  function getCurrentDetails() {
    if (isFinishedType() && productDetails) {
      return {
        sku: productDetails.childSku,
        unitPrice: getFinishedUnitPrice(),
        gstPct: productDetails.gstPct,
      }
    }
    if (purchaseType === PurchaseType.FABRIC && fabricDetails) {
      return {
        sku: fabricDetails.fabricSku,
        unitPrice: supplierPricing?.unitPrice ?? fabricDetails.costPrice,
        gstPct: fabricDetails.gstPct,
      }
    }
    if (purchaseType === PurchaseType.RAW_MATERIAL && rawMaterialDetails) {
      return {
        sku: rawMaterialDetails.rmSku,
        unitPrice: supplierPricing?.unitPrice ?? rawMaterialDetails.costPrice,
        gstPct: rawMaterialDetails.gstPct,
      }
    }
    if (purchaseType === PurchaseType.PACKAGING && packagingDetails) {
      return {
        sku: packagingDetails.pkgSku,
        unitPrice: supplierPricing?.unitPrice ?? packagingDetails.costPrice,
        gstPct: packagingDetails.gstPct,
      }
    }
    return null
  }

  const details = getCurrentDetails()

  // ============================================
  // Convert data to dropdown options
  // ============================================

  const categoryOptions = categories.map(c => ({ value: c, label: c }))
  const styleOptions = styles.map(s => ({
    value: s.id,
    label: s.styleName,
    subtitle: s.styleCode,
  }))
  const colorOptions = colors.map(c => ({ value: c, label: c }))
  const sizeOptions = sizes.map(s => ({ value: s, label: s }))

  const materialOptions = materials.map(m => ({ value: m, label: m }))
  const fabricColorOptions = fabricColors.map(c => ({ value: c, label: c }))
  const designOptions = designs.map(d => ({ value: d, label: d }))
  const workOptions = works.map(w => ({ value: w, label: w }))

  const rmTypeOptions = rmTypes.map(t => ({ value: t, label: t }))
  const rmColorOptions = rmColors.map(c => ({ value: c, label: c }))

  const pkgTypeOptions = pkgTypes.map(t => ({ value: t, label: t }))
  const channelOptions = channels.map(c => ({ value: c, label: c }))
  const dimensionOptions = dimensions.map(d => ({ value: d, label: d }))

  // ============================================
  // Render
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          {supplierCode && (
            <DialogDescription>
              Vendor: {supplierCode}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Finished Products Flow */}
          {isFinishedType() && (
            <>
              <SearchableDropdown
                label="Category *"
                placeholder="Select category..."
                options={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                loading={loadingFirst}
              />
              <SearchableDropdown
                label="Style *"
                placeholder="Select style..."
                disabledPlaceholder="Select category first"
                options={styleOptions}
                value={selectedStyleId}
                onChange={setSelectedStyleId}
                disabled={!selectedCategory}
                loading={loadingSecond}
              />
              <SearchableDropdown
                label="Color *"
                placeholder="Select color..."
                disabledPlaceholder="Select style first"
                options={colorOptions}
                value={selectedColor}
                onChange={setSelectedColor}
                disabled={!selectedStyleId}
                loading={loadingThird}
              />
              <SearchableDropdown
                label="Size *"
                placeholder="Select size..."
                disabledPlaceholder="Select color first"
                options={sizeOptions}
                value={selectedSize}
                onChange={setSelectedSize}
                disabled={!selectedColor}
                loading={loadingFourth}
              />
            </>
          )}

          {/* Fabric Flow */}
          {purchaseType === PurchaseType.FABRIC && (
            <>
              <SearchableDropdown
                label="Material *"
                placeholder="Select material..."
                options={materialOptions}
                value={selectedMaterial}
                onChange={setSelectedMaterial}
                loading={loadingFirst}
              />
              <SearchableDropdown
                label="Color *"
                placeholder="Select color..."
                disabledPlaceholder="Select material first"
                options={fabricColorOptions}
                value={selectedFabricColor}
                onChange={setSelectedFabricColor}
                disabled={!selectedMaterial}
                loading={loadingSecond}
              />
              <SearchableDropdown
                label="Design"
                placeholder="Select design..."
                disabledPlaceholder="Select color first"
                options={designOptions}
                value={selectedDesign}
                onChange={setSelectedDesign}
                disabled={!selectedFabricColor}
                loading={loadingThird}
              />
              <SearchableDropdown
                label="Work"
                placeholder="Select work..."
                disabledPlaceholder="Select design first"
                options={workOptions}
                value={selectedWork}
                onChange={setSelectedWork}
                disabled={!selectedDesign}
                loading={loadingFourth}
              />
            </>
          )}

          {/* Raw Material Flow */}
          {purchaseType === PurchaseType.RAW_MATERIAL && (
            <>
              <SearchableDropdown
                label="Type *"
                placeholder="Select type..."
                options={rmTypeOptions}
                value={selectedRmType}
                onChange={setSelectedRmType}
                loading={loadingFirst}
              />
              <SearchableDropdown
                label="Color"
                placeholder="Select color..."
                disabledPlaceholder="Select type first"
                options={rmColorOptions}
                value={selectedRmColor}
                onChange={setSelectedRmColor}
                disabled={!selectedRmType}
                loading={loadingSecond}
              />
            </>
          )}

          {/* Packaging Flow */}
          {purchaseType === PurchaseType.PACKAGING && (
            <>
              <SearchableDropdown
                label="Type *"
                placeholder="Select type..."
                options={pkgTypeOptions}
                value={selectedPkgType}
                onChange={setSelectedPkgType}
                loading={loadingFirst}
              />
              <SearchableDropdown
                label="Channel"
                placeholder="Select channel..."
                disabledPlaceholder="Select type first"
                options={channelOptions}
                value={selectedChannel}
                onChange={setSelectedChannel}
                disabled={!selectedPkgType}
                loading={loadingSecond}
              />
              <SearchableDropdown
                label="Dimensions"
                placeholder="Select dimensions..."
                disabledPlaceholder="Select channel first"
                options={dimensionOptions}
                value={selectedDimensions}
                onChange={setSelectedDimensions}
                disabled={!selectedChannel}
                loading={loadingThird}
              />
            </>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Loading Product Details */}
          {loadingProduct && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading details...
              </span>
            </div>
          )}

          {/* Lookup Error */}
          {lookupError && !loadingProduct && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive font-medium">
                {lookupError}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please verify this item exists in your catalog or select different options.
              </p>
            </div>
          )}

          {/* Product Details (shown after all selections) */}
          {details && !loadingProduct && !lookupError && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">SKU:</span>{' '}
                  <span className="font-medium">{details.sku}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Unit Price:</span>{' '}
                  <span className="font-medium">
                    ₹{details.unitPrice.toFixed(2)}
                  </span>
                  {isFinishedType() && supplierPricing && rawMaterialMode === 'raw_materials_issued' && supplierPricing.jobWorkRate && (
                    <span className="ml-2 text-xs text-muted-foreground">(Job Work Rate)</span>
                  )}
                  {isFinishedType() && supplierPricing && rawMaterialMode !== 'raw_materials_issued' && supplierPricing.directPurchaseRate && (
                    <span className="ml-2 text-xs text-muted-foreground">(Direct Purchase Rate)</span>
                  )}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">GST:</span>{' '}
                  <span className="font-medium">{details.gstPct}%</span>
                </p>
              </div>

              {isFinishedType() && supplierPricing && (supplierPricing.directPurchaseRate || supplierPricing.jobWorkRate) && (
                <div className="space-y-1 border-t pt-2">
                  {supplierPricing.directPurchaseRate && (
                    <p className={cn(
                      'text-xs',
                      rawMaterialMode !== 'raw_materials_issued' ? 'text-green-600 font-medium' : 'text-muted-foreground'
                    )}>
                      Direct Purchase: ₹{supplierPricing.directPurchaseRate.toFixed(2)}
                      {rawMaterialMode !== 'raw_materials_issued' && ' (active)'}
                    </p>
                  )}
                  {supplierPricing.jobWorkRate && (
                    <p className={cn(
                      'text-xs',
                      rawMaterialMode === 'raw_materials_issued' ? 'text-green-600 font-medium' : 'text-muted-foreground'
                    )}>
                      Job Work: ₹{supplierPricing.jobWorkRate.toFixed(2)}
                      {rawMaterialMode === 'raw_materials_issued' && ' (active)'}
                    </p>
                  )}
                </div>
              )}

              {supplierPricing && (
                <div className="flex items-center text-sm text-green-600">
                  <Check className="mr-1 h-4 w-4" />
                  Vendor pricing applied
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd()}
          >
            Add Line Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
