import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

interface AuthenticatedUser {
  id: string
  email: string
  name: string
  tenantId: string
  role: string
  isSuperAdmin: boolean
  supabaseUserId: string
}

type AuthResult =
  | { user: AuthenticatedUser; error?: never; response?: never }
  | { user?: never; error: string; response: NextResponse }

// Cache user lookups in-memory for the duration of a request
// (Next.js deduplicates within a single request lifecycle)
const userCache = new Map<string, { user: AuthenticatedUser; timestamp: number }>()
const CACHE_TTL = 300_000 // 5 minutes

/**
 * Authenticate an API request. Returns the current user or an error response.
 * Replaces the repeated getUser() + prisma.user.findUnique pattern.
 */
export async function authenticateRequest(): Promise<AuthResult> {
  const supabase = await createClient()

  // Use getUser() for server-side verification — middleware skips auth for /api/ routes,
  // so JWT-only getSession() is not secure. The in-memory cache below mitigates the perf cost.
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return {
      error: 'Unauthorized',
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const authUserId = authUser.id

  // Check in-memory cache
  const cached = userCache.get(authUserId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { user: cached.user }
  }

  const currentUser = await prisma.user.findUnique({
    where: { supabaseUserId: authUserId },
    select: {
      id: true,
      email: true,
      name: true,
      tenantId: true,
      role: true,
      isSuperAdmin: true,
      supabaseUserId: true,
    },
  })

  if (!currentUser) {
    return {
      error: 'User not found',
      response: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    }
  }

  const user = currentUser as AuthenticatedUser
  userCache.set(authUserId, { user, timestamp: Date.now() })

  return { user }
}

/**
 * Create a JSON response with cache headers for read-only endpoints.
 * Uses stale-while-revalidate for a good UX with fresh-enough data.
 */
export function cachedJsonResponse(data: unknown, maxAge = 30) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `private, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    },
  })
}
