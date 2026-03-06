'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'

interface SyncAction {
  key: string
  title: string
  description: string
  endpoint: string
  method: 'POST'
  body?: Record<string, unknown>
}

const SYNC_ACTIONS: SyncAction[] = [
  {
    key: 'amazon_orders',
    title: 'Amazon Orders',
    description: 'Sync orders from the last 7 days from Amazon SP-API',
    endpoint: '/api/sync/amazon',
    method: 'POST',
    body: { syncType: 'orders', options: { daysBack: 7 } },
  },
  {
    key: 'amazon_orders_30d',
    title: 'Amazon Orders (30 Days)',
    description: 'Deep sync of orders from the last 30 days',
    endpoint: '/api/sync/amazon',
    method: 'POST',
    body: { syncType: 'orders', options: { daysBack: 30 } },
  },
  {
    key: 'amazon_inventory',
    title: 'Amazon FBA Inventory',
    description: 'Sync current FBA fulfillable inventory levels',
    endpoint: '/api/sync/amazon',
    method: 'POST',
    body: { syncType: 'inventory' },
  },
  {
    key: 'amazon_all',
    title: 'Amazon Full Sync',
    description: 'Sync both orders (7 days) and inventory',
    endpoint: '/api/sync/amazon',
    method: 'POST',
    body: { syncType: 'all', options: { daysBack: 7 } },
  },
  {
    key: 'shopify_sync',
    title: 'Shopify Orders & Inventory',
    description: 'Sync orders and inventory from Shopify',
    endpoint: '/api/sync/shopify',
    method: 'POST',
    body: {},
  },
]

interface SyncResult {
  status: 'idle' | 'syncing' | 'success' | 'error'
  message?: string
  timestamp?: string
  details?: Record<string, unknown>
}

export default function SyncPage() {
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({})

  const handleSync = async (action: SyncAction) => {
    setSyncResults(prev => ({
      ...prev,
      [action.key]: { status: 'syncing' },
    }))

    try {
      const res = await fetch(action.endpoint, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      })

      const data = await res.json()

      if (!res.ok) {
        setSyncResults(prev => ({
          ...prev,
          [action.key]: {
            status: 'error',
            message: data.error || 'Sync failed',
            timestamp: new Date().toISOString(),
          },
        }))
        return
      }

      setSyncResults(prev => ({
        ...prev,
        [action.key]: {
          status: 'success',
          message: 'Sync completed successfully',
          timestamp: new Date().toISOString(),
          details: data.results,
        },
      }))
    } catch (error: any) {
      setSyncResults(prev => ({
        ...prev,
        [action.key]: {
          status: 'error',
          message: error.message || 'Network error',
          timestamp: new Date().toISOString(),
        },
      }))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'syncing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const formatDetails = (details: Record<string, unknown> | undefined) => {
    if (!details) return null
    return Object.entries(details).map(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        const d = val as Record<string, unknown>
        return (
          <div key={key} className="text-xs text-muted-foreground">
            <span className="font-medium capitalize">{key}</span>:{' '}
            {d.recordsCreated !== undefined && <span>{String(d.recordsCreated)} created</span>}
            {d.recordsUpdated !== undefined && <span>, {String(d.recordsUpdated)} updated</span>}
            {d.recordsFailed !== undefined && Number(d.recordsFailed) > 0 && (
              <span className="text-red-500">, {String(d.recordsFailed)} failed</span>
            )}
          </div>
        )
      }
      return null
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sync Management"
        description="Manually trigger data sync operations for Amazon and Shopify"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Amazon', href: '/amazon/dashboard' },
          { label: 'Sync' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SYNC_ACTIONS.map((action) => {
          const result = syncResults[action.key] || { status: 'idle' }
          const isSyncing = result.status === 'syncing'

          return (
            <Card key={action.key} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="mt-1">{action.description}</CardDescription>
                  </div>
                  {getStatusIcon(result.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.status !== 'idle' && (
                  <div className="space-y-1">
                    <Badge
                      variant={
                        result.status === 'success' ? 'default' :
                        result.status === 'error' ? 'destructive' : 'secondary'
                      }
                    >
                      {result.status === 'syncing' ? 'Syncing...' :
                       result.status === 'success' ? 'Success' : 'Error'}
                    </Badge>
                    {result.message && (
                      <p className="text-xs text-muted-foreground">{result.message}</p>
                    )}
                    {result.timestamp && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString('en-IN')}
                      </p>
                    )}
                    {result.details && formatDetails(result.details)}
                  </div>
                )}

                <Button
                  onClick={() => handleSync(action)}
                  disabled={isSyncing}
                  className="w-full"
                  variant={result.status === 'error' ? 'destructive' : 'default'}
                >
                  {isSyncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Auto-Sync Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automatic Sync Schedule</CardTitle>
          <CardDescription>These sync jobs run automatically via Vercel Cron</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Amazon Orders</span>
              <span className="text-muted-foreground">Every 4 hours (at :00)</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Amazon FBA Inventory</span>
              <span className="text-muted-foreground">Every 4 hours (at :30)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">Shopify Orders & Inventory</span>
              <span className="text-muted-foreground">Every 4 hours (at :15)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
