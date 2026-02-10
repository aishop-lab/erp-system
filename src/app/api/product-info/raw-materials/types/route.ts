import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/raw-materials/types - Get all unique raw material types
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

    // Get unique raw material types from active raw materials
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: 'active',
      },
      select: {
        rmType: true,
      },
      distinct: ['rmType'],
    })

    const types = rawMaterials
      .map(r => r.rmType)
      .filter((t): t is string => t !== null && t !== '')
      .sort()

    return NextResponse.json({ types })
  } catch (error) {
    console.error('Error fetching raw material types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw material types' },
      { status: 500 }
    )
  }
}
