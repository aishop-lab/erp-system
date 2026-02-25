import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAvailableBatches } from '@/services/production-service'

// GET /api/production/available-batches
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const params = {
      productType: searchParams.get('productType') || undefined,
      productId: searchParams.get('productId') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const data = await getAvailableBatches(currentUser.tenantId, params)
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching available batches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available batches' },
      { status: 500 }
    )
  }
}
