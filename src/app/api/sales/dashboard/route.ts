import { NextRequest, NextResponse } from 'next/server'
import { getSalesDashboard } from '@/services/sales-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const dashboard = await getSalesDashboard(auth.user.tenantId, days)

    return NextResponse.json(dashboard)
  } catch (error: any) {
    console.error('Error fetching sales dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
