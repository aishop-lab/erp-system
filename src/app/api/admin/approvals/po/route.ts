import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/approvals/po - Get pending PO approvals
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Only super admins can view approvals
    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pendingPOs = await prisma.purchaseOrder.findMany({
      where: {
        tenantId: auth.user.tenantId,
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
