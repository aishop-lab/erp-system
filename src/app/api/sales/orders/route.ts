import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { getSalesOrders } from '@/services/sales-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)

    const result = await getSalesOrders({
      tenantId: auth.user.tenantId,
      status: searchParams.get('status') || undefined,
      platformId: searchParams.get('platformId') || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20') || 20)),
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching sales orders:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
