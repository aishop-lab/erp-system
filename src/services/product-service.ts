import { prisma } from '@/lib/prisma'
import type { CreateProductInput, UpdateProductInput } from '@/validators/product'

export async function getProducts(tenantId: string, params?: {
  search?: string
  categoryId?: string
  page?: number
  pageSize?: number
}) {
  const { search, categoryId, page = 1, pageSize = 10 } = params || {}

  const where = {
    tenantId,
    ...(categoryId && { categoryId }),
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
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  return {
    data: products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getProductById(id: string, tenantId: string) {
  return prisma.product.findFirst({
    where: { id, tenantId },
    include: {
      category: true,
    },
  })
}

export async function createProduct(tenantId: string, data: CreateProductInput) {
  return prisma.product.create({
    data: {
      ...data,
      tenantId,
      gstRate: data.gstRate ? data.gstRate : undefined,
    },
    include: {
      category: true,
    },
  })
}

export async function updateProduct(id: string, tenantId: string, data: UpdateProductInput) {
  const existing = await prisma.product.findFirst({
    where: { id, tenantId },
  })

  if (!existing) {
    throw new Error('Product not found')
  }

  return prisma.product.update({
    where: { id, tenantId },
    data: {
      ...data,
      gstRate: data.gstRate ? data.gstRate : undefined,
    },
    include: {
      category: true,
    },
  })
}

export async function deleteProduct(id: string, tenantId: string) {
  const existing = await prisma.product.findFirst({
    where: { id, tenantId },
  })

  if (!existing) {
    throw new Error('Product not found')
  }

  return prisma.product.delete({
    where: { id, tenantId },
  })
}

export async function getProductCategories(tenantId: string) {
  return prisma.productCategory.findMany({
    where: { tenantId },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  })
}
