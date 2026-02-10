import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPOForGRN } from '@/services/grn-service'

// GET /api/inventory/grn/po/[poId] - Get PO details for GRN creation
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

    const poData = await getPOForGRN(poId, currentUser.tenantId)

    if (!poData) {
      return NextResponse.json(
        { error: 'Purchase order not found or not eligible for GRN' },
        { status: 404 }
      )
    }

    return NextResponse.json(poData)
  } catch (error) {
    console.error('Error fetching PO for GRN:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase order details' },
      { status: 500 }
    )
  }
}
