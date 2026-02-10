import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/finished/colors?styleId=X - Get colors for a style
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
    const styleId = searchParams.get('styleId')

    if (!styleId) {
      return NextResponse.json(
        { error: 'Style ID is required' },
        { status: 400 }
      )
    }

    // Get unique colors for active finished products with the specified style
    const products = await prisma.finishedProduct.findMany({
      where: {
        tenantId: currentUser.tenantId,
        styleId: styleId,
        status: 'active',
      },
      select: {
        color: true,
      },
      distinct: ['color'],
    })

    const colors = products
      .map(p => p.color)
      .filter((c): c is string => c !== null && c !== '')
      .sort()

    return NextResponse.json({ colors })
  } catch (error) {
    console.error('Error fetching colors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch colors' },
      { status: 500 }
    )
  }
}
