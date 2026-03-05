/**
 * Shopify GraphQL Admin API Client - Ported to Prisma
 */

import { prisma } from '@/lib/prisma'

// Types
export interface ShopifyCredentials {
  store_url: string
  access_token: string
}

export interface ShopifyGraphQLResponse<T> {
  data: T
  errors?: { message: string; extensions?: Record<string, unknown> }[]
  extensions?: {
    cost: {
      requested_query_cost: number
      actual_query_cost: number
      throttle_status: {
        maximum_available: number
        currently_available: number
        restore_rate: number
      }
    }
  }
}

export interface ShopifyGraphQLClient {
  query: <T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ) => Promise<ShopifyGraphQLResponse<T>>
  credentials: ShopifyCredentials
}

// Rate limiting state
interface ThrottleState {
  currently_available: number
  restore_rate: number
  maximum_available: number
  last_updated: number
}

const throttleStates = new Map<string, ThrottleState>()

async function waitForThrottle(storeKey: string, estimatedCost = 100): Promise<void> {
  const state = throttleStates.get(storeKey)
  if (!state) return

  const elapsedMs = Date.now() - state.last_updated
  const restoredPoints = (elapsedMs / 1000) * state.restore_rate
  const estimatedAvailable = Math.min(
    state.maximum_available,
    state.currently_available + restoredPoints
  )

  if (estimatedAvailable < estimatedCost) {
    const pointsNeeded = estimatedCost - estimatedAvailable
    const waitMs = Math.ceil((pointsNeeded / state.restore_rate) * 1000) + 100
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
}

/**
 * Create a Shopify GraphQL Admin API client.
 */
export function getShopifyClient(credentials: ShopifyCredentials): ShopifyGraphQLClient {
  const { store_url, access_token } = credentials

  const hostname = store_url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const endpoint = `https://${hostname}/admin/api/2024-10/graphql.json`
  const storeKey = hostname

  const query = async <T = unknown>(
    gql: string,
    variables: Record<string, unknown> = {}
  ): Promise<ShopifyGraphQLResponse<T>> => {
    await waitForThrottle(storeKey)

    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': access_token,
          },
          body: JSON.stringify({ query: gql, variables }),
        })

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitSeconds = retryAfter ? parseFloat(retryAfter) : 2 * (attempt + 1)
          console.warn(`[Shopify] Rate limited (429). Retrying in ${waitSeconds}s`)
          await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000))
          continue
        }

        if (!response.ok) {
          const body = await response.text()
          throw new Error(`Shopify GraphQL failed: ${response.status} - ${body}`)
        }

        const result: ShopifyGraphQLResponse<T> = await response.json()

        if (result.extensions?.cost) {
          throttleStates.set(storeKey, {
            currently_available: result.extensions.cost.throttle_status.currently_available,
            restore_rate: result.extensions.cost.throttle_status.restore_rate,
            maximum_available: result.extensions.cost.throttle_status.maximum_available,
            last_updated: Date.now(),
          })
        }

        const throttledError = result.errors?.find(
          (e) => e.extensions?.code === 'THROTTLED'
        )
        if (throttledError) {
          const cost = result.extensions?.cost
          const waitMs = cost
            ? Math.ceil(
                ((cost.requested_query_cost - cost.throttle_status.currently_available) /
                  cost.throttle_status.restore_rate) * 1000
              ) + 500
            : 2000 * (attempt + 1)
          console.warn(`[Shopify] Query throttled. Retrying in ${waitMs}ms`)
          await new Promise((resolve) => setTimeout(resolve, waitMs))
          continue
        }

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (lastError.message.includes('401') || lastError.message.includes('403') || lastError.message.includes('404')) {
          throw lastError
        }
        if (attempt < maxRetries - 1) {
          const backoffMs = 1000 * Math.pow(2, attempt)
          console.warn(`[Shopify] Retry ${attempt + 1}/${maxRetries} in ${backoffMs}ms: ${lastError.message}`)
          await new Promise((resolve) => setTimeout(resolve, backoffMs))
        }
      }
    }

    throw lastError ?? new Error('Shopify GraphQL request failed after retries')
  }

  return { query, credentials }
}

/**
 * Get Shopify client for a tenant using credentials from platform_credentials.
 */
export async function getShopifyClientForTenant(tenantId: string): Promise<ShopifyGraphQLClient> {
  const platform = await prisma.salesPlatform.findFirst({
    where: { tenantId, name: 'shopify', isActive: true },
    include: { credentials: true },
  })

  if (!platform) {
    throw new Error(`No active Shopify platform found for tenant ${tenantId}`)
  }

  const credRow = platform.credentials[0]
  if (!credRow) {
    throw new Error(`No credentials found for Shopify platform`)
  }

  const creds = credRow.credentials as Record<string, string>
  if (!creds.store_url || !creds.access_token) {
    throw new Error(`Incomplete Shopify credentials for tenant ${tenantId}`)
  }

  return getShopifyClient({
    store_url: creds.store_url,
    access_token: creds.access_token,
  })
}

/**
 * Get Shopify platform ID for a tenant.
 */
export async function getShopifyPlatformId(tenantId: string): Promise<string> {
  const platform = await prisma.salesPlatform.findFirst({
    where: { tenantId, name: 'shopify', isActive: true },
    select: { id: true },
  })
  if (!platform) throw new Error(`No active Shopify platform for tenant ${tenantId}`)
  return platform.id
}

/**
 * Extract the numeric ID from a Shopify GID.
 */
export function extractShopifyId(gid: string): string {
  const parts = gid.split('/')
  return parts[parts.length - 1]
}
