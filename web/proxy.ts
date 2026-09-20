import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth-cookie'

function hasSession(request: NextRequest) {
  const raw = request.cookies.get(AUTH_COOKIE)?.value
  if (!raw) return false
  try {
    JSON.parse(raw)
    return true
  } catch {
    return false
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const loggedIn = hasSession(request)

  if (loggedIn && (pathname === '/' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/earth', request.url))
  }
  if (
    !loggedIn &&
    (pathname === '/earth' ||
      pathname === '/graph' ||
      pathname === '/friends' ||
      pathname.startsWith('/friends/'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/earth', '/graph', '/friends', '/friends/:path*'],
}
