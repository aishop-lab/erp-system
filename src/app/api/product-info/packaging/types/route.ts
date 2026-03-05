import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/packaging/types - Get all unique packaging types
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Get unique packaging types from active packaging items
    const packagingItems = await prisma.packaging.findMany({
      where: {
        tenantId: auth.user.tenantId,
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

    return cachedJsonResponse({ types }, 60)
  } catch (error) {
    console.error('Error fetching packaging types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packaging types' },
      { status: 500 }
    )
  }
}
