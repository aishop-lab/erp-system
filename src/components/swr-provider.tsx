'use client'

import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/swr'

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60_000,
        keepPreviousData: true,
        errorRetryCount: 2,
        revalidateIfStale: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}
