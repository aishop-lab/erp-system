/**
 * Shopify Webhook Handlers - Ported to Prisma
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verify a Shopify webhook's HMAC-SHA256 signature.
 */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Shopify Webhook] SHOPIFY_WEBHOOK_SECRET is not set')
    return false
  }

  try {
    const computedHmac = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
    const computedBuffer = Buffer.from(computedHmac, 'base64')
    const headerBuffer = Buffer.from(hmacHeader, 'base64')
    if (computedBuffer.length !== headerBuffer.length) return false
    return timingSafeEqual(computedBuffer, headerBuffer)
  } catch {
    return false
  }
}

/**
 * Handle orders/create webhook.
 */
export async function processOrderCreate(
  tenantId: string,
  platformId: string,
  payload: Record<string, any>
): Promise<void> {
  const shopifyOrderId = payload.admin_graphql_api_id as string | undefined
  const orderName = (payload.name as string) ?? `#${payload.order_number}`

  // Idempotency check
  if (shopifyOrderId) {
    const existing = await prisma.salesOrder.findFirst({
      where: { tenantId, externalOrderId: shopifyOrderId },
      select: { id: true },
    })
    if (existing) {
      console.log(`[Shopify Webhook] Order ${orderName} already exists, skipping`)
      return
    }
  }

  // Build SKU→product mapping
  const mappings = await prisma.platformMapping.findMany({
    where: { tenantId, platformId, isActive: true, finishedProductId: { not: null } },
    select: { externalSku: true, finishedProductId: true },
  })
  const skuToProductId = new Map(
    mappings.filter((m) => m.externalSku).map((m) => [m.externalSku!, m.finishedProductId!])
  )

  const customer = payload.customer as Record<string, any> | null
  const shippingAddr = payload.shipping_address as Record<string, any> | null
  const billingAddr = payload.billing_address as Record<string, any> | null
  const financialStatus = (payload.financial_status as string)?.toUpperCase() ?? 'PENDING'
  const fulfillmentStatus = (payload.fulfillment_status as string)?.toUpperCase() ?? 'UNFULFILLED'

  const buildAddr = (addr: Record<string, any> | null) =>
    addr ? {
      name: `${addr.first_name ?? ''} ${addr.last_name ?? ''}`.trim(),
      line1: (addr.address1 as string) ?? '',
      line2: (addr.address2 as string) ?? undefined,
      city: (addr.city as string) ?? '',
      state: (addr.province as string) ?? '',
      pincode: (addr.zip as string) ?? '',
      country: (addr.country as string) ?? '',
      phone: (addr.phone as string) ?? undefined,
    } : undefined

  const shippingLines = (payload.shipping_lines as Record<string, any>[]) ?? []
  const shippingTotal = shippingLines.reduce((sum: number, sl: any) => sum + parseFloat(sl.price ?? '0'), 0)

  const newOrder = await prisma.salesOrder.create({
    data: {
      tenantId,
      platformId,
      orderNumber: orderName,
      externalOrderId: shopifyOrderId ?? String(payload.id),
      status: mapOrderStatus(financialStatus, fulfillmentStatus, payload.cancelled_at as string | null) as any,
      customerName: customer ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || null : null,
      customerEmail: (payload.email as string) ?? (customer?.email as string) ?? null,
      customerPhone: (payload.phone as string) ?? (customer?.phone as string) ?? null,
      shippingAddress: buildAddr(shippingAddr) ?? Prisma.JsonNull,
      billingAddress: buildAddr(billingAddr) ?? Prisma.JsonNull,
      subtotal: new Prisma.Decimal(parseFloat(payload.subtotal_price ?? '0')),
      discount: new Prisma.Decimal(parseFloat(payload.total_discounts ?? '0')),
      shippingCharge: new Prisma.Decimal(shippingTotal),
      taxAmount: new Prisma.Decimal(parseFloat(payload.total_tax ?? '0')),
      totalAmount: new Prisma.Decimal(parseFloat(payload.total_price ?? '0')),
      paymentStatus: mapPaymentStatus(financialStatus),
      fulfillmentStatus: mapFulfillmentStatus(fulfillmentStatus),
      notes: (payload.note as string) ?? null,
      orderedAt: payload.processed_at ? new Date(payload.processed_at) : new Date(payload.created_at),
      cancelledAt: payload.cancelled_at ? new Date(payload.cancelled_at) : null,
      platformMetadata: {
        shopify_order_number: payload.order_number,
        tags: (payload.tags as string)?.split(', ') ?? [],
        payment_gateways: payload.payment_gateway_names ?? [],
        cancel_reason: payload.cancel_reason ?? null,
      },
    },
  })

  // Create order items
  const lineItems = (payload.line_items as Record<string, any>[]) ?? []
  const items = lineItems.map((item) => {
    const sku = (item.sku as string) ?? 'UNKNOWN'
    const unitPrice = parseFloat(item.price ?? '0')
    const quantity = (item.quantity as number) ?? 1
    const discountVal = parseFloat(item.total_discount ?? '0')
    const taxLines = (item.tax_lines as { price: string }[]) ?? []
    const taxAmt = taxLines.reduce((sum, t) => sum + parseFloat(t.price ?? '0'), 0)

    return {
      orderId: newOrder.id,
      tenantId,
      finishedProductId: skuToProductId.get(sku) ?? null,
      productName: (item.title as string) ?? 'Unknown Product',
      variantName: (item.variant_title as string) ?? null,
      sku,
      quantity,
      unitPrice: new Prisma.Decimal(unitPrice),
      discount: new Prisma.Decimal(discountVal),
      taxAmount: new Prisma.Decimal(taxAmt),
      total: new Prisma.Decimal(unitPrice * quantity - discountVal),
    }
  })

  if (items.length > 0) {
    await prisma.salesOrderItem.createMany({ data: items })
  }

  // Payment record
  if (financialStatus === 'PAID') {
    await prisma.salesPayment.create({
      data: {
        orderId: newOrder.id,
        tenantId,
        amount: new Prisma.Decimal(parseFloat(payload.total_price ?? '0')),
        method: ((payload.payment_gateway_names as string[]) ?? [])[0] ?? 'unknown',
        status: 'paid',
        paidAt: payload.processed_at ? new Date(payload.processed_at) : new Date(),
      },
    })
  }

  // Revenue record
  if (financialStatus === 'PAID' || financialStatus === 'PARTIALLY_PAID') {
    await prisma.salesRevenue.create({
      data: {
        tenantId,
        orderId: newOrder.id,
        platformId,
        grossRevenue: new Prisma.Decimal(parseFloat(payload.subtotal_price ?? '0')),
        discount: new Prisma.Decimal(parseFloat(payload.total_discounts ?? '0')),
        netRevenue: new Prisma.Decimal(parseFloat(payload.total_price ?? '0') - parseFloat(payload.total_tax ?? '0')),
        taxCollected: new Prisma.Decimal(parseFloat(payload.total_tax ?? '0')),
        date: payload.processed_at ? new Date(payload.processed_at) : new Date(payload.created_at),
      },
    })
  }

  console.log(`[Shopify Webhook] Order created: ${orderName} -> ${newOrder.id}`)
}

/**
 * Handle orders/updated webhook.
 */
export async function processOrderUpdate(
  tenantId: string,
  platformId: string,
  payload: Record<string, any>
): Promise<void> {
  const shopifyOrderId = payload.admin_graphql_api_id as string | undefined
  const orderName = (payload.name as string) ?? `#${payload.order_number}`

  if (!shopifyOrderId) return

  const existing = await prisma.salesOrder.findFirst({
    where: { tenantId, externalOrderId: shopifyOrderId },
    select: { id: true },
  })

  if (!existing) {
    // Not found — create instead
    await processOrderCreate(tenantId, platformId, payload)
    return
  }

  const financialStatus = (payload.financial_status as string)?.toUpperCase() ?? 'PENDING'
  const fulfillmentStatus = (payload.fulfillment_status as string)?.toUpperCase() ?? 'UNFULFILLED'

  const fulfillments = (payload.fulfillments as Record<string, any>[]) ?? []
  const latestFulfillment = fulfillments[fulfillments.length - 1]

  const updateData: any = {
    status: mapOrderStatus(financialStatus, fulfillmentStatus, payload.cancelled_at as string | null) as any,
    paymentStatus: mapPaymentStatus(financialStatus),
    fulfillmentStatus: mapFulfillmentStatus(fulfillmentStatus),
    cancelledAt: payload.cancelled_at ? new Date(payload.cancelled_at) : null,
  }

  if (latestFulfillment) {
    updateData.trackingNumber = (latestFulfillment.tracking_number as string) ?? null
    updateData.trackingUrl = (latestFulfillment.tracking_url as string) ?? null
    updateData.courier = (latestFulfillment.tracking_company as string) ?? null
    updateData.shippedAt = latestFulfillment.created_at ? new Date(latestFulfillment.created_at) : null
  }

  await prisma.salesOrder.update({ where: { id: existing.id }, data: updateData })
  console.log(`[Shopify Webhook] Order updated: ${orderName}`)
}

// Status helpers
function mapOrderStatus(financialStatus: string, fulfillmentStatus: string, cancelledAt: string | null): string {
  if (cancelledAt) return 'cancelled'
  switch (fulfillmentStatus) {
    case 'FULFILLED': return 'delivered'
    case 'PARTIAL':
    case 'IN_PROGRESS': return 'shipped'
  }
  switch (financialStatus) {
    case 'PAID':
    case 'PARTIALLY_PAID': return 'confirmed'
    case 'REFUNDED': return 'refunded'
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
    case 'PARTIAL':
    case 'IN_PROGRESS': return 'partial'
    default: return 'unfulfilled'
  }
}
