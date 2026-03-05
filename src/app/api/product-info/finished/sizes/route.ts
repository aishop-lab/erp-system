import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'

// GET /api/product-info/finished/sizes?styleId=X&color=Y - Get sizes for a style and color
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const styleId = searchParams.get('styleId')
    const color = searchParams.get('color')

    if (!styleId || !color) {
      return NextResponse.json(
        { error: 'Style ID and color are required' },
        { status: 400 }
      )
    }

    const products = await prisma.finishedProduct.findMany({
      where: {
        tenantId: auth.user.tenantId,
        styleId: styleId,
        color: color,
        status: 'active',
      },
      select: {
        size: true,
      },
      distinct: ['size'],
    })

    const sizes = products
      .map(p => p.size)
      .filter((s): s is string => s !== null && s !== '')
      .sort((a, b) => {
        const numA = parseInt(a)
        const numB = parseInt(b)
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB
        if (!isNaN(numA)) return -1
        if (!isNaN(numB)) return 1
        return a.localeCompare(b)
      })

    return cachedJsonResponse({ sizes }, 60)
  } catch (error) {
    console.error('Error fetching sizes:', error)
    return Response.json(
      { error: 'Failed to fetch sizes' },
      { status: 500 }
    )
  }
}
