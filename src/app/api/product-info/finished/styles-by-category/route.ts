import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/finished/styles-by-category?category=X - Get styles for a category
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
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // Get styles that have active finished products in the specified category
    const styles = await prisma.style.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: 'active',
        category: category,
        finishedProducts: {
          some: {
            status: 'active',
          },
        },
      },
      select: {
        id: true,
        styleCode: true,
        styleName: true,
      },
      orderBy: { styleName: 'asc' },
    })

    return NextResponse.json({ styles })
  } catch (error) {
    console.error('Error fetching styles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch styles' },
      { status: 500 }
    )
  }
}
