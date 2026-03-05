import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyShopifyWebhook,
  processOrderCreate,
  processOrderUpdate,
} from '@/lib/shopify/webhooks'

export const runtime = 'nodejs'

/**
 * POST /api/webhooks/shopify
 * Receives webhook events from Shopify.
 */
export async function POST(request: NextRequest) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 })
  }

  const hmacHeader = request.headers.get('x-shopify-hmac-sha256') ?? ''
  const topic = request.headers.get('x-shopify-topic') ?? ''
  const shopDomain = request.headers.get('x-shopify-shop-domain') ?? ''
  const webhookId = request.headers.get('x-shopify-webhook-id') ?? ''

  // Verify HMAC
  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    console.error(`[Shopify Webhook] HMAC verification failed for topic=${topic}`)
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Find tenant by matching Shopify store domain in credentials
  const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')

  const allCreds = await prisma.platformCredential.findMany({
    where: { isConnected: true },
    select: { tenantId: true, platformId: true, credentials: true },
  })

  const matchingCred = allCreds.find((c) => {
    const creds = c.credentials as Record<string, string> | null
    const storeUrl = creds?.store_url ?? ''
    const cleanStoreUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    return cleanStoreUrl === cleanDomain || storeUrl === shopDomain
  })

  if (!matchingCred) {
    console.error(`[Shopify Webhook] No tenant found for shop: ${shopDomain}`)
    return NextResponse.json({ status: 'ignored', reason: 'unknown_shop' })
  }

  const { tenantId, platformId } = matchingCred

  // Log webhook event
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      tenantId,
      platformId,
      eventType: topic,
      payload: payload as any,
      processed: false,
      receivedAt: new Date(),
    },
  })

  // Route to handler
  try {
    switch (topic) {
      case 'orders/create':
        await processOrderCreate(tenantId, platformId, payload as any)
        break
      case 'orders/updated':
      case 'orders/cancelled':
      case 'orders/fulfilled':
      case 'orders/paid':
        await processOrderUpdate(tenantId, platformId, payload as any)
        break
      default:
        console.log(`[Shopify Webhook] Unhandled topic: ${topic}`)
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processed: true, processedAt: new Date() },
    })
  } catch (error: any) {
    console.error(`[Shopify Webhook] Error processing ${topic}: ${error.message}`)
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processed: true, error: error.message, processedAt: new Date() },
    })
  }

  return NextResponse.json({ status: 'received', webhook_id: webhookId })
}
