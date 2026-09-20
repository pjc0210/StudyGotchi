import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { submittedCourses } from './mock'
import type { Course, User } from './types'

type Store = {
  user: User | null
  pendingTwoFactor: boolean
  courses: Course[]
  login: (email: string, password: string) => 'ok' | '2fa' | string
  verifyTwoFactor: (code: string) => boolean
  register: (name: string, email: string, password: string) => string | null
  logout: () => void
  requestReset: (email: string) => void
}

const StoreContext = createContext<Store | null>(null)
const AUTH_KEY = 'studygotchi.user'

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser)
  const [pendingTwoFactor, setPendingTwoFactor] = useState(false)

  const persist = (next: User | null) => {
    setUser(next)
    if (next) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(next))
      localStorage.setItem(
        `studygotchi.2fa.${next.email.toLowerCase()}`,
        next.twoFactor ? '1' : '0',
      )
    } else localStorage.removeItem(AUTH_KEY)
  }

  const login = (email: string, _password: string): 'ok' | '2fa' | string => {
    if (!email.includes('@')) return 'Use a valid email in this mock.'
    const flagged = localStorage.getItem(`studygotchi.2fa.${email.toLowerCase()}`) === '1'
    const next: User = {
      name: email.split('@')[0].replace(/\./g, ' '),
      email,
      handle: `@${email.split('@')[0]}`,
      twoFactor: email.toLowerCase().includes('2fa') || flagged,
    }
    if (next.twoFactor) {
      setPendingTwoFactor(true)
      sessionStorage.setItem('sg.pending', JSON.stringify(next))
      return '2fa'
    }
    persist(next)
    return 'ok'
  }

  const verifyTwoFactor = (code: string) => {
    if (code !== '123456') return false
    const raw = sessionStorage.getItem('sg.pending')
    if (!raw) return false
    const next = JSON.parse(raw) as User
    sessionStorage.removeItem('sg.pending')
    setPendingTwoFactor(false)
    persist(next)
    return true
  }

  const register = (name: string, email: string, password: string) => {
    if (!name.trim()) return 'Name is required.'
    if (!email.includes('@')) return 'Email looks off.'
    if (password.length < 4) return 'Use at least 4 characters (mock).'
    persist({ name, email, handle: `@${name.split(' ')[0].toLowerCase()}`, twoFactor: false })
    return null
  }

  const logout = () => {
    persist(null)
    setPendingTwoFactor(false)
  }

  const requestReset = (_email: string) => {
    /* mock: no server */
  }

  const value = useMemo<Store>(
    () => ({
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
