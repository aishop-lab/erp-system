import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/product-info/packaging/dimensions - Get dimensions for a given pkgType + channel
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
    const pkgType = searchParams.get('pkgType')
    const channel = searchParams.get('channel')

    if (!pkgType) {
      return NextResponse.json(
        { error: 'pkgType parameter is required' },
        { status: 400 }
      )
    }

    // Build where clause with AND conditions
    const andConditions: Prisma.PackagingWhereInput[] = [
      { tenantId: currentUser.tenantId },
      { status: 'active' },
      { pkgType: pkgType },
    ]

    // Handle channel - 'None' means null or empty string
    if (channel && channel !== 'None') {
      andConditions.push({ channel: channel })
    } else if (channel === 'None') {
      andConditions.push({
        OR: [
          { channel: null },
          { channel: '' },
        ],
      })
    }

    // Get unique dimensions for the given criteria
    const packagingItems = await prisma.packaging.findMany({
      where: {
        AND: andConditions,
      },
      select: {
        dimensions: true,
      },
      distinct: ['dimensions'],
    })

    // Check if any packaging items have null/empty dimensions
    const hasNullOrEmptyDimensions = packagingItems.some(p => p.dimensions === null || p.dimensions === '')

    const dimensions = packagingItems
      .map(p => p.dimensions)
      .filter((d): d is string => d !== null && d !== '')
      .sort()

    // Add "None" option if there are items with null/empty dimensions
    if (hasNullOrEmptyDimensions || dimensions.length === 0) {
      dimensions.unshift('None') // Add at beginning
    }

    return NextResponse.json({ dimensions })
  } catch (error) {
    console.error('Error fetching packaging dimensions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dimensions' },
      { status: 500 }
    )
  }
}
