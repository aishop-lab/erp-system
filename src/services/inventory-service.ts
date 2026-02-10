import { prisma } from '@/lib/prisma'
import { MovementType } from '@prisma/client'

export async function getInventoryStock(tenantId: string, params?: {
  search?: string
  page?: number
  pageSize?: number
}) {
  const { search, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { sku: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        inventoryBatches: {
          select: {
            quantity: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  const stockData = products.map((product) => ({
    ...product,
    totalStock: product.inventoryBatches.reduce((sum, batch) => sum + batch.quantity, 0),
  }))

  return {
    data: stockData,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getStockLedger(tenantId: string, params?: {
  productId?: string
  movementType?: MovementType
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
        product: true,
        inventoryBatch: true,
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
