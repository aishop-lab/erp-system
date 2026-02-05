'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser, Session } from '@/types'

export function useAuth() {
  const [session, setSession] = useState<Session>({
    user: null,
    isLoading: true,
    error: null,
  })
  const router = useRouter()
  const supabase = createClient()

  const fetchUserFromDatabase = useCallback(async () => {
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
        setSession({ user: authUser, isLoading: false, error: null })
      } else {
        setSession({ user: null, isLoading: false, error: null })
      }
    } catch (error) {
      console.error('Failed to fetch user from database:', error)
      setSession({ user: null, isLoading: false, error: error as Error })
    }
  }, [])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          setSession({ user: null, isLoading: false, error })
          return
        }

        if (user) {
          // Fetch user data from our database
          await fetchUserFromDatabase()
        } else {
          setSession({ user: null, isLoading: false, error: null })
        }
      } catch (error) {
        setSession({ user: null, isLoading: false, error: error as Error })
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user data from our database
        await fetchUserFromDatabase()
      } else if (event === 'SIGNED_OUT') {
        setSession({ user: null, isLoading: false, error: null })
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase.auth, fetchUserFromDatabase])

  const signIn = async (email: string, password: string) => {
    setSession((prev) => ({ ...prev, isLoading: true, error: null }))

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setSession((prev) => ({ ...prev, isLoading: false, error }))
      return { error }
    }

    router.push('/dashboard')
    return { error: null }
  }

  const signOut = async () => {
    setSession((prev) => ({ ...prev, isLoading: true }))
    await supabase.auth.signOut()
    router.push('/login')
  }

  return {
    user: session.user,
    isLoading: session.isLoading,
    error: session.error,
    signIn,
    signOut,
  }
}
