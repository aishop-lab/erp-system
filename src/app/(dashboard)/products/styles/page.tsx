'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Plus, Search, Pencil, RotateCcw } from 'lucide-react'
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

interface Style {
  id: string
  styleCode: string
  styleName: string
  gender: string | null
  category: string | null
  status: string
}

export default function StylesPage() {
  const { data, isLoading } = useSWR('/api/product-info/styles', (url: string) =>
    fetch(url).then(res => res.json()).then(d => d.styles as Style[]),
    { keepPreviousData: true }
  )
  const styles = data ?? []
  const [searchTerm, setSearchTerm] = useState('')

  const filteredStyles = styles.filter(
    (style) =>
      style.styleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.styleCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Style Library"
        description="Manage reusable style templates with measurements"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Styles' },
        ]}
        actions={
          <Button asChild>
            <Link href="/products/styles/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Style
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search styles..."
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
                <TableHead>Style Code</TableHead>
                <TableHead>Style Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStyles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No styles match your search' : 'No styles found. Create your first style.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStyles.map((style) => (
                  <TableRow key={style.id}>
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {style.styleCode}
                      </code>
                    </TableCell>
                    <TableCell>{style.styleName}</TableCell>
                    <TableCell>{style.gender || '-'}</TableCell>
                    <TableCell>{style.category || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={style.status === 'active' ? 'default' : 'secondary'}>
                        {style.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/products/styles/${style.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
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
