'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { MODULE_CONFIG } from '@/lib/constants'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

type PermissionLevel = 'none' | 'view' | 'edit'

interface PermissionState {
  module: string
  subModule: string | null
  permission: PermissionLevel
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    isSuperAdmin: false,
    isActive: true,
    permissions: [] as PermissionState[],
  })

  useEffect(() => {
    if (!authLoading && currentUser?.isSuperAdmin) {
      fetchUser()
    } else if (!authLoading && !currentUser?.isSuperAdmin) {
      setLoading(false)
    }
  }, [id, currentUser, authLoading])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) throw new Error('Failed to fetch user')
      const user = await response.json()

      // Initialize permissions with existing values
      const permissions: PermissionState[] = []
      MODULE_CONFIG.forEach(module => {
        if (module.subModules) {
          module.subModules.forEach(sub => {
            const existing = user.permissions.find(
              (p: any) => p.module === module.module && p.subModule === sub.key
            )
            permissions.push({
              module: module.module,
              subModule: sub.key as string,
              permission: (existing?.permissionLevel || 'none') as PermissionLevel,
            })
          })
        } else {
          const existing = user.permissions.find(
            (p: any) => p.module === module.module && p.subModule === null
          )
          permissions.push({
            module: module.module,
            subModule: null,
            permission: (existing?.permissionLevel || 'none') as PermissionLevel,
          })
        }
      })

      setFormData({
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        permissions,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load user',
        variant: 'destructive',
      })
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (module: string, subModule: string | null, value: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.map(p =>
        p.module === module && p.subModule === subModule
          ? { ...p, permission: value as PermissionLevel }
          : p
      ),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          isSuperAdmin: formData.isSuperAdmin,
          isActive: formData.isActive,
          permissions: formData.permissions,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user')
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      })
      router.push('/admin/users')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
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
            { label: 'Users', href: '/admin/users' },
            { label: id },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit User"
        description="Update user details and permissions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Users', href: '/admin/users' },
          { label: formData.name || id },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>

            {/* Status & Role Toggles */}
            <div className="flex gap-8">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="superAdmin"
                  checked={formData.isSuperAdmin}
                  onCheckedChange={(checked) => setFormData({ ...formData, isSuperAdmin: checked })}
                />
                <Label htmlFor="superAdmin">Super Admin</Label>
              </div>
            </div>

            {/* Permissions Matrix */}
            {!formData.isSuperAdmin && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Module Permissions</h3>
                <div className="border rounded-lg divide-y">
                  {MODULE_CONFIG.map((module) => (
                    <div key={module.module} className="p-4">
                      <div className="font-medium mb-2">{module.label}</div>
                      {module.subModules ? (
                        <div className="space-y-2 pl-4">
                          {module.subModules.map((sub) => (
                            <div key={sub.key} className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">{sub.label}</span>
                              <Select
                                value={formData.permissions.find(
                                  p => p.module === module.module && p.subModule === sub.key
                                )?.permission || 'none'}
                                onValueChange={(value) => handlePermissionChange(module.module, sub.key, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="view">View</SelectItem>
                                  <SelectItem value="edit">Edit</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pl-4">
                          <span className="text-sm text-muted-foreground">Access Level</span>
                          <Select
                            value={formData.permissions.find(
                              p => p.module === module.module && p.subModule === null
                            )?.permission || 'none'}
                            onValueChange={(value) => handlePermissionChange(module.module, null, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push('/admin/users')}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
