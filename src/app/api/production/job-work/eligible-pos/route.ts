import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { getEligiblePOsForRMIssuance } from '@/services/production-service'

// GET /api/production/job-work/eligible-pos
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const data = await getEligiblePOsForRMIssuance(auth.user.tenantId)
    return cachedJsonResponse({ data }, 30)
  } catch (error) {
    console.error('Error fetching eligible POs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible POs' },
      { status: 500 }
    )
  }
}
