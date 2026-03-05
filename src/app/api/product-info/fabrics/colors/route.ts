import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/fabrics/colors - Get colors for a given material
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const material = searchParams.get('material')

    if (!material) {
      return NextResponse.json({ error: 'Material parameter is required' }, { status: 400 })
    }

    // Get distinct colors for this material
    const fabrics = await prisma.fabric.findMany({
      where: {
        tenantId: auth.user.tenantId,
        status: 'active',
        material: material,
        color: { not: '' },
      },
      select: { color: true },
      distinct: ['color'],
      orderBy: { color: 'asc' },
    })

    const colors = fabrics
      .map(f => f.color)
      .filter((c): c is string => c !== null && c !== '')
      .sort()

    return cachedJsonResponse({ colors }, 60)
  } catch (error) {
    console.error('Error fetching fabric colors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch colors' },
      { status: 500 }
    )
  }
}
