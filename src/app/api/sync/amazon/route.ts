import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { syncAmazonOrders } from '@/lib/amazon/orders'
import { syncFbaInventory } from '@/lib/amazon/inventory'

type SyncType = 'inventory' | 'orders' | 'all'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const syncType: SyncType = body.syncType || 'all'
    const daysBack = body.options?.daysBack || 7
    const results: Record<string, any> = {}

    if (syncType === 'orders' || syncType === 'all') {
      results.orders = await syncAmazonOrders(currentUser.tenantId, daysBack)
    }

    if (syncType === 'inventory' || syncType === 'all') {
      results.inventory = await syncFbaInventory(currentUser.tenantId)
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Amazon sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
