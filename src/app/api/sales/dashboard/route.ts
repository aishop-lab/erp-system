import { NextRequest, NextResponse } from 'next/server'
import { getSalesDashboard } from '@/services/sales-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const dashboard = await getSalesDashboard(auth.user.tenantId, { startDate, endDate })

    return NextResponse.json(dashboard)
  } catch (error: any) {
    console.error('Error fetching sales dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
