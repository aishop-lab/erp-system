import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/packaging/channels - Get channels for a given pkgType
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

    if (!pkgType) {
      return NextResponse.json(
        { error: 'pkgType parameter is required' },
        { status: 400 }
      )
    }

    // Get unique channels for the given packaging type
    const packagingItems = await prisma.packaging.findMany({
      where: {
        tenantId: currentUser.tenantId,
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

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Error fetching packaging channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}
