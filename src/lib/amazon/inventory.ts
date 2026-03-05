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

    // Process each item
    for (const item of inventoryItems) {
      recordsProcessed++
      try {
        const sku = item.sellerSku || item.seller_sku
        const availableQty = item.fulfillableQuantity ?? item.fulfillable_quantity ?? 0
        const reservedQty = item.reservedQuantity?.totalReservedQuantity ?? item.reserved_quantity ?? 0

        const existing = await prisma.warehouseStock.findFirst({
          where: { warehouseId: fbaWarehouse.id, sku },
        })

        if (existing) {
          await prisma.warehouseStock.update({
            where: { id: existing.id },
            data: { qtyOnHand: availableQty, qtyReserved: reservedQty, lastSyncedAt: new Date() },
          })
          recordsUpdated++
        } else {
          await prisma.warehouseStock.create({
            data: {
              tenantId,
              warehouseId: fbaWarehouse.id,
              sku,
              qtyOnHand: availableQty,
              qtyReserved: reservedQty,
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
