import { prisma } from '@/lib/prisma'
import {
  getAmazonClientForTenant,
  getAmazonPlatformId,
  withRateLimitRetry,
  AMAZON_IN_MARKETPLACE_ID,
} from './client'

export interface OrderSyncSummary {
  syncLogId: string
  status: string
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errorMessage: string | null
}

/**
 * Sync Amazon orders for a tenant. Fetches from SP-API, creates/updates
 * sales_orders, sales_order_items, sales_payments, and sales_revenues.
 */
export async function syncAmazonOrders(
  tenantId: string,
  daysBack = 7
): Promise<OrderSyncSummary> {
  const startedAt = new Date()
  let syncLogId = ''
  let recordsProcessed = 0
  let recordsCreated = 0
  let recordsUpdated = 0
  let recordsFailed = 0

  try {
    const platformId = await getAmazonPlatformId(tenantId)

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        tenantId,
        platformId,
        syncType: 'amazon_orders',
        status: 'running',
        startedAt,
      },
    })
    syncLogId = syncLog.id

    // Fetch orders from Amazon
    const amazonClient = await getAmazonClientForTenant(tenantId)
    const createdAfter = new Date()
    createdAfter.setDate(createdAfter.getDate() - daysBack)

    const allOrders = await fetchAllOrders(amazonClient, createdAfter)

    // Load platform mappings for SKU → product linking
    const mappings = await prisma.platformMapping.findMany({
      where: { tenantId, platformId, isActive: true, finishedProductId: { not: null } },
      select: { externalSku: true, asin: true, finishedProductId: true },
    })

    const skuToProduct = new Map<string, string>()
    for (const m of mappings) {
      if (m.externalSku && m.finishedProductId) skuToProduct.set(m.externalSku, m.finishedProductId)
      if (m.asin && m.finishedProductId) skuToProduct.set(m.asin, m.finishedProductId)
    }

    // Process each order
    for (const order of allOrders) {
      recordsProcessed++
      try {
        const existing = await prisma.salesOrder.findFirst({
          where: { tenantId, externalOrderId: order.amazon_order_id },
          select: { id: true },
        })

        const status = mapOrderStatus(order.order_status)
        const orderTotalFromApi = order.order_total ? parseFloat(order.order_total.amount) : 0

        if (existing) {
          // Don't overwrite 'returned' status — the Orders API doesn't track returns,
          // so re-syncing would incorrectly revert returned orders back to shipped/delivered.
          const existingOrder = await prisma.salesOrder.findUnique({
            where: { id: existing.id },
            select: { status: true, totalAmount: true },
          })
          const preserveStatus = existingOrder?.status === 'returned'

          const updateData: any = {
            status: preserveStatus ? undefined : (status as any),
            paymentStatus: mapPaymentStatus(order.order_status),
            fulfillmentStatus: mapFulfillmentStatus(order.order_status),
            shippedAt: order.order_status === 'Shipped' ? new Date(order.last_update_date) : undefined,
            cancelledAt: order.order_status === 'Canceled' ? new Date(order.last_update_date) : undefined,
            platformMetadata: buildMetadata(order),
          }

          if (orderTotalFromApi > 0) {
            updateData.totalAmount = orderTotalFromApi
            updateData.subtotal = orderTotalFromApi
          } else {
            // Backfill from items if current amount is 0
            if (Number(existingOrder?.totalAmount || 0) === 0) {
              const itemsTotal = await prisma.salesOrderItem.aggregate({
                where: { orderId: existing.id },
                _sum: { total: true },
              })
              const computed = Number(itemsTotal._sum.total || 0)
              if (computed > 0) {
                updateData.totalAmount = computed
                updateData.subtotal = computed
              }
            }
          }

          await prisma.salesOrder.update({
            where: { id: existing.id },
            data: updateData,
          })
          recordsUpdated++
        } else {
          const newOrder = await prisma.salesOrder.create({
            data: {
              tenantId,
              platformId,
              orderNumber: order.amazon_order_id,
              externalOrderId: order.amazon_order_id,
              status: status as any,
              customerName: order.buyer_info?.buyer_name || null,
              customerEmail: order.buyer_info?.buyer_email || null,
              customerPhone: order.shipping_address?.phone || null,
              shippingAddress: order.shipping_address || undefined,
              subtotal: orderTotalFromApi,
              totalAmount: orderTotalFromApi,
              paymentStatus: mapPaymentStatus(order.order_status),
              fulfillmentStatus: mapFulfillmentStatus(order.order_status),
              platformMetadata: buildMetadata(order),
              orderedAt: new Date(order.purchase_date),
              shippedAt: order.order_status === 'Shipped' ? new Date(order.last_update_date) : null,
              cancelledAt: order.order_status === 'Canceled' ? new Date(order.last_update_date) : null,
            },
          })
          recordsCreated++

          // Fetch and create order items
          await processOrderItems(amazonClient, tenantId, newOrder.id, order.amazon_order_id, skuToProduct)

          // If order_total was 0, compute from items
          let finalTotal = orderTotalFromApi
          if (finalTotal === 0) {
            const itemsTotal = await prisma.salesOrderItem.aggregate({
              where: { orderId: newOrder.id },
              _sum: { total: true },
            })
            finalTotal = Number(itemsTotal._sum.total || 0)
            if (finalTotal > 0) {
              await prisma.salesOrder.update({
                where: { id: newOrder.id },
                data: { totalAmount: finalTotal, subtotal: finalTotal },
              })
            }
          }

          // Create payment record
          if (finalTotal > 0) {
            await prisma.salesPayment.create({
              data: {
                orderId: newOrder.id,
                tenantId,
                amount: finalTotal,
                method: order.payment_method || 'amazon',
                transactionId: order.amazon_order_id,
                status: mapPaymentStatus(order.order_status) === 'paid' ? 'completed' : 'pending',
                paidAt: mapPaymentStatus(order.order_status) === 'paid' ? new Date(order.purchase_date) : null,
              },
            })
          }

          // Create revenue record
          await prisma.salesRevenue.create({
            data: {
              tenantId,
              orderId: newOrder.id,
              platformId,
              grossRevenue: finalTotal,
              netRevenue: finalTotal,
              date: new Date(order.purchase_date),
            },
          }).catch(() => {}) // Ignore if duplicate
        }
      } catch (err) {
        console.error(`[Amazon Orders] Error processing ${order.amazon_order_id}:`, err)
        recordsFailed++
      }
    }

    // Update sync log
    const finalStatus = recordsFailed > 0 && recordsProcessed > recordsFailed
      ? 'partial'
      : recordsFailed === recordsProcessed && recordsProcessed > 0
        ? 'failed'
        : 'completed'

    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: finalStatus,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        completedAt: new Date(),
      },
    })

    return { syncLogId, status: finalStatus, recordsProcessed, recordsCreated, recordsUpdated, recordsFailed, errorMessage: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Amazon Orders] Fatal error:`, errorMessage)

    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: { status: 'failed', errorMessage, completedAt: new Date(), recordsProcessed, recordsCreated, recordsUpdated, recordsFailed },
      })
    }

    return { syncLogId, status: 'failed', recordsProcessed, recordsCreated, recordsUpdated, recordsFailed, errorMessage }
  }
}

// SP-API Fetching

async function fetchAllOrders(client: any, createdAfter: Date): Promise<any[]> {
  const allOrders: any[] = []
  let nextToken: string | null = null

  do {
    const response: any = await withRateLimitRetry(() =>
      client.callAPI({
        operation: 'orders.getOrders',
        query: {
          MarketplaceIds: [AMAZON_IN_MARKETPLACE_ID],
          CreatedAfter: createdAfter.toISOString(),
          ...(nextToken ? { NextToken: nextToken } : {}),
        },
      })
    )

    const orders = response?.Orders ?? response?.orders ?? []
    allOrders.push(...orders.map((o: any) => normalizeOrderKeys(o)))
    nextToken = response?.NextToken ?? response?.pagination?.next_token ?? null
  } while (nextToken)

  return allOrders
}

async function fetchOrderItems(client: any, amazonOrderId: string): Promise<any[]> {
  const allItems: any[] = []
  let nextToken: string | null = null

  do {
    const response: any = await withRateLimitRetry(() =>
      client.callAPI({
        operation: 'orders.getOrderItems',
        path: { orderId: amazonOrderId },
        ...(nextToken ? { query: { NextToken: nextToken } } : {}),
      })
    )

    const items = response?.OrderItems ?? response?.order_items ?? []
    allItems.push(...items.map((item: any) => normalizeOrderItemKeys(item)))
    nextToken = response?.NextToken ?? response?.next_token ?? null
  } while (nextToken)

  return allItems
}

async function processOrderItems(
  amazonClient: any,
  tenantId: string,
  orderId: string,
  amazonOrderId: string,
  skuToProduct: Map<string, string>
) {
  const items = await fetchOrderItems(amazonClient, amazonOrderId)

  for (const item of items) {
    const finishedProductId = skuToProduct.get(item.seller_sku) ?? skuToProduct.get(item.asin) ?? null
    const unitPrice = item.item_price ? parseFloat(item.item_price.amount) / (item.quantity_ordered || 1) : 0
    const taxAmount = item.item_tax ? parseFloat(item.item_tax.amount) : 0
    const discount = item.promotion_discount ? Math.abs(parseFloat(item.promotion_discount.amount)) : 0
    const total = (item.item_price ? parseFloat(item.item_price.amount) : 0) + taxAmount - discount

    await prisma.salesOrderItem.create({
      data: {
        orderId,
        tenantId,
        finishedProductId,
        productName: item.title || 'Unknown Product',
        sku: item.seller_sku,
        quantity: item.quantity_ordered || 1,
        unitPrice,
        discount,
        taxAmount,
        total,
      },
    })
  }
}

// Status Mapping

function mapOrderStatus(amazonStatus: string): string {
  const map: Record<string, string> = {
    Pending: 'pending',
    Unshipped: 'confirmed',
    PartiallyShipped: 'processing',
    Shipped: 'shipped',
    Canceled: 'cancelled',
    Unfulfillable: 'cancelled',
    InvoiceUnconfirmed: 'pending',
    PendingAvailability: 'pending',
  }
  return map[amazonStatus] ?? 'pending'
}

function mapPaymentStatus(orderStatus: string): string {
  if (orderStatus === 'Canceled') return 'failed'
  if (orderStatus === 'Shipped' || orderStatus === 'PartiallyShipped') return 'paid'
  return 'pending'
}

function mapFulfillmentStatus(orderStatus: string): string {
  if (orderStatus === 'Shipped') return 'fulfilled'
  if (orderStatus === 'PartiallyShipped') return 'partial'
  if (orderStatus === 'Canceled') return 'cancelled'
  return 'unfulfilled'
}

function buildMetadata(order: any) {
  return {
    fulfillment_channel: order.fulfillment_channel,
    sales_channel: order.sales_channel,
    is_prime: order.is_prime,
    is_business_order: order.is_business_order,
    marketplace_id: order.marketplace_id,
  }
}

// Key Normalization (PascalCase → snake_case)

function normalizeOrderKeys(raw: any): any {
  return {
    amazon_order_id: raw.AmazonOrderId ?? raw.amazon_order_id,
    purchase_date: raw.PurchaseDate ?? raw.purchase_date,
    last_update_date: raw.LastUpdateDate ?? raw.last_update_date,
    order_status: raw.OrderStatus ?? raw.order_status,
    fulfillment_channel: raw.FulfillmentChannel ?? raw.fulfillment_channel,
    sales_channel: raw.SalesChannel ?? raw.sales_channel ?? 'Amazon.in',
    order_total: raw.OrderTotal
      ? { currency_code: raw.OrderTotal.CurrencyCode ?? 'INR', amount: raw.OrderTotal.Amount ?? '0' }
      : raw.order_total ?? null,
    payment_method: raw.PaymentMethod ?? raw.payment_method ?? null,
    marketplace_id: raw.MarketplaceId ?? raw.marketplace_id ?? AMAZON_IN_MARKETPLACE_ID,
    buyer_info: raw.BuyerInfo ?? raw.buyer_info ?? null,
    shipping_address: raw.ShippingAddress
      ? {
          name: raw.ShippingAddress.Name ?? '',
          phone: raw.ShippingAddress.Phone ?? null,
          city: raw.ShippingAddress.City ?? null,
          state_or_region: raw.ShippingAddress.StateOrRegion ?? null,
          postal_code: raw.ShippingAddress.PostalCode ?? null,
          country_code: raw.ShippingAddress.CountryCode ?? 'IN',
        }
      : raw.shipping_address ?? null,
    is_prime: raw.IsPrime ?? raw.is_prime ?? false,
    is_business_order: raw.IsBusinessOrder ?? raw.is_business_order ?? false,
  }
}

function normalizeOrderItemKeys(raw: any): any {
  const normMoney = (v: any) => v ? { currency_code: v.CurrencyCode ?? 'INR', amount: v.Amount ?? '0' } : null
  return {
    asin: raw.ASIN ?? raw.asin ?? '',
    seller_sku: raw.SellerSKU ?? raw.seller_sku ?? '',
    title: raw.Title ?? raw.title ?? '',
    quantity_ordered: raw.QuantityOrdered ?? raw.quantity_ordered ?? 0,
    item_price: normMoney(raw.ItemPrice ?? raw.item_price),
    item_tax: normMoney(raw.ItemTax ?? raw.item_tax),
    promotion_discount: normMoney(raw.PromotionDiscount ?? raw.promotion_discount),
  }
}
