import { NextRequest, NextResponse } from 'next/server'
import { getSalesPlatforms } from '@/services/sales-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const platforms = await getSalesPlatforms(auth.user.tenantId)

    return NextResponse.json(platforms)
  } catch (error: any) {
    console.error('Error fetching sales platforms:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
