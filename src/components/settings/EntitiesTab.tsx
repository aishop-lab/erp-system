'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, CreditCard, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface PaymentMode {
  id: string
  name: string
  isActive: boolean
}

interface Entity {
  id: string
  name: string
  type: string
  isExternal: boolean
  isActive: boolean
  paymentModes: PaymentMode[]
}

export function EntitiesTab() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [entityDialogOpen, setEntityDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [entityForm, setEntityForm] = useState({
    name: '',
    type: 'in_house' as 'in_house' | 'external',
  })

  const [paymentForm, setPaymentForm] = useState({
    name: '',
  })

  useEffect(() => {
    fetchEntities()
  }, [])

  const fetchEntities = async () => {
    try {
      const response = await fetch('/api/admin/settings/entities')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setEntities(data)
    } catch (error) {
      console.error('Error fetching entities:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (entityId: string) => {
    const newExpanded = new Set(expandedEntities)
    if (newExpanded.has(entityId)) {
      newExpanded.delete(entityId)
    } else {
      newExpanded.add(entityId)
    }
    setExpandedEntities(newExpanded)
  }

  const handleEntitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const url = editingEntity
        ? `/api/admin/settings/entities/${editingEntity.id}`
        : '/api/admin/settings/entities'

      const response = await fetch(url, {
        method: editingEntity ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entityForm,
          isExternal: entityForm.type === 'external',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      setEntityDialogOpen(false)
      setEditingEntity(null)
      setEntityForm({ name: '', type: 'in_house' })
      fetchEntities()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEntity) return
    setError(null)
    setSaving(true)

    try {
      const response = await fetch(
        `/api/admin/settings/entities/${selectedEntity.id}/payment-modes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentForm),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add payment mode')
      }

      setPaymentDialogOpen(false)
      setPaymentForm({ name: '' })
      fetchEntities()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditEntity = (entity: Entity) => {
    setEditingEntity(entity)
    setEntityForm({
      name: entity.name,
      type: entity.type as 'in_house' | 'external',
    })
    setError(null)
    setEntityDialogOpen(true)
  }

  const handleDeactivateEntity = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this entity?')) return

    try {
      const response = await fetch(`/api/admin/settings/entities/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to deactivate')
      fetchEntities()
    } catch (error) {
      console.error('Error deactivating entity:', error)
    }
  }

  const handleActivateEntity = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/settings/entities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!response.ok) throw new Error('Failed to activate')
      fetchEntities()
    } catch (error) {
      console.error('Error activating entity:', error)
    }
  }

  const handleDeletePaymentMode = async (modeId: string) => {
    if (!confirm('Are you sure you want to delete this payment mode?')) return

    try {
      const response = await fetch(`/api/admin/settings/payment-modes/${modeId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      fetchEntities()
    } catch (error) {
      console.error('Error deleting payment mode:', error)
    }
  }

  const handleAddPaymentMode = (entity: Entity) => {
    setSelectedEntity(entity)
    setPaymentForm({ name: '' })
    setError(null)
    setPaymentDialogOpen(true)
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
          <h2 className="text-xl font-semibold">Entities & Payment Modes</h2>
          <p className="text-sm text-muted-foreground">
            Manage business entities (Fulton, Shivaang, etc.) and their payment methods
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingEntity(null)
            setEntityForm({ name: '', type: 'in_house' })
            setError(null)
            setEntityDialogOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entity
        </Button>
      </div>

      {/* Entity Dialog */}
      <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? 'Edit Entity' : 'Add Entity'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEntitySubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="entity-name">Entity Name</Label>
              <Input
                id="entity-name"
                value={entityForm.name}
                onChange={(e) =>
                  setEntityForm({ ...entityForm, name: e.target.value })
                }
                placeholder="e.g., Fulton"
                required
              />
            </div>
            <div>
              <Label htmlFor="entity-type">Type</Label>
              <Select
                value={entityForm.type}
                onValueChange={(value: 'in_house' | 'external') =>
                  setEntityForm({ ...entityForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_house">In-House</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEntityDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingEntity ? 'Save Changes' : 'Create Entity'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Mode Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Payment Mode to {selectedEntity?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="mode-name">Payment Mode Name</Label>
              <Input
                id="mode-name"
                value={paymentForm.name}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, name: e.target.value })
                }
                placeholder="e.g., ICICI Bank Account"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Adding...' : 'Add Payment Mode'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Entities List */}
      <div className="space-y-2">
        {entities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            No entities configured. Add your first entity to get started.
          </div>
        ) : (
          entities.map((entity) => (
            <div
              key={entity.id}
              className="border rounded-lg overflow-hidden"
            >
              {/* Entity Header */}
              <div
                className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpanded(entity.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedEntities.has(entity.id) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold">{entity.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {entity.type === 'in_house' ? 'In-House' : 'External'}
                  </Badge>
                  <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                    {entity.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {entity.paymentModes.length} payment mode(s)
                  </span>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditEntity(entity)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {entity.isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeactivateEntity(entity.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivateEntity(entity.id)}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Modes (Expanded) */}
              {expandedEntities.has(entity.id) && (
                <div className="p-4 border-t">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-sm">Payment Modes</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPaymentMode(entity)}
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      Add Payment Mode
                    </Button>
                  </div>

                  {entity.paymentModes.length > 0 ? (
                    <div className="space-y-2">
                      {entity.paymentModes.map((mode) => (
                        <div
                          key={mode.id}
                          className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{mode.name}</span>
                            <Badge
                              variant={mode.isActive ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {mode.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePaymentMode(mode.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No payment modes configured for this entity
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
