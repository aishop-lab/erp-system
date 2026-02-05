'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Shield, ShieldOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Permission {
  id: string
  module: string
  subModule: string | null
  permissionLevel: string
}

interface User {
  id: string
  email: string
  name: string
  isSuperAdmin: boolean
  isActive: boolean
  createdAt: string
  permissions: Permission[]
}

export default function UsersPage() {
  const router = useRouter()
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && currentUser?.isSuperAdmin) {
      fetchUsers()
    } else if (!authLoading && !currentUser?.isSuperAdmin) {
      setLoading(false)
    }
  }, [currentUser, authLoading])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (!response.ok) throw new Error('Failed to update user')

      toast({
        title: 'Success',
        description: `User ${currentStatus ? 'deactivated' : 'activated'}`,
      })
      fetchUsers()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    )
  }

  if (!currentUser?.isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Access Denied"
          description="Only Super Admins can access this page"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin' },
            { label: 'Users' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage users and their permissions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Users' },
        ]}
        actions={
          <Button onClick={() => router.push('/admin/users/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          title="No users"
          description="Users will be displayed here once created."
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.isSuperAdmin ? (
                      <Badge className="bg-purple-600">
                        <Shield className="mr-1 h-3 w-3" />
                        Super Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isSuperAdmin ? (
                      <span className="text-sm text-muted-foreground">Full Access</span>
                    ) : (
                      <span className="text-sm">
                        {user.permissions.filter(p => p.permissionLevel !== 'none').length} modules
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/admin/users/${user.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit user permissions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {user.id !== currentUser.id && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={user.isActive ? 'destructive' : 'default'}
                                size="sm"
                                onClick={() => toggleUserStatus(user.id, user.isActive)}
                              >
                                {user.isActive ? (
                                  <ShieldOff className="h-4 w-4" />
                                ) : (
                                  <Shield className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{user.isActive ? 'Deactivate user' : 'Activate user'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
