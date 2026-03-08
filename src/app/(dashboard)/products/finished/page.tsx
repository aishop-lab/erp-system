'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Plus, Search, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FinishedProduct {
  id: string
  parentSku: string
  childSku: string
  title: string
  color: string
  size: string
  costAmount: number
  sellingPrice: number | null
  mrp: number | null
  status: string
  style?: { id: string; styleCode: string; styleName: string } | null
  fabric?: { id: string; fabricSku: string; material: string; color: string } | null
  entity?: { id: string; name: string; code: string } | null
}

export default function FinishedProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { data, isLoading: loading } = useSWR<{ products: FinishedProduct[] }>('/api/product-info/finished')

  const products = data?.products || []

  const filteredProducts = products.filter(
    (product) =>
      product.parentSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.childSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finished Products"
        description="Manage sellable products (Style + Fabric combinations)"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Finished Products' },
        ]}
        actions={
          <Button asChild>
            <Link href="/products/finished/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by SKU or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent SKU</TableHead>
                <TableHead>Child SKU</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Color/Size</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Fabric</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No products match your search' : 'No finished products found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {product.parentSku}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {product.childSku}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{product.title}</TableCell>
                    <TableCell>
                      {product.color} / {product.size}
                    </TableCell>
                    <TableCell>{product.style?.styleCode || '-'}</TableCell>
                    <TableCell>{product.fabric?.fabricSku || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.costAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.mrp)}</TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/products/finished/${product.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
