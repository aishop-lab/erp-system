import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// GET /api/inventory/stock-ledger
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)

    // Filters
    const productType = searchParams.get('productType') || undefined
    const sku = searchParams.get('sku') || undefined
    const movementType = searchParams.get('movementType') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const search = searchParams.get('search') || undefined

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
      ...(productType && { productType }),
      ...(sku && { sku: { contains: sku, mode: 'insensitive' as const } }),
      ...(movementType && { movementType }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      }),
      ...(search && {
        OR: [
          { sku: { contains: search, mode: 'insensitive' as const } },
          { referenceNumber: { contains: search, mode: 'insensitive' as const } },
          { notes: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [ledgerEntries, total] = await Promise.all([
      prisma.stockLedger.findMany({
        where,
        include: {
          batch: {
            select: {
              batchNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockLedger.count({ where }),
    ])

    return cachedJsonResponse({
      data: ledgerEntries,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }, 30)
  } catch (error) {
    console.error('Error fetching stock ledger:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock ledger' },
      { status: 500 }
    )
  }
}
