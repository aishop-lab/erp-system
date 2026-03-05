import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'

// GET /api/product-info/finished/styles-by-category?category=X - Get styles for a category
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    const styles = await prisma.style.findMany({
      where: {
        tenantId: auth.user.tenantId,
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

    return cachedJsonResponse({ styles }, 60)
  } catch (error) {
    console.error('Error fetching styles:', error)
    return Response.json(
      { error: 'Failed to fetch styles' },
      { status: 500 }
    )
  }
}
