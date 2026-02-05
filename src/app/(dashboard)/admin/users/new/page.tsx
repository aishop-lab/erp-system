'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type PermissionLevel = 'none' | 'view' | 'edit'

interface PermissionState {
  module: string
  subModule: string | null
  permission: PermissionLevel
}

export default function NewUserPage() {
  const router = useRouter()
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const getInitialPermissions = (): PermissionState[] => {
    const permissions: PermissionState[] = []
    MODULE_CONFIG.forEach(module => {
      if (module.subModules) {
        module.subModules.forEach(sub => {
          permissions.push({
            module: module.module,
            subModule: sub.key as string,
            permission: 'none',
          })
        })
      } else {
        permissions.push({
          module: module.module,
          subModule: null,
          permission: 'none',
        })
      }
    })
    return permissions
  }

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    isSuperAdmin: false,
    permissions: getInitialPermissions(),
  })

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
    setLoading(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setTemporaryPassword(data.temporaryPassword)
      setShowPasswordDialog(true)
      toast({
        title: 'Success',
        description: 'User created successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyPassword = () => {
    navigator.clipboard.writeText(temporaryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading) {
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
            { label: 'New' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New User"
        description="Add a new user with permissions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Users', href: '/admin/users' },
          { label: 'New' },
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            {/* Super Admin Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="superAdmin"
                checked={formData.isSuperAdmin}
                onCheckedChange={(checked) => setFormData({ ...formData, isSuperAdmin: checked })}
              />
              <Label htmlFor="superAdmin">Super Admin (Full access to all modules)</Label>
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
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Share the temporary password with the user securely. They should change it on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm text-muted-foreground">Temporary Password</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-lg font-mono">{temporaryPassword}</code>
                <Button size="sm" variant="outline" onClick={copyPassword}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => router.push('/admin/users')}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
