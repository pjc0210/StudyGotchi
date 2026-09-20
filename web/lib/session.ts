import { cookies } from 'next/headers'
import { AUTH_COOKIE } from './auth-cookie'
import type { User } from './types'

export async function readSession(): Promise<User | null> {
  const raw = (await cookies()).get(AUTH_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export async function writeSession(user: User | null) {
  const jar = await cookies()
  if (!user) {
    jar.delete(AUTH_COOKIE)
    return
  }
  jar.set(AUTH_COOKIE, JSON.stringify(user), {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })
}
