import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import {
  reconcileOrderItems,
  getReconciliationStatus,
} from '@/services/product-reconciliation-service'

// GET - Get reconciliation status
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const status = await getReconciliationStatus(auth.user.tenantId)
    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Run reconciliation
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const dryRun = body.dryRun !== false

    const result = await reconcileOrderItems(auth.user.tenantId, dryRun)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
