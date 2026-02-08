'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

interface RawMaterial {
  id: string
  rmSku: string
  rmType: string
  color: string | null
  measurementUnit: string
  costPerSku: number
  status: string
  supplier?: { id: string; name: string; code: string } | null
}

export default function RawMaterialsPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRawMaterials()
  }, [])

  const fetchRawMaterials = async () => {
    try {
      const response = await fetch('/api/product-info/raw-materials')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setRawMaterials(data.rawMaterials)
    } catch (error) {
      console.error('Error fetching raw materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMaterials = rawMaterials.filter(
    (rm) =>
      rm.rmSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rm.rmType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Materials"
        description="Manage production inputs and accessories"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Raw Materials' },
        ]}
        actions={
          <Button asChild>
            <Link href="/products/raw-materials/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Raw Material
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search raw materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No raw materials match your search' : 'No raw materials found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((rm) => (
                  <TableRow key={rm.id}>
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {rm.rmSku}
                      </code>
                    </TableCell>
                    <TableCell>{rm.rmType}</TableCell>
                    <TableCell>{rm.color || '-'}</TableCell>
                    <TableCell>{rm.measurementUnit}</TableCell>
                    <TableCell>{rm.supplier?.name || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rm.costPerSku)}</TableCell>
                    <TableCell>
                      <Badge variant={rm.status === 'active' ? 'default' : 'secondary'}>
                        {rm.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/products/raw-materials/${rm.id}`}>
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
