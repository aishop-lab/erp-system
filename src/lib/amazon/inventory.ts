import { prisma } from '@/lib/prisma'
import {
  getAmazonClientForTenant,
  getAmazonPlatformId,
  withRateLimitRetry,
  AMAZON_IN_MARKETPLACE_ID,
} from './client'

export interface InventorySyncSummary {
  syncLogId: string
  status: string
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errorMessage: string | null
}

/**
 * Sync FBA inventory from Amazon. Updates warehouse_stocks for the FBA warehouse.
 */
export async function syncFbaInventory(tenantId: string): Promise<InventorySyncSummary> {
  const startedAt = new Date()
  let syncLogId = ''
  let recordsProcessed = 0
  let recordsCreated = 0
  let recordsUpdated = 0
  let recordsFailed = 0

  try {
    const platformId = await getAmazonPlatformId(tenantId)

    const syncLog = await prisma.syncLog.create({
      data: { tenantId, platformId, syncType: 'fba_inventory', status: 'running', startedAt },
    })
    syncLogId = syncLog.id

    // Get or create FBA warehouse
    let fbaWarehouse = await prisma.salesWarehouse.findFirst({
      where: { tenantId, isFba: true },
    })

    if (!fbaWarehouse) {
      fbaWarehouse = await prisma.salesWarehouse.create({
        data: {
          tenantId,
          name: 'Amazon FBA Warehouse',
          code: 'fba',
          isFba: true,
          platformId,
        },
      })
    }

    // Fetch FBA inventory from Amazon
    const amazonClient = await getAmazonClientForTenant(tenantId)
    const inventoryItems = await fetchFbaInventory(amazonClient)

    // Build SKU → finishedProductId lookup from platform_mappings + sales_order_items
    const skuProductMap = new Map<string, string>()
    const mappings = await prisma.platformMapping.findMany({
      where: { tenantId, finishedProductId: { not: null } },
      select: { externalSku: true, asin: true, finishedProductId: true },
    })
    for (const m of mappings) {
      if (m.externalSku && m.finishedProductId) skuProductMap.set(m.externalSku, m.finishedProductId)
      if (m.asin && m.finishedProductId) skuProductMap.set(m.asin, m.finishedProductId)
    }

    // Process each item
    for (const item of inventoryItems) {
      recordsProcessed++
      try {
        const sku = item.sellerSku || item.seller_sku
        const availableQty = item.fulfillableQuantity ?? item.fulfillable_quantity ?? 0
        // Fix #11: Handle both camelCase and snake_case for reservedQuantity
        const reservedObj = item.reservedQuantity || item.reserved_quantity
        const reservedQty = typeof reservedObj === 'object'
          ? (reservedObj?.totalReservedQuantity ?? 0)
          : (reservedObj ?? 0)
        const finishedProductId = skuProductMap.get(sku) || null

        // Fix #11: Capture additional inventory details that were previously discarded
        const inventoryDetails = item.inventoryDetails || item.inventory_details || {}
        const metadata = {
          asin: item.asin || item.ASIN || null,
          fnSku: item.fnSku || item.fn_sku || null,
          productName: item.productName || item.product_name || null,
          condition: item.condition || null,
          totalQuantity: item.totalQuantity ?? item.total_quantity ?? null,
          inboundWorkingQuantity: inventoryDetails.inboundWorkingQuantity ?? inventoryDetails.inbound_working_quantity ?? null,
          inboundShippedQuantity: inventoryDetails.inboundShippedQuantity ?? inventoryDetails.inbound_shipped_quantity ?? null,
          inboundReceivingQuantity: inventoryDetails.inboundReceivingQuantity ?? inventoryDetails.inbound_receiving_quantity ?? null,
          unfulfillableQuantity: inventoryDetails.unfulfillableQuantity ?? inventoryDetails.unfulfillable_quantity ?? null,
          reservedPendingCustomerOrder: reservedObj?.pendingCustomerOrderQuantity ?? null,
          reservedPendingTransshipment: reservedObj?.pendingTransshipmentQuantity ?? null,
        }

        const existing = await prisma.warehouseStock.findFirst({
          where: { warehouseId: fbaWarehouse.id, sku },
        })

        if (existing) {
          await prisma.warehouseStock.update({
            where: { id: existing.id },
            data: {
              qtyOnHand: availableQty,
              qtyReserved: reservedQty,
              metadata,
              lastSyncedAt: new Date(),
              ...(finishedProductId && !existing.finishedProductId ? { finishedProductId } : {}),
            },
          })
          recordsUpdated++
        } else {
          await prisma.warehouseStock.create({
            data: {
              tenantId,
              warehouseId: fbaWarehouse.id,
              sku,
              finishedProductId,
              qtyOnHand: availableQty,
              qtyReserved: reservedQty,
              metadata,
              lastSyncedAt: new Date(),
            },
          })
          recordsCreated++
        }
      } catch (err) {
        console.error(`[FBA Inventory] Error:`, err)
        recordsFailed++
      }
    }

    const finalStatus = recordsFailed > 0 ? 'partial' : 'completed'
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: { status: finalStatus, recordsProcessed, recordsCreated, recordsUpdated, recordsFailed, completedAt: new Date() },
    })

    return { syncLogId, status: finalStatus, recordsProcessed, recordsCreated, recordsUpdated, recordsFailed, errorMessage: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: { status: 'failed', errorMessage, completedAt: new Date(), recordsProcessed, recordsCreated, recordsUpdated, recordsFailed },
      })
    }
    return { syncLogId, status: 'failed', recordsProcessed, recordsCreated, recordsUpdated, recordsFailed, errorMessage }
  }
}

async function fetchFbaInventory(client: any): Promise<any[]> {
  const allItems: any[] = []
  let nextToken: string | null = null

  do {
    const response: any = await withRateLimitRetry(() =>
      client.callAPI({
        operation: 'fbaInventory.getInventorySummaries',
        query: {
          granularityType: 'Marketplace',
          granularityId: AMAZON_IN_MARKETPLACE_ID,
          marketplaceIds: [AMAZON_IN_MARKETPLACE_ID],
          ...(nextToken ? { nextToken } : {}),
        },
      })
    )

    const summaries = response?.inventorySummaries ?? response?.payload?.inventorySummaries ?? []
    allItems.push(...summaries)
    nextToken = response?.pagination?.nextToken ?? null
  } while (nextToken)

  return allItems
}
