'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useStore()

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
        <Link href="/graph" className={pathname === '/graph' ? 'active' : undefined}>
          Graph
        </Link>
        <Link href="/world" className={pathname === '/world' ? 'active' : undefined}>
          World
        </Link>
        <Link
          href="/friends"
          className={
            pathname === '/friends' || pathname.startsWith('/friends/')
              ? 'active'
              : undefined
          }
        >
          Friends
        </Link>
      </nav>
      <div className="account-bar">
        {user ? (
          <>
            <span className="account-email">{user.email}</span>
            <button
              className="login-btn"
              type="button"
              onClick={async () => {
                await logout()
                router.push('/')
                router.refresh()
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <Link className="login-btn" href="/login">
            Login
          </Link>
        )}
      </div>
    </header>
  )
}
