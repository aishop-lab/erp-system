'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  Package,
  Warehouse,
  Factory,
  Wallet,
  DollarSign,
  Building2,
  Settings,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePermissions } from '@/hooks/use-permissions'
import { NAVIGATION } from '@/lib/constants'
import type { NavItem } from '@/types'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  Package,
  Warehouse,
  Factory,
  Wallet,
  DollarSign,
  Building2,
  Settings,
  Shield,
  TrendingUp,
}

interface SidebarProps {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const { canView, isSuperAdmin, isLoading } = usePermissions()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href)
        ? prev.filter((item) => item !== href)
        : [...prev, href]
    )
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const canAccessNavItem = (item: NavItem): boolean => {
    // Super admin has access to everything
    if (isSuperAdmin) return true

    // While loading, only show items without permission requirements
    if (isLoading) {
      if (item.superAdminOnly || item.adminOnly || item.module) return false
      return true
    }

    // Super admin only items
    if (item.superAdminOnly) return false
    // Admin only items (also restricted to super admin for now)
    if (item.adminOnly) return false
    // Module permission check
    if (item.module && !canView(item.module, item.subModule)) return false
    return true
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (!canAccessNavItem(item)) return null

    const Icon = item.icon ? iconMap[item.icon] : null
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.href)
    const active = isActive(item.href)

    if (hasChildren) {
      const visibleChildren = item.children?.filter(canAccessNavItem) || []
      if (visibleChildren.length === 0) return null

      return (
        <div key={item.href}>
          <button
            onClick={() => toggleExpand(item.href)}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              depth > 0 && 'pl-8'
            )}
          >
            <div className="flex items-center gap-3">
              {Icon && <Icon className="h-4 w-4" />}
              {!collapsed && <span>{item.title}</span>}
            </div>
            {!collapsed && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>
          {!collapsed && isExpanded && (
            <div className="mt-1 space-y-1">
              {visibleChildren.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          depth > 0 && 'pl-8'
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {!collapsed && <span>{item.title}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold">ERP System</span>
          )}
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-4rem)] py-4">
        <nav className="space-y-1 px-2">
          {NAVIGATION.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>
    </aside>
  )
}
