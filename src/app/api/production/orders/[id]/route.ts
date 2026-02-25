import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getProductionById } from '@/services/production-service'

// GET /api/production/orders/[id] - Get single production order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const production = await getProductionById(id, currentUser.tenantId)

    if (!production) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 })
    }

    return NextResponse.json(production)
  } catch (error) {
    console.error('Error fetching production order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production order' },
      { status: 500 }
    )
  }
}
