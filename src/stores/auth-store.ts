import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  tenantId: string | null
  setUser: (user: AuthUser | null) => void
  setTenantId: (tenantId: string | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenantId: null,
      setUser: (user) => set({ user, tenantId: user?.tenantId || null }),
      setTenantId: (tenantId) => set({ tenantId }),
      reset: () => set({ user: null, tenantId: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, tenantId: state.tenantId }),
    }
  )
)
