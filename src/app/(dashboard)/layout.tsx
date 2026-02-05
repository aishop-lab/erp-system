'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
