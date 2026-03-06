import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, cachedJsonResponse } from '@/lib/api-auth'
import { cached } from '@/lib/cache'

// GET /api/purchase-orders/under-production
// Returns PO line items where ordered qty > received qty (aggregated by product)
export async function GET() {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const tenantId = auth.user.tenantId

    const data = await cached(`under-production:${tenantId}`, 2 * 60 * 1000, () =>
      fetchUnderProduction(tenantId)
    )

    return cachedJsonResponse({ data }, 60)
  } catch (error) {
    console.error('Error fetching under-production items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch under-production items' },
      { status: 500 }
    )
  }
}

async function fetchUnderProduction(tenantId: string) {
  // Fetch POs that are in production-related statuses
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      tenantId,
      status: {
        in: ['approved', 'partially_received', 'approved_pending_rm_issuance', 'rm_issued_pending_goods'],
      },
    },
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      lineItems: {
        include: {
          grnLineItems: {
            select: { acceptedQty: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Collect all product IDs by type for batch lookup
  const productIdsByType: Record<string, Set<string>> = {
    finished: new Set(),
    fabric: new Set(),
    raw_material: new Set(),
    packaging: new Set(),
  }

  for (const po of pos) {
    for (const li of po.lineItems) {
      if (li.productId && li.productType) {
        const type = li.productType in productIdsByType ? li.productType : 'finished'
        productIdsByType[type]?.add(li.productId)
      }
    }
  }

  // Batch fetch all products at once (instead of N+1 queries)
  const [finishedProducts, fabrics, rawMaterials, packagings] = await Promise.all([
    productIdsByType.finished.size > 0
      ? prisma.finishedProduct.findMany({
          where: { id: { in: Array.from(productIdsByType.finished) } },
          select: { id: true, title: true, childSku: true },
        })
      : [],
    productIdsByType.fabric.size > 0
      ? prisma.fabric.findMany({
          where: { id: { in: Array.from(productIdsByType.fabric) } },
          select: { id: true, material: true, color: true, fabricSku: true },
        })
      : [],
    productIdsByType.raw_material.size > 0
      ? prisma.rawMaterial.findMany({
          where: { id: { in: Array.from(productIdsByType.raw_material) } },
          select: { id: true, rmType: true, color: true, rmSku: true },
        })
      : [],
    productIdsByType.packaging.size > 0
      ? prisma.packaging.findMany({
          where: { id: { in: Array.from(productIdsByType.packaging) } },
          select: { id: true, pkgType: true, dimensions: true, pkgSku: true },
        })
      : [],
  ])

  // Build lookup maps
  const productMap = new Map<string, { name: string; sku: string }>()
  for (const p of finishedProducts) {
    productMap.set(p.id, { name: p.title, sku: p.childSku || p.id })
  }
  for (const p of fabrics) {
    productMap.set(p.id, { name: `${p.material} - ${p.color}`, sku: p.fabricSku || p.id })
  }
  for (const p of rawMaterials) {
    productMap.set(p.id, { name: `${p.rmType}${p.color ? ` - ${p.color}` : ''}`, sku: p.rmSku || p.id })
  }
  for (const p of packagings) {
    productMap.set(p.id, { name: `${p.pkgType}${p.dimensions ? ` (${p.dimensions})` : ''}`, sku: p.pkgSku || p.id })
  }

  // Build items list
  const items: Array<{
    productId: string
    productType: string
    productSku: string
    productName: string
    poNumber: string
    poId: string
    supplierId: string | null
    supplierName: string
    supplierCode: string
    orderedQty: number
    receivedQty: number
    pendingQty: number
    expectedDelivery: string | null
  }> = []

  for (const po of pos) {
    for (const li of po.lineItems) {
      const orderedQty = Number(li.quantity)
      const receivedQty = li.grnLineItems.reduce((sum, g) => sum + g.acceptedQty, 0)
      const pendingQty = orderedQty - receivedQty

      if (pendingQty <= 0) continue

      const product = li.productId ? productMap.get(li.productId) : null

      items.push({
        productId: li.productId || li.id,
        productType: li.productType || 'unknown',
        productSku: product?.sku || li.productId || 'N/A',
        productName: product?.name || 'Unknown Product',
        poNumber: po.poNumber,
        poId: po.id,
        supplierId: po.supplier?.id || null,
        supplierName: po.supplier?.name || 'N/A',
        supplierCode: po.supplier?.code || '',
        orderedQty,
        receivedQty,
        pendingQty,
        expectedDelivery: po.expectedDelivery?.toISOString() || null,
      })
    }
  }

  return items
}
