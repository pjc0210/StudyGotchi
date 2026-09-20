import { getMockCourseData, MOCK_COURSES, type MockCourseData } from '@/lib/kg/mock'
import type { ConceptNode } from '@/lib/kg/types'
import type { Course } from '@/lib/types'

export type Account = {
  id: string
  name: string
  email: string
  password: string
  handle: string
  courses: Course[]
  graphCourseId: string
  stateShift: number
  /** Degrees from straight up; blobs sit on the top half of the globe. */
  angle: number
  color: string
}

export type PublicAccount = Omit<Account, 'password'>

const byCode = (code: string): Course => {
  const course = MOCK_COURSES.find((item) => item.id === code)
  return course
    ? { code: course.code, name: course.name }
    : { code, name: code }
}

const SEED_USERS: Account[] = [
  {
    id: 'demo',
    name: 'Demo',
    email: 'demo@example.com',
    password: '123456',
    handle: '@demo',
    courses: [byCode('6.1210'), byCode('18.06')],
    graphCourseId: '6.1210',
    stateShift: 0,
    angle: -70,
    color: '#ecc9c2',
  },
  {
    id: 'pj',
    name: 'PJ',
    email: 'pj@example.com',
    password: '123456',
    handle: '@pj',
    courses: [byCode('6.1210'), byCode('6.1400')],
    graphCourseId: '6.1210',
    stateShift: 1,
    angle: -35,
    color: '#c9ddb4',
  },
  {
    id: 'eddy',
    name: 'Eddy',
    email: 'eddy@example.com',
    password: '123456',
    handle: '@eddy',
    courses: [byCode('6.1400'), byCode('18.06')],
    graphCourseId: '6.1400',
    stateShift: 2,
    angle: 0,
    color: '#f0e2d4',
  },
  {
    id: 'adhyann',
    name: 'Adhyann',
    email: 'adhyann@example.com',
    password: '123456',
    handle: '@adhyann',
    courses: [byCode('8.223'), byCode('16.C20')],
    graphCourseId: '8.223',
    stateShift: 3,
    angle: 35,
    color: '#dcead0',
  },
  {
    id: 'frank',
    name: 'Frank',
    email: 'frank@example.com',
    password: '123456',
    handle: '@frank',
    courses: [byCode('16.C20'), byCode('6.1210'), byCode('18.06')],
    graphCourseId: '16.C20',
    stateShift: 4,
    angle: 70,
    color: '#d5e4ef',
  },
]

const EXTRA_KEY = 'studygotchi.users'

const STATE_RING: Array<
  Pick<ConceptNode, 'state' | 'understanding' | 'discovery_state'>
> = [
  { state: 'mastered', understanding: 0.9, discovery_state: 'active' },
  { state: 'strong', understanding: 0.7, discovery_state: 'encountered' },
  { state: 'developing', understanding: 0.55, discovery_state: 'active' },
  { state: 'uncertain', understanding: 0.42, discovery_state: 'active' },
  { state: 'struggling', understanding: 0.3, discovery_state: 'encountered' },
  { state: 'frontier', understanding: null, discovery_state: 'frontier' },
]

function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rotateState(node: ConceptNode, shift: number): ConceptNode {
  const current = STATE_RING.findIndex((entry) => entry.state === node.state)
  const index = (current + shift + STATE_RING.length) % STATE_RING.length
  return { ...node, ...STATE_RING[index] }
}

function loadExtra(): Account[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(EXTRA_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Account[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveExtra(accounts: Account[]) {
  localStorage.setItem(EXTRA_KEY, JSON.stringify(accounts))
}

export function toPublic(account: Account): PublicAccount {
  const { password: _password, ...rest } = account
  return rest
}

export function listAccounts(): Account[] {
  return [...SEED_USERS, ...loadExtra()]
}

export function listPublicAccounts(): PublicAccount[] {
  return listAccounts().map(toPublic)
}

export function getAccount(id: string) {
  return listAccounts().find((account) => account.id === id)
}

export function findAccountByEmail(email: string) {
  const needle = email.trim().toLowerCase()
  return listAccounts().find((account) => account.email.toLowerCase() === needle)
}

export function friendsOf(userId?: string | null) {
  return listPublicAccounts().filter((account) => account.id !== userId)
}

export function verifyLogin(email: string, password: string) {
  const account = findAccountByEmail(email)
  if (!account) return 'Unknown email.'
  if (account.password !== password) return 'Wrong password.'
  return account
}

function sampleCourses(id: string): Course[] {
  const count = 2 + (hash(id) % 2)
  const ranked = [...MOCK_COURSES].sort(
    (a, b) => hash(`${id}:${a.id}`) - hash(`${id}:${b.id}`),
  )
  return ranked.slice(0, count).map((course) => ({
    code: course.code,
    name: course.name,
  }))
}

export function createAccount(name: string, email: string, password: string) {
  if (findAccountByEmail(email)) return 'That email is already in the mock.'
  const id = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') || `user-${Date.now()}`
  const courses = sampleCourses(id)
  const extra = loadExtra()
  const account: Account = {
    id,
    name: name.trim(),
    email: email.trim(),
    password,
    handle: `@${name.trim().split(' ')[0].toLowerCase()}`,
    courses,
    graphCourseId: courses[0]?.code ?? MOCK_COURSES[0].id,
    stateShift: hash(id) % STATE_RING.length,
    angle: (hash(`${id}:angle`) % 161) - 80,
    color: ['#ecc9c2', '#c9ddb4', '#f0e2d4', '#dcead0', '#d5e4ef'][hash(id) % 5],
  }
  saveExtra([...extra, account])
  return account
}

export function accountHasGraph(courseCode: string) {
  return MOCK_COURSES.some((course) => course.id === courseCode)
}

export function getAccountCourseData(
  account: PublicAccount,
  courseId?: string,
): MockCourseData {
  const requested =
    courseId && account.courses.some((course) => course.code === courseId)
      ? courseId
      : account.graphCourseId
  const base = getMockCourseData(requested)
  return {
    ...base,
    graph: {
      ...base.graph,
      student_id: account.id,
      nodes: base.graph.nodes.map((node, index) =>
        rotateState(node, account.stateShift + index),
      ),
    },
  }
}
