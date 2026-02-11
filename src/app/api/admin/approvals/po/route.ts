import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/approvals/po - Get pending PO approvals
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

    // Only super admins can view approvals
    if (!currentUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pendingPOs = await prisma.purchaseOrder.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: 'pending_approval',
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            lineItems: true,
            freeTextItems: true,
            refundItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      data: pendingPOs,
      count: pendingPOs.length,
    })
  } catch (error) {
    console.error('Error fetching PO approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PO approvals' },
      { status: 500 }
    )
  }
}
