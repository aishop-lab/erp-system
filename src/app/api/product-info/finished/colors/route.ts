import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'

// GET /api/product-info/finished/colors?styleId=X - Get colors for a style
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const styleId = searchParams.get('styleId')

    if (!styleId) {
      return NextResponse.json(
        { error: 'Style ID is required' },
        { status: 400 }
      )
    }

    const products = await prisma.finishedProduct.findMany({
      where: {
        tenantId: auth.user.tenantId,
        styleId: styleId,
        status: 'active',
      },
      select: {
        color: true,
      },
      distinct: ['color'],
    })

    const colors = products
      .map(p => p.color)
      .filter((c): c is string => c !== null && c !== '')
      .sort()

    return cachedJsonResponse({ colors }, 60)
  } catch (error) {
    console.error('Error fetching colors:', error)
    return Response.json(
      { error: 'Failed to fetch colors' },
      { status: 500 }
    )
  }
}
