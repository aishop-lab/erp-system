import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/fabrics/colors - Get colors for a given material
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
    const material = searchParams.get('material')

    if (!material) {
      return NextResponse.json({ error: 'Material parameter is required' }, { status: 400 })
    }

    // Get distinct colors for this material
    const fabrics = await prisma.fabric.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: 'active',
        material: material,
        color: { not: '' },
      },
      select: { color: true },
      distinct: ['color'],
      orderBy: { color: 'asc' },
    })

    const colors = fabrics
      .map(f => f.color)
      .filter((c): c is string => c !== null && c !== '')
      .sort()

    return NextResponse.json({ colors })
  } catch (error) {
    console.error('Error fetching fabric colors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch colors' },
      { status: 500 }
    )
  }
}
