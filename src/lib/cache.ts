/**
 * Simple in-memory cache for expensive API queries.
 * Each entry has a TTL (time-to-live) in milliseconds.
 * On Vercel serverless, this cache lives for the duration of the warm function (~5-15 min).
 */

interface CacheEntry<T> {
  data: T
  expiry: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiry: Date.now() + ttlMs })
}

/**
 * Get-or-set helper: returns cached value or runs the factory and caches the result.
 */
export async function cached<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const existing = getCached<T>(key)
  if (existing !== null) return existing
  const data = await factory()
  setCached(key, data, ttlMs)
  return data
}
