import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/product-info/packaging/dimensions - Get dimensions for a given pkgType + channel
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

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
      { tenantId: auth.user.tenantId },
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

    return cachedJsonResponse({ dimensions }, 60)
  } catch (error) {
    console.error('Error fetching packaging dimensions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dimensions' },
      { status: 500 }
    )
  }
}
