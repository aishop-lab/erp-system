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

interface Packaging {
  id: string
  pkgSku: string
  pkgType: string
  description: string | null
  channel: string | null
  dimensions: string | null
  measurementUnit: string
  costPerUnit: number
  status: string
  supplier?: { id: string; name: string; code: string } | null
}

export default function PackagingPage() {
  const { data, isLoading } = useSWR('/api/product-info/packaging', (url: string) =>
    fetch(url).then(res => res.json()).then(d => d.packaging as Packaging[]),
    { keepPreviousData: true }
  )
  const packaging = data ?? []
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPackaging = packaging.filter(
    (pkg) =>
      pkg.pkgSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.pkgType.toLowerCase().includes(searchTerm.toLowerCase())
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
        title="Packaging"
        description="Manage packaging materials and supplies"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Packaging' },
        ]}
        actions={
          <Button asChild>
            <Link href="/products/packaging/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Packaging
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search packaging..."
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
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackaging.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No packaging matches your search' : 'No packaging found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPackaging.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {pkg.pkgSku}
                      </code>
                    </TableCell>
                    <TableCell>{pkg.pkgType}</TableCell>
                    <TableCell>{pkg.channel || '-'}</TableCell>
                    <TableCell>{pkg.dimensions || '-'}</TableCell>
                    <TableCell>{pkg.measurementUnit}</TableCell>
                    <TableCell>{pkg.supplier?.name || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(pkg.costPerUnit)}</TableCell>
                    <TableCell>
                      <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                        {pkg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/products/packaging/${pkg.id}`}>
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
