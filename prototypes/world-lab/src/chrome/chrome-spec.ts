import type { GoldenView } from '../golden/golden-spec'

export type ChromeDirection = 'a' | 'b' | 'c'
export type ChromeScreen = 'landing' | 'world' | 'visit'

export const DIRECTIONS: Record<ChromeDirection, { name: string; plan: string }> = {
  a: { name: 'Paper & Pixel', plan: 'docs/design/site/directions/a-paper-and-pixel.md' },
  b: { name: 'Modern DS', plan: 'docs/design/site/directions/b-modern-ds.md' },
  c: { name: 'Sticker Toybox', plan: 'docs/design/site/directions/c-sticker-toybox.md' },
}

export const SCREENS: ChromeScreen[] = ['landing', 'world', 'visit']

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

export const PALETTES = ['cream', 'sand', 'snow', 'lilac', 'mint', 'dusk', 'stone', 'night'] as const
export const ACCENTS = ['coral', 'mint', 'light', 'olive', 'ice'] as const
export type ChromePalette = (typeof PALETTES)[number]
export type ChromeAccent = (typeof ACCENTS)[number]

export interface ChromeParams {
  dir: ChromeDirection
  screen: ChromeScreen
  palette: ChromePalette
  accent: ChromeAccent
}

const pick = <T extends string>(list: readonly T[], value: string | null, fallback: T): T =>
  value !== null && (list as readonly string[]).includes(value) ? (value as T) : fallback

export function readChromeParams(): ChromeParams {
  const p = new URLSearchParams(window.location.search)
  return {
    dir: pick(['a', 'b', 'c'] as const, p.get('dir'), 'a'),
    screen: pick(SCREENS, p.get('screen'), 'landing'),
    palette: pick(PALETTES, p.get('palette'), 'cream'),
    accent: pick(ACCENTS, p.get('accent'), 'coral'),
  }
}

export function writeChromeParams(params: ChromeParams) {
  const p = new URLSearchParams(window.location.search)
  p.set('mode', 'chrome')
  p.set('dir', params.dir)
  p.set('screen', params.screen)
  p.set('palette', params.palette)
  p.set('accent', params.accent)
  window.history.replaceState(null, '', `?${p.toString()}`)
}
