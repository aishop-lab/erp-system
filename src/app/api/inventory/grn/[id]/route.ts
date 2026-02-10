import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGRNById } from '@/services/grn-service'

// GET /api/inventory/grn/[id] - Get a single GRN
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const grn = await getGRNById(id, currentUser.tenantId)

    if (!grn) {
      return NextResponse.json(
        { error: 'GRN not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(grn)
  } catch (error) {
    console.error('Error fetching GRN:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GRN' },
      { status: 500 }
    )
  }
}
