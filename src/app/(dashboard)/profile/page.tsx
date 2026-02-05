'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Eye, EyeOff, Shield } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useAuth } from '@/hooks/use-auth'

interface UserProfile {
  id: string
  email: string
  name: string
  isActive: boolean
  isSuperAdmin: boolean
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)

  // Personal info form
  const [name, setName] = useState('')
  const [personalInfoMessage, setPersonalInfoMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')

      const data = await response.json()
      setUser(data)
      setName(data.name)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setPersonalInfoMessage(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      const data = await response.json()
      setUser(data)
      setPersonalInfoMessage({
        type: 'success',
        text: 'Personal information updated successfully',
      })

      setTimeout(() => setPersonalInfoMessage(null), 3000)
    } catch (error: any) {
      setPersonalInfoMessage({
        type: 'error',
        text: error.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    setPasswordMessage(null)

    // Validation
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'New password and confirm password do not match',
      })
      setChangingPassword(false)
      return
    }

    if (newPassword.length < 12) {
      setPasswordMessage({
        type: 'error',
        text: 'Password must be at least 12 characters long',
      })
      setChangingPassword(false)
      return
    }

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change password')
      }

      setPasswordMessage({
        type: 'success',
        text: 'Password changed successfully',
      })

      // Clear form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => setPasswordMessage(null), 3000)
    } catch (error: any) {
      setPasswordMessage({
        type: 'error',
        text: error.message,
      })
    } finally {
      setChangingPassword(false)
    }
  }

  // Password strength indicators
  const passwordChecks = {
    length: newPassword.length >= 12,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[@$!%*?&#]/.test(newPassword),
  }

  const allPasswordChecks = Object.values(passwordChecks).every(Boolean)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal account settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Profile' },
        ]}
      />

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePersonalInfo} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </div>

            {user?.isSuperAdmin && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Super Admin Account
                </span>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {personalInfoMessage && (
              <Alert variant={personalInfoMessage.type === 'success' ? 'default' : 'destructive'}>
                {personalInfoMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{personalInfoMessage.text}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Password Requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                  <div className={`flex items-center gap-2 ${passwordChecks.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordChecks.length ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    At least 12 characters
                  </div>
                  <div className={`flex items-center gap-2 ${passwordChecks.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordChecks.uppercase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${passwordChecks.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordChecks.lowercase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${passwordChecks.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordChecks.number ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    One number
                  </div>
                  <div className={`flex items-center gap-2 ${passwordChecks.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordChecks.special ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    One special character (@$!%*?&#)
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  changingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  !allPasswordChecks
                }
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>

            {passwordMessage && (
              <Alert variant={passwordMessage.type === 'success' ? 'default' : 'destructive'}>
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{passwordMessage.text}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Account Status</span>
            <Badge variant={user?.isActive ? 'default' : 'destructive'}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Account Created</span>
            <span className="text-sm font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">User ID</span>
            <span className="text-xs font-mono text-muted-foreground">{user?.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
