import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPOForReconciliation } from '@/services/reconciliation-service'

// GET /api/finance/reconciliation/[poId] - Get PO detail for reconciliation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poId: string }> }
) {
  try {
    const { poId } = await params
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

    const po = await getPOForReconciliation(poId, currentUser.tenantId)

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase order not found or not eligible for reconciliation' },
        { status: 404 }
      )
    }

    return NextResponse.json(po)
  } catch (error) {
    console.error('Error fetching PO for reconciliation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase order details' },
      { status: 500 }
    )
  }
}
