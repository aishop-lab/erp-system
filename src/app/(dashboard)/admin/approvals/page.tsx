'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function ApprovalsPage() {
  const [pendingPOs, setPendingPOs] = useState<number | null>(null)
  const [pendingPayments, setPendingPayments] = useState<number | null>(null)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [poRes, payRes] = await Promise.all([
          fetch('/api/admin/approvals/po'),
          fetch('/api/finance/payments?status=pending_approval'),
        ])

        if (poRes.ok) {
          const poData = await poRes.json()
          setPendingPOs(Array.isArray(poData) ? poData.length : (poData.total ?? 0))
        }

        if (payRes.ok) {
          const payData = await payRes.json()
          setPendingPayments(Array.isArray(payData) ? payData.length : (payData.total ?? 0))
        }
      } catch {
        // Silently fail - show 0 as fallback
        setPendingPOs(0)
        setPendingPayments(0)
      }
    }

    fetchCounts()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and approve pending items"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
          { label: 'Approvals' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/approvals/po">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>PO Approvals</CardTitle>
              <CardDescription>Review purchase order requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingPOs ?? '...'}</p>
              <p className="text-sm text-muted-foreground">Pending approval</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/approvals/payments">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Payment Approvals</CardTitle>
              <CardDescription>Review payment requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingPayments ?? '...'}</p>
              <p className="text-sm text-muted-foreground">Pending approval</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
