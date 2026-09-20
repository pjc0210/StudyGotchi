'use client'

import { StoreProvider } from '@/lib/store'
import type { User } from '@/lib/types'

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  return <StoreProvider initialUser={initialUser}>{children}</StoreProvider>
}
