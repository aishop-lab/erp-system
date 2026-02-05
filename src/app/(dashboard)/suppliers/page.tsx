'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Power, PowerOff, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface Supplier {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  gstNumber: string | null
  isActive: boolean
  contacts: Array<{
    id: string
    name: string
    isPrimary: boolean
  }>
  _count: {
    pricings: number
  }
}

interface SuppliersResponse {
  data: Supplier[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'activate'
    supplierId: string
    supplierName: string
  } | null>(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('isActive', statusFilter)
      params.append('page', page.toString())
      params.append('pageSize', '10')

      const response = await fetch(`/api/suppliers?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch suppliers')

      const data: SuppliersResponse = await response.json()
      setSuppliers(data.data)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSuppliers()
  }

  const handleStatusChange = async () => {
    if (!confirmAction) return

    try {
      if (confirmAction.type === 'deactivate') {
        await fetch(`/api/suppliers/${confirmAction.supplierId}`, {
          method: 'DELETE',
        })
      } else {
        await fetch(`/api/suppliers/${confirmAction.supplierId}/activate`, {
          method: 'POST',
        })
      }
      fetchSuppliers()
    } catch (error) {
      console.error('Error changing supplier status:', error)
    }
  }

  const getPrimaryContact = (contacts: Supplier['contacts']) => {
    const primary = contacts.find(c => c.isPrimary)
    return primary?.name || contacts[0]?.name || '-'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier directory"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Suppliers' },
        ]}
        actions={
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            placeholder="Search by name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Select value={statusFilter} onValueChange={(value) => {
          setStatusFilter(value)
          setPage(1)
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            <SelectItem value="true">Active Only</SelectItem>
            <SelectItem value="false">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers found"
          description={search || statusFilter !== 'all'
            ? "No suppliers match your search criteria."
            : "Add your first supplier to get started."}
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          action={
            !search && statusFilter === 'all' && (
              <Button asChild>
                <Link href="/suppliers/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono text-sm">
                      {supplier.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{getPrimaryContact(supplier.contacts)}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {supplier.gstNumber || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {supplier._count.pricings} SKUs
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/suppliers/${supplier.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {supplier.isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setConfirmAction({
                                type: 'deactivate',
                                supplierId: supplier.id,
                                supplierName: supplier.name,
                              })
                              setConfirmOpen(true)
                            }}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setConfirmAction({
                                type: 'activate',
                                supplierId: supplier.id,
                                supplierName: supplier.name,
                              })
                              setConfirmOpen(true)
                            }}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {suppliers.length} of {total} suppliers
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction?.type === 'deactivate' ? 'Deactivate Supplier' : 'Activate Supplier'}
        description={
          confirmAction?.type === 'deactivate'
            ? `Are you sure you want to deactivate "${confirmAction?.supplierName}"? They will no longer appear in supplier selection dropdowns.`
            : `Are you sure you want to activate "${confirmAction?.supplierName}"?`
        }
        confirmText={confirmAction?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
        variant={confirmAction?.type === 'deactivate' ? 'destructive' : 'default'}
        onConfirm={handleStatusChange}
      />
    </div>
  )
}
