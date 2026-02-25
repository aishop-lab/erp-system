// src/app/api/product-info/fabrics/materials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

    // Get all active fabrics - we'll filter materials in JavaScript
    const fabrics = await prisma.fabric.findMany({
      where: {
        tenantId: currentUser.tenantId,
        status: 'active',
      },
      select: { material: true },
      distinct: ['material'],
    })

    // Filter out null/empty materials and get unique values
    const materials = fabrics
      .map(f => f.material)
      .filter((m): m is string => !!m) // Remove null/undefined/empty
      .sort()

    return NextResponse.json({ materials })
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
