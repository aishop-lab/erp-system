'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface SalesChannel {
  id: string
  name: string
  code: string
  isActive: boolean
}

export function SalesChannelsTab() {
  const [channels, setChannels] = useState<SalesChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<SalesChannel | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
  })

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/admin/settings/sales-channels')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setChannels(data)
    } catch (error) {
      console.error('Error fetching channels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const url = editingChannel
        ? `/api/admin/settings/sales-channels/${editingChannel.id}`
        : '/api/admin/settings/sales-channels'

      const response = await fetch(url, {
        method: editingChannel ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      setDialogOpen(false)
      setEditingChannel(null)
      setFormData({ name: '', code: '' })
      fetchChannels()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (channel: SalesChannel) => {
    setEditingChannel(channel)
    setFormData({
      name: channel.name,
      code: channel.code,
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this sales channel?')) return

    try {
      const response = await fetch(`/api/admin/settings/sales-channels/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to deactivate')
      fetchChannels()
    } catch (error) {
      console.error('Error deactivating channel:', error)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/settings/sales-channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!response.ok) throw new Error('Failed to activate')
      fetchChannels()
    } catch (error) {
      console.error('Error activating channel:', error)
    }
  }

  const handleAddNew = () => {
    setEditingChannel(null)
    setFormData({ name: '', code: '' })
    setError(null)
    setDialogOpen(true)
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Sales Channels</h2>
          <p className="text-sm text-muted-foreground">
            Manage distribution and sales channels (Amazon, Myntra, etc.)
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Channel
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? 'Edit Sales Channel' : 'Add Sales Channel'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Amazon"
                required
              />
            </div>
            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toLowerCase() })
                }
                placeholder="e.g., amazon"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Unique identifier used in the system
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingChannel ? 'Save Changes' : 'Create Channel'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No sales channels configured. Add your first channel to get started.
                </TableCell>
              </TableRow>
            ) : (
              channels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell className="font-medium">{channel.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {channel.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={channel.isActive ? 'default' : 'secondary'}
                    >
                      {channel.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(channel)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {channel.isActive ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeactivate(channel.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActivate(channel.id)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
