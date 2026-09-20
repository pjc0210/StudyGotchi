import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  initialClassrooms,
  initialFiles,
  initialFriends,
  initialNotices,
  submittedCourses,
} from './mock'
import type {
  Classroom,
  Course,
  Friend,
  MaterialKind,
  Notice,
  UploadedFile,
  User,
} from './types'

type Toast = { id: string; text: string }

type Store = {
  user: User | null
  pendingTwoFactor: boolean
  files: UploadedFile[]
  classrooms: Classroom[]
  friends: Friend[]
  notices: Notice[]
  toasts: Toast[]
  graphQuery: string
  courses: Course[]
  creature: { name: string; hunger: number; study: number; mood: string }
  login: (email: string, password: string) => 'ok' | '2fa' | string
  verifyTwoFactor: (code: string) => boolean
  register: (name: string, email: string, password: string) => string | null
  logout: () => void
  requestReset: (email: string) => void
  setGraphQuery: (q: string) => void
  pushToast: (text: string) => void
  markNoticesRead: () => void
  addFile: (file: UploadedFile) => void
  toggleFileClassroom: (id: string) => void
  setFileTopics: (id: string, topics: string[]) => void
  joinClassroom: (code: string) => string | null
  createClassroom: (name: string) => void
  addFriend: (handle: string) => string | null
  updateUser: (patch: Partial<User>) => void
  studyPulse: () => void
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
  const [files, setFiles] = useState(initialFiles)
  const [classrooms, setClassrooms] = useState(initialClassrooms)
  const [friends, setFriends] = useState(initialFriends)
  const [notices, setNotices] = useState(initialNotices)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [graphQuery, setGraphQuery] = useState('')
  const [creature, setCreature] = useState({
    name: 'Inkcap',
    hunger: 62,
    study: 48,
    mood: 'curious about eigenvalues',
  })

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

  const pushToast = useCallback((text: string) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, text }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3400)
  }, [])

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
    pushToast(`Welcome back, ${next.name}.`)
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
    pushToast('Two-factor verified.')
    return true
  }

  const register = (name: string, email: string, password: string) => {
    if (!name.trim()) return 'Name is required.'
    if (!email.includes('@')) return 'Email looks off.'
    if (password.length < 4) return 'Use at least 4 characters (mock).'
    persist({ name, email, handle: `@${name.split(' ')[0].toLowerCase()}`, twoFactor: false })
    pushToast('Account created. Your knowledge world is empty — and hungry.')
    return null
  }

  const logout = () => {
    persist(null)
    setPendingTwoFactor(false)
  }

  const requestReset = (email: string) => {
    pushToast(`Reset link sent to ${email} (mock).`)
  }

  const addFile = (file: UploadedFile) => {
    setFiles((f) => [file, ...f])
    pushToast(`Ingested ${file.name} into your neural map.`)
    setNotices((n) => [
      {
        id: crypto.randomUUID(),
        title: 'Graph growing',
        body: `${file.name} clustered under ${file.topics[0] ?? file.kind}.`,
        time: 'now',
        unread: true,
      },
      ...n,
    ])
  }

  const toggleFileClassroom = (id: string) => {
    setFiles((list) =>
      list.map((f) =>
        f.id === id ? { ...f, appliedToClassroom: !f.appliedToClassroom } : f,
      ),
    )
  }

  const setFileTopics = (id: string, topics: string[]) => {
    setFiles((list) => list.map((f) => (f.id === id ? { ...f, topics } : f)))
  }

  const joinClassroom = (code: string) => {
    const hit = classrooms.find(
      (c) => c.code.toLowerCase() === code.trim().toLowerCase(),
    )
    if (hit) {
      pushToast(`Already in ${hit.name}.`)
      return null
    }
    if (!code.trim()) return 'Need a classroom code.'
    const created: Classroom = {
      id: crypto.randomUUID(),
      name: `Classroom ${code.toUpperCase()}`,
      code: code.toUpperCase(),
      role: 'student',
      members: ['you'],
      sharedTopics: [],
    }
    setClassrooms((c) => [created, ...c])
    pushToast(`Joined ${created.name}. Combined maps unlock on share.`)
    return null
  }

  const createClassroom = (name: string) => {
    const code = name.slice(0, 4).toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100)
    setClassrooms((c) => [
      {
        id: crypto.randomUUID(),
        name,
        code,
        role: 'instructor',
        members: ['you'],
        sharedTopics: [],
      },
      ...c,
    ])
    pushToast(`Opened classroom ${code}.`)
  }

  const addFriend = (handle: string) => {
    const h = handle.startsWith('@') ? handle : `@${handle}`
    if (friends.some((f) => f.handle === h)) return 'Already friends.'
    if (!h.slice(1).trim()) return 'Enter a handle.'
    const newbie: Friend = {
      id: crypto.randomUUID(),
      name: h.slice(1),
      handle: h,
      creature: 'Sprout',
      mood: 'just arrived',
      worldTint: '#4a5d3a',
    }
    setFriends((f) => [newbie, ...f])
    pushToast(`Added ${h}. Visit their world anytime.`)
    return null
  }

  const updateUser = (patch: Partial<User>) => {
    if (!user) return
    const next = { ...user, ...patch }
    persist(next)
    pushToast('Account settings saved (local mock).')
  }

  const studyPulse = () => {
    setCreature((c) => ({
      ...c,
      hunger: Math.max(8, c.hunger - 12),
      study: Math.min(100, c.study + 14),
      mood: graphQuery ? `mulling “${graphQuery}”` : 'glowing from a study burst',
    }))
    pushToast('Inkcap absorbed a study session.')
  }

  const markNoticesRead = () => {
    setNotices((n) => n.map((x) => ({ ...x, unread: false })))
  }

  const value = useMemo<Store>(
    () => ({
      user,
      pendingTwoFactor,
      files,
      classrooms,
      friends,
      notices,
      toasts,
      graphQuery,
      courses: submittedCourses,
      creature,
      login,
      verifyTwoFactor,
      register,
      logout,
      requestReset,
      setGraphQuery,
      pushToast,
      markNoticesRead,
      addFile,
      toggleFileClassroom,
      setFileTopics,
      joinClassroom,
      createClassroom,
      addFriend,
      updateUser,
      studyPulse,
    }),
    [
      user,
      pendingTwoFactor,
      files,
      classrooms,
      friends,
      notices,
      toasts,
      graphQuery,
      creature,
      pushToast,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('Store missing')
  return ctx
}

export function kindLabel(kind: MaterialKind) {
  return {
    slides: 'slides',
    reading: 'reading',
    homework: 'homework',
    instructor: 'instructor',
    notes: 'notes',
    practice: 'practice',
  }[kind]
}
