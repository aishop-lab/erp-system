'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Eye, MoreHorizontal, FileText, FileCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PO_STATUS_MAP, PURCHASE_TYPE_LABELS } from '@/lib/constants'
import { POStatus, PurchaseType } from '@/types/enums'

interface PurchaseOrder {
  id: string
  poNumber: string
  purchaseType: PurchaseType
  status: POStatus
  supplier: {
    name: string
    code: string
  } | null
  entity: {
    name: string
  }
  totalAmount: number
  grandTotal: number
  createdAt: string
  createdBy: {
    name: string
  }
  _count: {
    lineItems: number
    freeTextItems: number
  }
}

interface POListProps {
  data: PurchaseOrder[]
  loading: boolean
  onRefresh: () => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  onPageChange?: (page: number) => void
  onSearch?: (search: string) => void
  onStatusFilter?: (status: string) => void
  onTypeFilter?: (type: string) => void
}

export function POList({
  data,
  loading,
  onRefresh,
  pagination,
  onPageChange,
  onSearch,
  onStatusFilter,
  onTypeFilter,
}: POListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const handleSearch = (value: string) => {
    setSearch(value)
    onSearch?.(value)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    onStatusFilter?.(value === 'all' ? '' : value)
  }

  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
    onTypeFilter?.(value === 'all' ? '' : value)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) {
      return
    }

    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        onRefresh()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete purchase order')
      }
    } catch (error) {
      console.error('Error deleting PO:', error)
      alert('Failed to delete purchase order')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by PO number..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(PO_STATUS_MAP).map(([status, config]) => (
              <SelectItem key={status} value={status}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(PURCHASE_TYPE_LABELS).map(([type, label]) => (
              <SelectItem key={type} value={type}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No purchase orders found
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((po) => {
                const statusConfig = PO_STATUS_MAP[po.status] || {
                  label: po.status,
                  variant: 'secondary',
                }

                return (
                  <TableRow key={po.id}>
                    <TableCell>
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="font-medium hover:underline"
                      >
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {PURCHASE_TYPE_LABELS[po.purchaseType] || po.purchaseType}
                    </TableCell>
                    <TableCell>
                      {po.supplier ? (
                        <span>{po.supplier.name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{po.entity?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant as any}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(po.grandTotal).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{po.createdBy?.name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(po.createdAt), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/purchase-orders/${po.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          {po.status === POStatus.GOODS_RECEIVED && (
                            <DropdownMenuItem asChild>
                              <Link href={`/finance/reconciliation/${po.id}`}>
                                <FileCheck className="mr-2 h-4 w-4" />
                                Reconcile
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {po.status === POStatus.DRAFT && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/purchase-orders/${po.id}/edit`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(po.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
