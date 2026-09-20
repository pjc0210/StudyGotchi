'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'day' | 'night'

const STORAGE_KEY = 'studygotchi.theme'

type ThemeStore = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeStore | null>(null)

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'day'
  return document.documentElement.classList.contains('night') ? 'night' : 'day'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('night', theme === 'night')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'day' || stored === 'night') {
      setTheme(stored)
      applyTheme(stored)
    }
  }, [])

  const value = useMemo<ThemeStore>(
    () => ({
      theme,
      toggleTheme: () => {
        const next: Theme = theme === 'day' ? 'night' : 'day'
        setTheme(next)
        applyTheme(next)
        localStorage.setItem(STORAGE_KEY, next)
      },
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('Theme missing')
  return ctx
}
