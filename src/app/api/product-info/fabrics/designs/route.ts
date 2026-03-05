import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/fabrics/designs - Get designs for a given material + color
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const material = searchParams.get('material')
    const color = searchParams.get('color')

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      tenantId: auth.user.tenantId,
      status: 'active',
    }

    if (material) whereClause.material = material
    if (color) whereClause.color = color

    // Get all fabrics matching material + color
    const fabrics = await prisma.fabric.findMany({
      where: whereClause,
      select: { design: true },
      distinct: ['design'],
    })

    // Return values as-is, deduplicate, and sort
    const designs = fabrics
      .map(f => f.design)
      .filter((v): v is string => !!v)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()

    return cachedJsonResponse({ designs }, 60)
  } catch (error) {
    console.error('Error fetching designs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch designs' },
      { status: 500 }
    )
  }
}
