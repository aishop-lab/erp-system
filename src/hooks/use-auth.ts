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

export function useAuth() {
  const { user, setUser, reset } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const isLoadingRef = useRef(!user)

  const fetchUserFromDatabase = useCallback(async () => {
    const now = Date.now()
    // Skip if recently fetched and we have a user
    if (user && now - lastFetchTime < CACHE_TTL) return

    // Deduplicate concurrent calls
    if (fetchPromise) {
      await fetchPromise
      return
    }

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
      }
    })()

    try {
      await fetchPromise
    } finally {
      fetchPromise = null
    }
  }, [user, setUser])

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Use getSession() — reads from local JWT cookie, no network call
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          await fetchUserFromDatabase()
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      }
      isLoadingRef.current = false
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Invalidate cache on fresh sign-in
        lastFetchTime = 0
        await fetchUserFromDatabase()
      } else if (event === 'SIGNED_OUT') {
        reset()
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase.auth, fetchUserFromDatabase, setUser, reset])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error }
    }

    router.push('/dashboard')
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    reset()
    router.push('/login')
  }

  return {
    user,
    isLoading: !user && isLoadingRef.current,
    error: null,
    signIn,
    signOut,
  }
}
