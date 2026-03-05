/**
 * Shopify Inventory Sync - Ported to Prisma
 */

import { prisma } from '@/lib/prisma'
import {
  getShopifyClientForTenant,
  getShopifyPlatformId,
  extractShopifyId,
  type ShopifyGraphQLClient,
} from './client'

const LOCATIONS_QUERY = `
  query FetchLocations {
    locations(first: 50) {
      edges {
        node {
          id
          name
          isActive
          fulfillsOnlineOrders
          address {
            address1
            city
            province
            zip
          }
        }
      }
    }
  }
`

const INVENTORY_LEVELS_QUERY = `
  query FetchInventoryLevels($locationId: ID!, $first: Int!, $after: String) {
    location(id: $locationId) {
      id
      name
      inventoryLevels(first: $first, after: $after) {
        edges {
          node {
            id
            quantities(names: ["available", "incoming", "committed", "on_hand"]) {
              name
              quantity
            }
            item {
              id
              sku
              variant {
                id
                sku
                title
                product { id title }
              }
            }
            updatedAt
          }
          cursor
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

interface GqlLocation {
  id: string
  name: string
  isActive: boolean
  fulfillsOnlineOrders: boolean
  address: { address1: string | null; city: string | null; province: string | null; zip: string | null }
}

interface GqlInventoryLevel {
  id: string
  quantities: { name: string; quantity: number }[]
  item: {
    id: string
    sku: string | null
    variant: {
      id: string
      sku: string | null
      title: string
      product: { id: string; title: string }
    } | null
  }
  updatedAt: string
}

/**
 * Sync inventory levels from Shopify into the ERP.
 */
export async function syncShopifyInventory(tenantId: string): Promise<{
  syncLogId: string
  status: string
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errorMessage: string | null
}> {
  const startedAt = new Date()
  let syncLogId = ''
  let recordsProcessed = 0
  let recordsCreated = 0
  let recordsUpdated = 0
  let recordsFailed = 0
  const errors: string[] = []

  try {
    const platformId = await getShopifyPlatformId(tenantId)
    const client = await getShopifyClientForTenant(tenantId)

    const syncLog = await prisma.syncLog.create({
      data: { tenantId, platformId, syncType: 'shopify_inventory', status: 'running', startedAt },
    })
    syncLogId = syncLog.id

    // Build externalSku→finishedProductId mapping
    const mappings = await prisma.platformMapping.findMany({
      where: { tenantId, platformId, isActive: true },
      select: { externalSku: true, externalVariantId: true, finishedProductId: true },
    })
    const variantToProduct = new Map(
      mappings.filter((m) => m.externalVariantId && m.finishedProductId)
        .map((m) => [m.externalVariantId!, m.finishedProductId!])
    )
    const skuToProduct = new Map(
      mappings.filter((m) => m.externalSku && m.finishedProductId)
        .map((m) => [m.externalSku!, m.finishedProductId!])
    )

    // Fetch Shopify locations
    const locationsResp = await client.query<{
      locations: { edges: { node: GqlLocation }[] }
    }>(LOCATIONS_QUERY)

    if (locationsResp.errors?.length) {
      throw new Error(`Failed to fetch locations: ${locationsResp.errors.map((e) => e.message).join('; ')}`)
    }

    const locations = locationsResp.data.locations.edges
      .map((e) => e.node)
      .filter((loc) => loc.isActive)

    for (const location of locations) {
      try {
        const warehouseId = await ensureWarehouse(tenantId, platformId, location)

        let hasNextPage = true
        let cursor: string | null = null

        while (hasNextPage) {
          const variables: Record<string, unknown> = { locationId: location.id, first: 100 }
          if (cursor) variables.after = cursor

          const response = await client.query<{
            location: { id: string; name: string; inventoryLevels: { edges: { node: GqlInventoryLevel; cursor: string }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }
          }>(INVENTORY_LEVELS_QUERY, variables)

          if (response.errors?.length) {
            errors.push(`GraphQL errors for location ${location.name}: ${response.errors.map((e) => e.message).join('; ')}`)
            if (!response.data?.location) break
          }

          const { edges, pageInfo } = response.data.location.inventoryLevels

          for (const { node: level } of edges) {
            recordsProcessed++

            const variantGid = level.item?.variant?.id
            if (!variantGid) continue

            const sku = level.item?.sku ?? level.item?.variant?.sku
            const finishedProductId = variantToProduct.get(variantGid) ?? (sku ? skuToProduct.get(sku) : null)
            if (!finishedProductId) continue // Unmapped

            const availableQty = level.quantities.find((q) => q.name === 'available')?.quantity ?? 0
            const onHandQty = level.quantities.find((q) => q.name === 'on_hand')?.quantity ?? 0

            try {
              const existing = await prisma.warehouseStock.findFirst({
                where: { tenantId, warehouseId, sku: sku ?? variantGid },
              })

              if (existing) {
                const oldQty = existing.qtyOnHand
                const delta = onHandQty - oldQty

                await prisma.warehouseStock.update({
                  where: { id: existing.id },
                  data: { qtyOnHand: onHandQty, lastSyncedAt: new Date() },
                })

                if (delta !== 0) {
                  await prisma.salesStockMovement.create({
                    data: {
                      tenantId,
                      warehouseId,
                      sku: sku ?? variantGid,
                      movementType: 'adjustment',
                      quantity: delta,
                      referenceType: 'shopify_sync',
                      referenceId: level.id,
                      notes: `Shopify sync: ${oldQty} -> ${onHandQty} (${location.name})`,
                    },
                  })
                }

                recordsUpdated++
              } else {
                await prisma.warehouseStock.create({
                  data: {
                    tenantId,
                    warehouseId,
                    finishedProductId,
                    sku: sku ?? variantGid,
                    qtyOnHand: onHandQty,
                    qtyReserved: 0,
                    lastSyncedAt: new Date(),
                  },
                })

                if (onHandQty !== 0) {
                  await prisma.salesStockMovement.create({
                    data: {
                      tenantId,
                      warehouseId,
                      sku: sku ?? variantGid,
                      movementType: 'adjustment',
                      quantity: onHandQty,
                      referenceType: 'shopify_sync',
                      referenceId: level.id,
                      notes: `Initial Shopify sync (${location.name})`,
                    },
                  })
                }

                recordsCreated++
              }
            } catch (error: any) {
              recordsFailed++
              errors.push(`Inventory ${level.id}: ${error.message}`)
            }
          }

          hasNextPage = pageInfo.hasNextPage
          cursor = pageInfo.endCursor
        }
      } catch (error: any) {
        errors.push(`Location ${location.name}: ${error.message}`)
      }
    }

    const status = recordsFailed > 0 && recordsProcessed > 0 ? 'partial' : recordsFailed > 0 ? 'failed' : 'completed'

    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        errorMessage: errors.length > 0 ? errors.join('\n') : null,
        completedAt: new Date(),
      },
    })

    console.log(`[Shopify Inventory] Sync complete: ${recordsProcessed} processed, ${recordsCreated} created, ${recordsUpdated} updated, ${recordsFailed} failed`)

    return { syncLogId, status, recordsProcessed, recordsCreated, recordsUpdated, recordsFailed, errorMessage: errors.length > 0 ? errors.join('\n') : null }
  } catch (error: any) {
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: { status: 'failed', errorMessage: error.message, completedAt: new Date(), recordsProcessed, recordsCreated, recordsUpdated, recordsFailed },
      }).catch(() => {})
    }
    throw error
  }
}

async function ensureWarehouse(tenantId: string, platformId: string, location: GqlLocation): Promise<string> {
  const warehouseCode = `shopify-${extractShopifyId(location.id)}`

  const existing = await prisma.salesWarehouse.findFirst({
    where: { tenantId, code: warehouseCode },
    select: { id: true },
  })

  if (existing) return existing.id

  const created = await prisma.salesWarehouse.create({
    data: {
      tenantId,
      name: `Shopify - ${location.name}`,
      code: warehouseCode,
      address: location.address.address1,
      city: location.address.city,
      state: location.address.province,
      pincode: location.address.zip,
      isFba: false,
      platformId,
      isActive: true,
    },
  })

  return created.id
}
