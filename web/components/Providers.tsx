'use client'

import { StoreProvider } from '@/lib/store'
import { ThemeProvider } from '@/lib/theme'
import type { User } from '@/lib/types'

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  return (
    <ThemeProvider>
      <StoreProvider initialUser={initialUser}>{children}</StoreProvider>
    </ThemeProvider>
  )
}
