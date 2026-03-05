import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { syncShopifyOrders } from '@/lib/shopify/orders'
import { syncShopifyInventory } from '@/lib/shopify/inventory'

export const maxDuration = 300

/**
 * POST /api/sync/shopify
 * Manual trigger for Shopify sync.
 * Body: { syncType: 'orders' | 'inventory' | 'all', daysBack?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
      select: { tenantId: true },
    })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const syncType = body.syncType || 'all'
    const daysBack = body.daysBack ?? 7

    const results: any[] = []

    if (syncType === 'orders' || syncType === 'all') {
      try {
        const result = await syncShopifyOrders(currentUser.tenantId, daysBack)
        results.push({ type: 'orders', ...result })
      } catch (err: any) {
        results.push({ type: 'orders', status: 'failed', errorMessage: err.message })
      }
    }

    if (syncType === 'inventory' || syncType === 'all') {
      try {
        const result = await syncShopifyInventory(currentUser.tenantId)
        results.push({ type: 'inventory', ...result })
      } catch (err: any) {
        results.push({ type: 'inventory', status: 'failed', errorMessage: err.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Shopify sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
