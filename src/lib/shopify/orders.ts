/**
 * Shopify Order Sync - Ported to Prisma
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  getShopifyClientForTenant,
  getShopifyPlatformId,
  type ShopifyGraphQLClient,
} from './client'

// GraphQL query
const ORDERS_QUERY = `
  query FetchOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          orderNumber
          createdAt
          updatedAt
          processedAt
          closedAt
          cancelledAt
          cancelReason
          displayFinancialStatus
          displayFulfillmentStatus
          confirmed
          test
          email
          phone
          note
          tags
          paymentGatewayNames
          riskLevel
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          shippingAddress {
            firstName
            lastName
            name
            address1
            address2
            city
            province
            provinceCode
            country
            countryCode
            zip
            phone
          }
          billingAddress {
            firstName
            lastName
            name
            address1
            address2
            city
            province
            provinceCode
            country
            countryCode
            zip
            phone
          }
          shippingLine {
            title
            code
            discountedPriceSet {
              shopMoney { amount currencyCode }
            }
          }
          lineItems(first: 100) {
            edges {
              node {
                id
                title
                variantTitle
                quantity
                sku
                vendor
                fulfillmentStatus
                variant { id sku title price }
                product { id title }
                discountedUnitPriceSet {
                  shopMoney { amount currencyCode }
                }
                totalDiscountSet {
                  shopMoney { amount currencyCode }
                }
                taxLines {
                  title
                  rate
                  priceSet { shopMoney { amount currencyCode } }
                }
              }
            }
          }
          subtotalPriceSet { shopMoney { amount currencyCode } }
          totalDiscountsSet { shopMoney { amount currencyCode } }
          totalShippingPriceSet { shopMoney { amount currencyCode } }
          totalTaxSet { shopMoney { amount currencyCode } }
          totalPriceSet { shopMoney { amount currencyCode } }
          totalRefundedSet { shopMoney { amount currencyCode } }
          currentSubtotalPriceSet { shopMoney { amount currencyCode } }
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          currentTotalTaxSet { shopMoney { amount currencyCode } }
          fulfillments {
            id
            status
            createdAt
            trackingInfo { company number url }
          }
          transactions(first: 20) {
            id
            kind
            status
            amountSet { shopMoney { amount currencyCode } }
            gateway
            createdAt
            processedAt
          }
        }
        cursor
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

// Types
interface MoneySet {
  shopMoney: { amount: string; currencyCode: string }
}

interface GqlOrderNode {
  id: string
  name: string
  orderNumber: number
  createdAt: string
  updatedAt: string
  processedAt: string
  closedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  displayFinancialStatus: string
  displayFulfillmentStatus: string
  confirmed: boolean
  test: boolean
  email: string | null
  phone: string | null
  note: string | null
  tags: string[]
  paymentGatewayNames: string[]
  riskLevel: string
  customer: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
  } | null
  shippingAddress: GqlAddress | null
  billingAddress: GqlAddress | null
  shippingLine: { title: string; code: string | null; discountedPriceSet: MoneySet } | null
  lineItems: {
    edges: {
      node: {
        id: string
        title: string
        variantTitle: string | null
        quantity: number
        sku: string | null
        vendor: string | null
        fulfillmentStatus: string
        variant: { id: string; sku: string | null; title: string; price: string } | null
        product: { id: string; title: string } | null
        discountedUnitPriceSet: MoneySet
        totalDiscountSet: MoneySet
        taxLines: { title: string; rate: number; priceSet: MoneySet }[]
      }
    }[]
  }
  subtotalPriceSet: MoneySet
  totalDiscountsSet: MoneySet
  totalShippingPriceSet: MoneySet
  totalTaxSet: MoneySet
  totalPriceSet: MoneySet
  totalRefundedSet: MoneySet
  currentSubtotalPriceSet: MoneySet
  currentTotalPriceSet: MoneySet
  currentTotalTaxSet: MoneySet
  fulfillments: {
    id: string
    status: string
    createdAt: string
    trackingInfo: { company: string | null; number: string | null; url: string | null }[]
  }[]
  transactions: {
    id: string
    kind: string
    status: string
    amountSet: MoneySet
    gateway: string
    createdAt: string
    processedAt: string | null
  }[]
}

interface GqlAddress {
  firstName: string | null
  lastName: string | null
  name: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  provinceCode: string | null
  country: string | null
  countryCode: string | null
  zip: string | null
  phone: string | null
}

/**
 * Sync Shopify orders into the ERP.
 */
export async function syncShopifyOrders(
  tenantId: string,
  daysBack = 7
): Promise<{
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
      data: { tenantId, platformId, syncType: 'shopify_orders', status: 'running', startedAt },
    })
    syncLogId = syncLog.id

    // Build SKU→product mapping from platform_mappings
    const mappings = await prisma.platformMapping.findMany({
      where: { tenantId, platformId, isActive: true, finishedProductId: { not: null } },
      select: { externalSku: true, finishedProductId: true },
    })
    const skuToProductId = new Map(
      mappings.filter((m) => m.externalSku && m.finishedProductId)
        .map((m) => [m.externalSku!, m.finishedProductId!])
    )

    // Date filter
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - daysBack)
    const dateQuery = `created_at:>='${sinceDate.toISOString()}'`

    // Paginate
    let hasNextPage = true
    let cursor: string | null = null

    while (hasNextPage) {
      const variables: Record<string, unknown> = { first: 50, query: dateQuery }
      if (cursor) variables.after = cursor

      const response = await client.query<{
        orders: { edges: { node: GqlOrderNode; cursor: string }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
      }>(ORDERS_QUERY, variables)

      if (response.errors?.length) {
        errors.push(`GraphQL errors: ${response.errors.map((e) => e.message).join('; ')}`)
        if (!response.data?.orders) break
      }

      const { edges, pageInfo } = response.data.orders

      for (const { node: order } of edges) {
        if (order.test) continue
        recordsProcessed++

        try {
          const result = await processOrder(tenantId, platformId, order, skuToProductId)
          if (result === 'created') recordsCreated++
          else recordsUpdated++
        } catch (error: any) {
          recordsFailed++
          errors.push(`Order ${order.name}: ${error.message}`)
          console.error(`[Shopify Orders] Failed ${order.name}:`, error.message)
        }
      }

      hasNextPage = pageInfo.hasNextPage
      cursor = pageInfo.endCursor
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

    console.log(`[Shopify Orders] Sync complete: ${recordsProcessed} processed, ${recordsCreated} created, ${recordsUpdated} updated, ${recordsFailed} failed`)

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

const money = (set: MoneySet) => parseFloat(set.shopMoney.amount)

async function processOrder(
  tenantId: string,
  platformId: string,
  order: GqlOrderNode,
  skuToProductId: Map<string, string>
): Promise<'created' | 'updated'> {
  const orderStatus = mapOrderStatus(order.displayFinancialStatus, order.displayFulfillmentStatus, order.cancelledAt)
  const paymentStatus = mapPaymentStatus(order.displayFinancialStatus)
  const fulfillmentStatus = mapFulfillmentStatus(order.displayFulfillmentStatus)

  const buildAddress = (addr: GqlAddress | null) =>
    addr ? {
      name: addr.name ?? `${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim(),
      line1: addr.address1 ?? '',
      line2: addr.address2 ?? undefined,
      city: addr.city ?? '',
      state: addr.province ?? '',
      pincode: addr.zip ?? '',
      country: addr.country ?? '',
      phone: addr.phone ?? undefined,
    } : undefined

  const latestFulfillment = order.fulfillments?.[0]
  const trackingInfo = latestFulfillment?.trackingInfo?.[0]
  const customerName = order.customer
    ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || null
    : null

  const orderData = {
    tenantId,
    platformId,
    orderNumber: order.name,
    externalOrderId: order.id,
    status: orderStatus as any,
    customerName,
    customerEmail: order.email ?? order.customer?.email ?? null,
    customerPhone: order.phone ?? order.customer?.phone ?? null,
    shippingAddress: buildAddress(order.shippingAddress) ?? Prisma.JsonNull,
    billingAddress: buildAddress(order.billingAddress) ?? Prisma.JsonNull,
    subtotal: new Prisma.Decimal(money(order.subtotalPriceSet)),
    discount: new Prisma.Decimal(money(order.totalDiscountsSet)),
    shippingCharge: new Prisma.Decimal(money(order.totalShippingPriceSet)),
    taxAmount: new Prisma.Decimal(money(order.totalTaxSet)),
    totalAmount: new Prisma.Decimal(money(order.totalPriceSet)),
    paymentStatus,
    fulfillmentStatus,
    trackingNumber: trackingInfo?.number ?? null,
    trackingUrl: trackingInfo?.url ?? null,
    courier: trackingInfo?.company ?? null,
    platformMetadata: {
      shopify_order_number: order.orderNumber,
      risk_level: order.riskLevel,
      tags: order.tags,
      payment_gateways: order.paymentGatewayNames,
      cancel_reason: order.cancelReason,
    },
    notes: order.note,
    orderedAt: order.processedAt ? new Date(order.processedAt) : new Date(order.createdAt),
    shippedAt: latestFulfillment?.createdAt ? new Date(latestFulfillment.createdAt) : null,
    cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : null,
  }

  // Check if order exists
  const existing = await prisma.salesOrder.findFirst({
    where: { tenantId, externalOrderId: order.id },
    select: { id: true },
  })

  let orderId: string
  let resultType: 'created' | 'updated'

  if (existing) {
    await prisma.salesOrder.update({ where: { id: existing.id }, data: orderData })
    orderId = existing.id
    resultType = 'updated'

    // Delete existing items for re-creation
    await prisma.salesOrderItem.deleteMany({ where: { orderId } })
  } else {
    const newOrder = await prisma.salesOrder.create({ data: orderData })
    orderId = newOrder.id
    resultType = 'created'
  }

  // Create order items
  const items = order.lineItems.edges.map(({ node: item }) => {
    const sku = item.sku ?? item.variant?.sku ?? 'UNKNOWN'
    const finishedProductId = skuToProductId.get(sku) ?? null
    const unitPrice = money(item.discountedUnitPriceSet)
    const discountAmt = money(item.totalDiscountSet)
    const taxAmt = item.taxLines.reduce((sum, t) => sum + parseFloat(t.priceSet.shopMoney.amount), 0)
    const total = unitPrice * item.quantity

    return {
      orderId,
      tenantId,
      finishedProductId,
      productName: item.product?.title ?? item.title,
      variantName: item.variantTitle,
      sku,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(unitPrice),
      discount: new Prisma.Decimal(discountAmt),
      taxAmount: new Prisma.Decimal(taxAmt),
      total: new Prisma.Decimal(total),
    }
  })

  if (items.length > 0) {
    await prisma.salesOrderItem.createMany({ data: items })
  }

  // Create payment records for successful transactions
  const successfulTxns = order.transactions.filter(
    (t) => t.status === 'SUCCESS' && (t.kind === 'SALE' || t.kind === 'CAPTURE')
  )

  for (const txn of successfulTxns) {
    const existingPayment = await prisma.salesPayment.findFirst({
      where: { orderId, transactionId: txn.id },
      select: { id: true },
    })

    if (!existingPayment) {
      await prisma.salesPayment.create({
        data: {
          orderId,
          tenantId,
          amount: new Prisma.Decimal(money(txn.amountSet)),
          method: txn.gateway,
          status: 'paid',
          transactionId: txn.id,
          paidAt: txn.processedAt ? new Date(txn.processedAt) : new Date(txn.createdAt),
        },
      })
    }
  }

  // Create/update revenue record for paid orders
  if (paymentStatus === 'paid' || paymentStatus === 'partial') {
    const existingRevenue = await prisma.salesRevenue.findFirst({
      where: { orderId },
      select: { id: true },
    })

    const revenueData = {
      tenantId,
      orderId,
      platformId,
      grossRevenue: new Prisma.Decimal(money(order.subtotalPriceSet)),
      discount: new Prisma.Decimal(money(order.totalDiscountsSet)),
      netRevenue: new Prisma.Decimal(money(order.currentSubtotalPriceSet)),
      taxCollected: new Prisma.Decimal(money(order.currentTotalTaxSet)),
      date: order.processedAt ? new Date(order.processedAt) : new Date(order.createdAt),
    }

    if (existingRevenue) {
      await prisma.salesRevenue.update({ where: { id: existingRevenue.id }, data: revenueData })
    } else {
      await prisma.salesRevenue.create({ data: revenueData })
    }
  }

  return resultType
}

// Status mapping helpers
function mapOrderStatus(financialStatus: string, fulfillmentStatus: string, cancelledAt: string | null): string {
  if (cancelledAt) return 'cancelled'
  switch (fulfillmentStatus) {
    case 'FULFILLED': return 'delivered'
    case 'IN_PROGRESS':
    case 'PARTIALLY_FULFILLED': return 'shipped'
    case 'ON_HOLD':
    case 'PENDING_FULFILLMENT':
    case 'SCHEDULED': return 'processing'
  }
  switch (financialStatus) {
    case 'PAID':
    case 'PARTIALLY_PAID': return 'confirmed'
    case 'REFUNDED': return 'refunded'
    case 'PENDING':
    case 'AUTHORIZED':
    default: return 'pending'
  }
}

function mapPaymentStatus(financialStatus: string): string {
  switch (financialStatus) {
    case 'PAID': return 'paid'
    case 'PARTIALLY_PAID':
    case 'PARTIALLY_REFUNDED': return 'partial'
    case 'REFUNDED': return 'refunded'
    case 'VOIDED': return 'failed'
    default: return 'pending'
  }
}

function mapFulfillmentStatus(status: string): string {
  switch (status) {
    case 'FULFILLED': return 'fulfilled'
    case 'PARTIALLY_FULFILLED':
    case 'IN_PROGRESS': return 'partial'
    default: return 'unfulfilled'
  }
}
