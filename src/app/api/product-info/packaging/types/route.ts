import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/packaging/types - Get all unique packaging types
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

    // Get unique packaging types from active packaging items
    const packagingItems = await prisma.packaging.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: 'active',
      },
      select: {
        pkgType: true,
      },
      distinct: ['pkgType'],
    })

    const types = packagingItems
      .map(p => p.pkgType)
      .filter((t): t is string => t !== null && t !== '')
      .sort()

    return NextResponse.json({ types })
  } catch (error) {
    console.error('Error fetching packaging types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packaging types' },
      { status: 500 }
    )
  }
}
