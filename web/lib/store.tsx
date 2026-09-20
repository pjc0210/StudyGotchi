'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { saveSession } from '@/app/actions/session'
import { submittedCourses } from './mock'
import type { Course, User } from './types'

type Store = {
  ready: boolean
  user: User | null
  pendingTwoFactor: boolean
  courses: Course[]
  login: (email: string, password: string) => Promise<'ok' | '2fa' | string>
  verifyTwoFactor: (code: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  requestReset: (email: string) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [pendingTwoFactor, setPendingTwoFactor] = useState(false)

  const persist = async (next: User | null) => {
    setUser(next)
    await saveSession(next)
  }

  const login = async (email: string, _password: string): Promise<'ok' | '2fa' | string> => {
    if (!email.includes('@')) return 'Use a valid email in this mock.'
    const next: User = {
      name: email.split('@')[0].replace(/\./g, ' '),
      email,
      handle: `@${email.split('@')[0]}`,
      twoFactor: email.toLowerCase().includes('2fa'),
    }
    if (next.twoFactor) {
      setPendingTwoFactor(true)
      sessionStorage.setItem('sg.pending', JSON.stringify(next))
      return '2fa'
    }
    await persist(next)
    return 'ok'
  }

  const verifyTwoFactor = async (code: string) => {
    if (code !== '123456') return false
    const raw = sessionStorage.getItem('sg.pending')
    if (!raw) return false
    const next = JSON.parse(raw) as User
    sessionStorage.removeItem('sg.pending')
    setPendingTwoFactor(false)
    await persist(next)
    return true
  }

  const register = async (name: string, email: string, password: string) => {
    if (!name.trim()) return 'Name is required.'
    if (!email.includes('@')) return 'Email looks off.'
    if (password.length < 4) return 'Use at least 4 characters (mock).'
    await persist({
      name,
      email,
      handle: `@${name.split(' ')[0].toLowerCase()}`,
      twoFactor: false,
    })
    return null
  }

  const logout = async () => {
    await persist(null)
    setPendingTwoFactor(false)
  }

  const requestReset = (_email: string) => {
    /* mock: no server */
  }

  const value = useMemo<Store>(
    () => ({
      ready: true,
      user,
      pendingTwoFactor,
      courses: submittedCourses,
      login,
      verifyTwoFactor,
      register,
      logout,
      requestReset,
    }),
    [user, pendingTwoFactor],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('Store missing')
  return ctx
}
