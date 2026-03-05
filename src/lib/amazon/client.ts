import { SellingPartner } from 'amazon-sp-api'
import { prisma } from '@/lib/prisma'

export const AMAZON_IN_MARKETPLACE_ID = 'A21TJRUUN4KGV'

export interface AmazonCredentials {
  client_id: string
  client_secret: string
  refresh_token: string
}

export function getAmazonClient(credentials: AmazonCredentials): any {
  return new SellingPartner({
    region: 'eu', // India is under EU region in SP-API
    refresh_token: credentials.refresh_token,
    credentials: {
      SELLING_PARTNER_APP_CLIENT_ID: credentials.client_id,
      SELLING_PARTNER_APP_CLIENT_SECRET: credentials.client_secret,
    },
    options: {
      auto_request_tokens: true,
      auto_request_throttled: true,
      use_sandbox: false,
    },
  })
}

/**
 * Get Amazon client for a tenant using credentials from platform_credentials table.
 */
export async function getAmazonClientForTenant(tenantId: string): Promise<any> {
  const platform = await prisma.salesPlatform.findFirst({
    where: { tenantId, name: 'amazon', isActive: true },
    include: { credentials: true },
  })

  if (!platform) {
    throw new Error(`No active Amazon platform found for tenant ${tenantId}`)
  }

  const credRow = platform.credentials[0]
  if (!credRow) {
    throw new Error(`No credentials found for Amazon platform`)
  }

  const creds = credRow.credentials as Record<string, string>
  if (!creds.client_id || !creds.client_secret || !creds.refresh_token) {
    throw new Error(`Incomplete Amazon credentials for tenant ${tenantId}`)
  }

  return getAmazonClient({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
  })
}

/**
 * Get Amazon platform ID for a tenant.
 */
export async function getAmazonPlatformId(tenantId: string): Promise<string> {
  const platform = await prisma.salesPlatform.findFirst({
    where: { tenantId, name: 'amazon', isActive: true },
    select: { id: true },
  })
  if (!platform) throw new Error(`No active Amazon platform for tenant ${tenantId}`)
  return platform.id
}

/**
 * Exponential backoff retry for rate-limited API calls.
 */
export async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const msg = lastError.message || ''

      const isRetryable =
        msg.includes('429') || msg.includes('QuotaExceeded') || msg.includes('Throttl') ||
        msg.includes('500') || msg.includes('503') || msg.includes('ECONNRESET')

      if (!isRetryable || attempt === maxRetries) throw lastError

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs, 30000)
      console.warn(`[Amazon SP-API] Retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`)
      await new Promise(r => setTimeout(r, delay))
    }
  }

  throw lastError!
}
