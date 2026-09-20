import type { GoldenView } from '@/components/world/golden/golden-spec'

export type ChromeScreen = 'landing' | 'world' | 'visit'

export const SCREENS: ChromeScreen[] = ['landing', 'world', 'visit']

export function isChromeScreen(value: unknown): value is ChromeScreen {
  return typeof value === 'string' && (SCREENS as string[]).includes(value)
}

/** Shared state every direction receives; the world itself is fixed. */
export interface DirectionProps {
  screen: ChromeScreen
  progress: number
  setProgress: (p: number) => void
  view: GoldenView
  setView: (v: GoldenView) => void
}

/** Product copy facts every direction may draw from. */
export const COURSE = {
  id: '6.1210',
  name: 'Introduction to Algorithms',
  topic: 'Sorting & recurrences',
  student: 'Philote',
  visitor: 'Eddy',
}

export const EVIDENCE = [
  { concept: 'Merge sort invariant', state: 'mastered', source: 'Pset 2, problem 3', page: 3 },
  { concept: 'Master theorem, case 2', state: 'demonstrated', source: 'Lecture 4 notes', page: 12 },
  { concept: 'Recurrence trees', state: 'demonstrated', source: 'Recitation 3', page: 2 },
  { concept: 'Counting sort stability', state: 'touched', source: 'Lecture 5 notes', page: 7 },
  { concept: 'Radix sort bounds', state: 'touched', source: 'Lecture 5 notes', page: 9 },
] as const

export const OTHER_COURSES = [
  { id: '6.1210', name: 'Algorithms', biome: 'ice', progress: 0.5 },
  { id: '18.06', name: 'Linear Algebra', biome: 'meadow', progress: 0.8 },
  { id: '6.1010', name: 'Fundamentals of Programming', biome: 'forest', progress: 0.3 },
  { id: '8.02', name: 'Electricity & Magnetism', biome: 'volcanic', progress: 0.15 },
] as const
