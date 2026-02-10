import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/finished/sizes?styleId=X&color=Y - Get sizes for a style and color
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
    const color = searchParams.get('color')

    if (!styleId || !color) {
      return NextResponse.json(
        { error: 'Style ID and color are required' },
        { status: 400 }
      )
    }

    // Get unique sizes for active finished products with the specified style and color
    const products = await prisma.finishedProduct.findMany({
      where: {
        tenantId: currentUser.tenantId,
        styleId: styleId,
        color: color,
        status: 'active',
      },
      select: {
        size: true,
      },
      distinct: ['size'],
    })

    // Sort sizes in a logical order (numeric first, then alphabetic)
    const sizes = products
      .map(p => p.size)
      .filter((s): s is string => s !== null && s !== '')
      .sort((a, b) => {
        const numA = parseInt(a)
        const numB = parseInt(b)
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB
        }
        if (!isNaN(numA)) return -1
        if (!isNaN(numB)) return 1
        return a.localeCompare(b)
      })

    return NextResponse.json({ sizes })
  } catch (error) {
    console.error('Error fetching sizes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sizes' },
      { status: 500 }
    )
  }
}
