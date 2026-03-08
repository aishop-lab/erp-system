import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { getPOsForReconciliation } from '@/services/reconciliation-service'

export const dynamic = 'force-dynamic'

// GET /api/finance/reconciliation - List POs pending reconciliation
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const params = {
      search: searchParams.get('search') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20') || 20)),
    }

    const result = await getPOsForReconciliation(auth.user.tenantId, params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching POs for reconciliation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    )
  }
}
