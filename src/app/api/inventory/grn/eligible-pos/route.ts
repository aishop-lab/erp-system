import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getEligiblePOs } from '@/services/grn-service'

// GET /api/inventory/grn/eligible-pos - Get POs eligible for GRN creation
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

    const { searchParams } = new URL(request.url)
    const params = {
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    }

    const result = await getEligiblePOs(currentUser.tenantId, params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching eligible POs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible purchase orders' },
      { status: 500 }
    )
  }
}
