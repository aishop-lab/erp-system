import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/fabrics/works - Get works for a given material + color + design
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const material = searchParams.get('material')
    const color = searchParams.get('color')
    const design = searchParams.get('design')

    // Build where clause with proper NULL handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      tenantId: auth.user.tenantId,
      status: 'active',
    }

    if (material) whereClause.material = material
    if (color) whereClause.color = color

    // "None" is stored as string in database, not NULL - pass as-is
    if (design) whereClause.design = design

    // Get all fabrics matching material + color + design
    const fabrics = await prisma.fabric.findMany({
      where: whereClause,
      select: { work: true },
      distinct: ['work'],
    })

    // Return values as-is, deduplicate, and sort
    const works = fabrics
      .map(f => f.work)
      .filter((v): v is string => !!v)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()

    return cachedJsonResponse({ works }, 60)
  } catch (error) {
    console.error('Error fetching works:', error)
    return NextResponse.json(
      { error: 'Failed to fetch works' },
      { status: 500 }
    )
  }
}
