import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/packaging/channels - Get channels for a given pkgType
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const pkgType = searchParams.get('pkgType')

    if (!pkgType) {
      return NextResponse.json(
        { error: 'pkgType parameter is required' },
        { status: 400 }
      )
    }

    // Get unique channels for the given packaging type
    const packagingItems = await prisma.packaging.findMany({
      where: {
        tenantId: auth.user.tenantId,
        status: 'active',
        pkgType: pkgType,
      },
      select: {
        channel: true,
      },
      distinct: ['channel'],
    })

    // Check if any packaging items have null/empty channel
    const hasNullOrEmptyChannel = packagingItems.some(p => p.channel === null || p.channel === '')

    const channels = packagingItems
      .map(p => p.channel)
      .filter((c): c is string => c !== null && c !== '')
      .sort()

    // Add "None" option if there are items with null/empty channel
    if (hasNullOrEmptyChannel || channels.length === 0) {
      channels.unshift('None') // Add at beginning
    }

    return cachedJsonResponse({ channels }, 60)
  } catch (error) {
    console.error('Error fetching packaging channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}
