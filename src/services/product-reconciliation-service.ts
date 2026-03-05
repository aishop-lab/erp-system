import { prisma } from '@/lib/prisma'

/**
 * Product Reconciliation Service
 * Links sales order items to FinishedProducts via PlatformMapping (externalSku)
 */

export interface ReconciliationResult {
  totalItems: number
  matched: number
  unmatched: number
  unmatchedSkus: { sku: string; count: number }[]
}

/**
 * Reconcile sales order items with finished products using platform mappings.
 * Looks up each order item's SKU in platform_mappings.externalSku
 * and links it to the corresponding finishedProductId.
 */
export async function reconcileOrderItems(tenantId: string, dryRun = true): Promise<ReconciliationResult> {
  // Get all unlinked order items that have a SKU
  const unlinkedItems = await prisma.salesOrderItem.findMany({
    where: {
      tenantId,
      finishedProductId: null,
      sku: { not: null },
    },
    select: { id: true, sku: true },
  })

  // Get all platform mappings for this tenant
  const mappings = await prisma.platformMapping.findMany({
    where: { tenantId, finishedProductId: { not: null } },
    select: { externalSku: true, finishedProductId: true },
  })

  // Build SKU → finishedProductId lookup
  const skuToProduct = new Map<string, string>()
  for (const m of mappings) {
    if (m.externalSku && m.finishedProductId) {
      skuToProduct.set(m.externalSku, m.finishedProductId)
    }
  }

  let matched = 0
  let unmatched = 0
  const unmatchedSkuCounts = new Map<string, number>()

  for (const item of unlinkedItems) {
    const productId = item.sku ? skuToProduct.get(item.sku) : null

    if (productId) {
      if (!dryRun) {
        await prisma.salesOrderItem.update({
          where: { id: item.id },
          data: { finishedProductId: productId },
        })
      }
      matched++
    } else {
      unmatched++
      if (item.sku) {
        unmatchedSkuCounts.set(item.sku, (unmatchedSkuCounts.get(item.sku) || 0) + 1)
      }
    }
  }

  const unmatchedSkus = Array.from(unmatchedSkuCounts.entries())
    .map(([sku, count]) => ({ sku, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalItems: unlinkedItems.length,
    matched,
    unmatched,
    unmatchedSkus,
  }
}

/**
 * Create platform mappings from a SKU mapping (externalSku → childSku).
 * Used to bulk-import mappings from the master taxonomy.
 */
export async function createPlatformMappings(
  tenantId: string,
  platformId: string,
  mappings: { externalSku: string; childSku: string; asin?: string }[]
): Promise<{ created: number; skipped: number }> {
  let created = 0
  let skipped = 0

  for (const m of mappings) {
    // Find the finished product by childSku
    const product = await prisma.finishedProduct.findFirst({
      where: { tenantId, childSku: m.childSku },
      select: { id: true },
    })

    if (!product) {
      skipped++
      continue
    }

    // Check if mapping already exists
    const existing = await prisma.platformMapping.findFirst({
      where: {
        tenantId,
        platformId,
        finishedProductId: product.id,
      },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.platformMapping.create({
      data: {
        tenantId,
        platformId,
        finishedProductId: product.id,
        externalSku: m.externalSku,
        asin: m.asin || null,
      },
    })
    created++
  }

  return { created, skipped }
}

/**
 * Get reconciliation status for the tenant
 */
export async function getReconciliationStatus(tenantId: string) {
  const [totalItems, linkedItems, totalMappings, totalProducts] = await Promise.all([
    prisma.salesOrderItem.count({ where: { tenantId } }),
    prisma.salesOrderItem.count({ where: { tenantId, finishedProductId: { not: null } } }),
    prisma.platformMapping.count({ where: { tenantId } }),
    prisma.finishedProduct.count({ where: { tenantId } }),
  ])

  return {
    totalOrderItems: totalItems,
    linkedOrderItems: linkedItems,
    unlinkedOrderItems: totalItems - linkedItems,
    linkageRate: totalItems > 0 ? ((linkedItems / totalItems) * 100).toFixed(1) : '0',
    totalPlatformMappings: totalMappings,
    totalFinishedProducts: totalProducts,
  }
}
