'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { SalesChannelsTab } from '@/components/settings/SalesChannelsTab'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function SalesChannelsSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/me')
        if (!response.ok) {
          router.push('/dashboard')
          return
        }

        const userData = await response.json()
        if (!userData.isSuperAdmin) {
          router.push('/dashboard')
          return
        }

        setAuthorized(true)
      } catch (error) {
        console.error('Error checking access:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Channels"
        description="Manage marketplace sales channels"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Sales Channels' },
        ]}
      />

      <SalesChannelsTab />
    </div>
  )
}
