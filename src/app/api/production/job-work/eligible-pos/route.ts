import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getEligiblePOsForRMIssuance } from '@/services/production-service'

// GET /api/production/job-work/eligible-pos
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

    const data = await getEligiblePOsForRMIssuance(currentUser.tenantId)
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching eligible POs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible POs' },
      { status: 500 }
    )
  }
}
