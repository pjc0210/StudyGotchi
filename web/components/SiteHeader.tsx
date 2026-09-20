'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'

export function SiteHeader() {
  const pathname = usePathname()
  const { user } = useStore()

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main">
        <Link
          href="/"
          className={`site-wordmark${pathname === '/' ? ' active' : ''}`}
        >
          StudyGotchi
        </Link>
        <Link href="/earth" className={pathname === '/earth' ? 'active' : undefined}>
          Earth
        </Link>
      </nav>
      {user ? (
        <span className="account-email">{user.email}</span>
      ) : (
        <Link className="login-btn" href="/login">
          Login
        </Link>
      )}
    </header>
  )
}
