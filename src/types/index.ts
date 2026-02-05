export * from './enums'
export * from './database'
export * from './api'

// Navigation types
export interface NavItem {
  title: string
  href: string
  icon?: string
  module?: string | null
  subModule?: string
  adminOnly?: boolean
  superAdminOnly?: boolean
  children?: NavItem[]
}

// Auth types
export interface UserPermission {
  module: string
  subModule: string | null
  permissionLevel: 'none' | 'view' | 'edit'
}

export interface AuthUser {
  id: string
  email: string
  name: string
  tenantId: string
  role: string
  isSuperAdmin: boolean
  permissions?: UserPermission[]
}

export interface Session {
  user: AuthUser | null
  isLoading: boolean
  error: Error | null
}

// Permission check types
export interface PermissionCheck {
  module: string
  subModule?: string
  requiredLevel: 'view' | 'edit'
}

// Table types
export interface ColumnDef<T> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
}

// Form types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: { label: string; value: string }[]
}

// Status badge types
export interface StatusConfig {
  label: string
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'
}

export type StatusMap = Record<string, StatusConfig>
