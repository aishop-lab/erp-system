import { NextRequest, NextResponse } from 'next/server'
import { getSalesOrderById } from '@/services/sales-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { id } = await params
    const order = await getSalesOrderById(id, auth.user.tenantId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Error fetching sales order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
