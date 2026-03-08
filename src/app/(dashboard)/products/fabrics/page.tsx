'use client'

import { useState } from 'react'
import useSWR from 'swr'
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

interface Fabric {
  id: string
  fabricSku: string
  material: string
  color: string
  costAmount: number
  status: string
  supplier?: { id: string; name: string; code: string } | null
}

export default function FabricsPage() {
  const { data, isLoading } = useSWR('/api/product-info/fabrics', (url: string) =>
    fetch(url).then(res => res.json()).then(d => d.fabrics as Fabric[]),
    { keepPreviousData: true }
  )
  const fabrics = data ?? []
  const [searchTerm, setSearchTerm] = useState('')

  const filteredFabrics = fabrics.filter(
    (fabric) =>
      fabric.fabricSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fabric.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fabric.color.toLowerCase().includes(searchTerm.toLowerCase())
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
        title="Fabric Library"
        description="Manage fabric materials and specifications"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Fabrics' },
        ]}
        actions={
          <Button asChild>
            <Link href="/products/fabrics/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Fabric
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search fabrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFabrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No fabrics match your search' : 'No fabrics found. Add your first fabric.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFabrics.map((fabric) => (
                  <TableRow key={fabric.id}>
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {fabric.fabricSku}
                      </code>
                    </TableCell>
                    <TableCell>{fabric.material}</TableCell>
                    <TableCell>{fabric.color}</TableCell>
                    <TableCell>{fabric.supplier?.name || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(fabric.costAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={fabric.status === 'active' ? 'default' : 'secondary'}>
                        {fabric.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/products/fabrics/${fabric.id}`}>
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
