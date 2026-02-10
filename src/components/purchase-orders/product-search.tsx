'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  sku: string
  title: string
  gstPct: number
  uom: string
  costPrice: number
  productType: string
}

interface ProductSearchProps {
  productType: 'finished' | 'fabric' | 'raw_material' | 'packaging'
  onSelect: (product: Product) => void
  disabled?: boolean
  placeholder?: string
}

export function ProductSearch({
  productType,
  onSelect,
  disabled,
  placeholder = 'Search products...',
}: ProductSearchProps) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!search || search.length < 2) {
      setProducts([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/product-info/search?type=${productType}&q=${encodeURIComponent(search)}`
        )
        if (res.ok) {
          const data = await res.json()
          setProducts(data.results || [])
          setOpen(true)
        }
      } catch (error) {
        console.error('Error searching products:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, productType])

  const handleSelect = useCallback((product: Product) => {
    onSelect(product)
    setSearch('')
    setProducts([])
    setOpen(false)
  }, [onSelect])

  const handleClear = useCallback(() => {
    setSearch('')
    setProducts([])
    setOpen(false)
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
          onFocus={() => {
            if (products.length > 0) setOpen(true)
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && search && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {open && products.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-[300px] overflow-auto">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left hover:bg-accent transition-colors',
                'flex flex-col gap-0.5 border-b last:border-b-0'
              )}
              onClick={() => handleSelect(product)}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{product.sku}</span>
                <span className="text-xs text-muted-foreground">
                  ₹{product.costPrice.toFixed(2)} / {product.uom}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {product.title}
              </span>
              <span className="text-xs text-muted-foreground">
                GST: {product.gstPct}%
              </span>
            </button>
          ))}
        </div>
      )}

      {open && search.length >= 2 && !loading && products.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
          No products found
        </div>
      )}
    </div>
  )
}
