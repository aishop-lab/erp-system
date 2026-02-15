import { prisma } from '@/lib/prisma'

export async function getInventoryStock(tenantId: string, params?: {
  search?: string
  productType?: string
  page?: number
  pageSize?: number
}) {
  const { search, productType, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    status: 'active',
    ...(productType && { productType }),
    ...(search && {
      OR: [
        { batchNumber: { contains: search, mode: 'insensitive' as const } },
        { sku: { contains: search, mode: 'insensitive' as const } },
        { productId: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [batches, total] = await Promise.all([
    prisma.inventoryBatch.findMany({
      where,
      include: {
        grn: {
          select: { grnNumber: true, poNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryBatch.count({ where }),
  ])

  return {
    data: batches,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getStockLedger(tenantId: string, params?: {
  productId?: string
  movementType?: string
  page?: number
  pageSize?: number
}) {
  const { productId, movementType, page = 1, pageSize = 20 } = params || {}

  const where = {
    tenantId,
    ...(productId && { productId }),
    ...(movementType && { movementType }),
  }

  const [entries, total] = await Promise.all([
    prisma.stockLedger.findMany({
      where,
      include: {
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockLedger.count({ where }),
  ])

  return {
    data: entries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
