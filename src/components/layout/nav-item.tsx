'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemProps {
  title: string
  href: string
  icon?: LucideIcon
  children?: {
    title: string
    href: string
  }[]
  collapsed?: boolean
  expanded?: boolean
  onToggle?: () => void
}

export function NavItem({
  title,
  href,
  icon: Icon,
  children,
  collapsed,
  expanded,
  onToggle,
}: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  const hasChildren = children && children.length > 0

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-4 w-4" />}
            {!collapsed && <span>{title}</span>}
          </div>
          {!collapsed &&
            (expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ))}
        </button>
        {!collapsed && expanded && (
          <div className="mt-1 space-y-1 pl-8">
            {children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  pathname === child.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {child.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {!collapsed && <span>{title}</span>}
    </Link>
  )
}
