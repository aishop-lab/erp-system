import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/fabrics/works - Get works for a given material + color + design
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
    const material = searchParams.get('material')
    const color = searchParams.get('color')
    const design = searchParams.get('design')

    console.log('Fetching works for:', { material, color, design })

    // Build where clause with proper NULL handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      tenantId: currentUser.tenantId,
      status: 'active',
    }

    if (material) whereClause.material = material
    if (color) whereClause.color = color

    // "None" is stored as string in database, not NULL - pass as-is
    if (design) whereClause.design = design

    console.log('Where clause:', whereClause)

    // Get all fabrics matching material + color + design
    const fabrics = await prisma.fabric.findMany({
      where: whereClause,
      select: { work: true },
      distinct: ['work'],
    })

    console.log(`Found ${fabrics.length} distinct works`)

    // Return values as-is, deduplicate, and sort
    const works = fabrics
      .map(f => f.work)
      .filter((v): v is string => !!v)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()

    console.log('Works:', works)

    return NextResponse.json({ works })
  } catch (error) {
    console.error('Error fetching works:', error)
    return NextResponse.json(
      { error: 'Failed to fetch works' },
      { status: 500 }
    )
  }
}
