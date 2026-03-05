import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'

// GET /api/product-info/finished/categories - Get all unique categories
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Get unique categories from styles that have active finished products
    const styles = await prisma.style.findMany({
      where: {
        tenantId: auth.user.tenantId,
        status: 'active',
        category: { not: null },
        finishedProducts: {
          some: {
            status: 'active',
          },
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    })

    const categories = styles
      .map(s => s.category)
      .filter((c): c is string => c !== null)
      .sort()

    return cachedJsonResponse({ categories }, 60)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return Response.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
