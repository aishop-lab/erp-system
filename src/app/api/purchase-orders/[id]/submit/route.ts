import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { submitForApproval } from '@/services/po-service'

// POST /api/purchase-orders/[id]/submit - Submit PO for approval
export async function POST(
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

    const updatedPO = await submitForApproval(id, currentUser.tenantId)

    return NextResponse.json(updatedPO)
  } catch (error: any) {
    console.error('Error submitting purchase order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit purchase order' },
      { status: 400 }
    )
  }
}
