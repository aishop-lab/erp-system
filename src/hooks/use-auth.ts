'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthUser } from '@/types'

// Module-level singleton to prevent duplicate fetches across hook instances
let fetchPromise: Promise<void> | null = null
let lastFetchTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Module-level flag to ensure only one auth listener exists
let authListenerSetup = false
let authListenerCleanup: (() => void) | null = null

// Singleton supabase client reference (stable across renders)
const supabase = createClient()

function fetchUserFromDatabaseInternal(setUser: (user: AuthUser | null) => void, force = false): Promise<void> {
  const now = Date.now()
  const currentUser = useAuthStore.getState().user
  // Skip if recently fetched and we have a user
  if (!force && currentUser && now - lastFetchTime < CACHE_TTL) {
    return Promise.resolve()
  }

  // Deduplicate concurrent calls
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const response = await fetch('/api/me')
      if (response.ok) {
        const userData = await response.json()
        const authUser: AuthUser = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          tenantId: userData.tenantId,
          role: userData.role,
          isSuperAdmin: userData.isSuperAdmin,
          permissions: userData.permissions,
        }
        setUser(authUser)
        lastFetchTime = Date.now()
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user from database:', error)
      setUser(null)
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

export function useAuth() {
  const { user, setUser, reset } = useAuthStore()
  const router = useRouter()
  const initDone = useRef(false)

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    // Init: check session and fetch user if needed
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserFromDatabaseInternal(setUser)
      } else {
        setUser(null)
      }
    }

    initAuth()

    // Set up auth listener only once globally
    if (!authListenerSetup) {
      authListenerSetup = true
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        const store = useAuthStore.getState()
        if (event === 'SIGNED_IN' && session?.user) {
          lastFetchTime = 0
          await fetchUserFromDatabaseInternal(store.setUser, true)
        } else if (event === 'SIGNED_OUT') {
          store.reset()
        }
      })
      authListenerCleanup = () => {
        subscription.unsubscribe()
        authListenerSetup = false
      }
    }
  }, [setUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    router.push('/dashboard')
    return { error: null }
  }, [router])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    reset()
    router.push('/login')
  }, [reset, router])

  return {
    user,
    isLoading: !user && !initDone.current,
    error: null,
    signIn,
    signOut,
  }
}
