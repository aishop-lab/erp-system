import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/fabrics/designs - Get designs for a given material + color
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

    console.log('Fetching designs for:', { material, color })

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      tenantId: currentUser.tenantId,
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

    console.log(`Found ${fabrics.length} distinct designs`)

    // Return values as-is, deduplicate, and sort
    const designs = fabrics
      .map(f => f.design)
      .filter((v): v is string => !!v)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()

    console.log('Designs:', designs)

    return NextResponse.json({ designs })
  } catch (error) {
    console.error('Error fetching designs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch designs' },
      { status: 500 }
    )
  }
}
