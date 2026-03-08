import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { SWRProvider } from '@/components/swr-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ERP System',
  description: 'Fashion/Apparel ERP System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SWRProvider>
          {children}
        </SWRProvider>
        <Toaster />
      </body>
    </html>
  )
}
