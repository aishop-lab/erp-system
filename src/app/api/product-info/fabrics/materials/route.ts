// src/app/api/product-info/fabrics/materials/route.ts
import { NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Get all active fabrics - we'll filter materials in JavaScript
    const fabrics = await prisma.fabric.findMany({
      where: {
        tenantId: auth.user.tenantId,
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

    return cachedJsonResponse({ materials }, 60)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
