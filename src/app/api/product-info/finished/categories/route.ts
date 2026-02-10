import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/finished/categories - Get all unique categories
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

    // Get unique categories from styles that have active finished products
    const styles = await prisma.style.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: 'active',
        category: { not: null },
        finishedProducts: {
          some: {
            status: 'active',
          },
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    })

    const categories = styles
      .map(s => s.category)
      .filter((c): c is string => c !== null)
      .sort()

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
