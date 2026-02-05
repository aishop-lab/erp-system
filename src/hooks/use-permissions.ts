'use client'

import { useMemo } from 'react'
import { useAuth } from './use-auth'
import { PermissionLevel } from '@/types/enums'

export function usePermissions() {
  const { user, isLoading } = useAuth()

  const permissions = useMemo(() => {
    return user?.permissions || []
  }, [user?.permissions])

  const hasPermission = (module: string, subModule?: string, requiredLevel: 'view' | 'edit' = 'view'): boolean => {
    if (!user) return false

    // Super admins have all permissions
    if (user.isSuperAdmin) return true

    const permission = permissions.find(
      (p) => p.module === module && (subModule ? p.subModule === subModule : p.subModule === null)
    )

    if (!permission) return false

    if (requiredLevel === 'view') {
      return permission.permissionLevel === PermissionLevel.VIEW || permission.permissionLevel === PermissionLevel.EDIT
    }

    return permission.permissionLevel === PermissionLevel.EDIT
  }

  const canView = (module: string, subModule?: string): boolean => {
    return hasPermission(module, subModule, 'view')
  }

  const canEdit = (module: string, subModule?: string): boolean => {
    return hasPermission(module, subModule, 'edit')
  }

  return {
    permissions,
    isLoading,
    hasPermission,
    canView,
    canEdit,
    isSuperAdmin: user?.isSuperAdmin || false,
  }
}
