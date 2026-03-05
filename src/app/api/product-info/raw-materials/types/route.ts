import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/raw-materials/types - Get all unique raw material types
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Get unique raw material types from active raw materials
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        tenantId: auth.user.tenantId,
        status: 'active',
      },
      select: {
        rmType: true,
      },
      distinct: ['rmType'],
    })

    const types = rawMaterials
      .map(r => r.rmType)
      .filter((t): t is string => t !== null && t !== '')
      .sort()

    return cachedJsonResponse({ types }, 60)
  } catch (error) {
    console.error('Error fetching raw material types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw material types' },
      { status: 500 }
    )
  }
}
