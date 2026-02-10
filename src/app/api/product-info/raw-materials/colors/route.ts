import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/raw-materials/colors - Get colors for a given rmType
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
    const rmType = searchParams.get('rmType')

    if (!rmType) {
      return NextResponse.json(
        { error: 'rmType parameter is required' },
        { status: 400 }
      )
    }

    // Get unique colors for the given raw material type
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: 'active',
        rmType: rmType,
      },
      select: {
        color: true,
      },
      distinct: ['color'],
    })

    // Check if any raw materials have null/empty color
    const hasNullOrEmptyColor = rawMaterials.some(r => r.color === null || r.color === '')

    const colors = rawMaterials
      .map(r => r.color)
      .filter((c): c is string => c !== null && c !== '')
      .sort()

    // Add "None" option if there are raw materials with null/empty color
    if (hasNullOrEmptyColor || colors.length === 0) {
      colors.unshift('None') // Add at beginning
    }

    return NextResponse.json({ colors })
  } catch (error) {
    console.error('Error fetching raw material colors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch colors' },
      { status: 500 }
    )
  }
}
