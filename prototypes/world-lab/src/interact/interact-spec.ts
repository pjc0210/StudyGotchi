import type { HighlightMode } from '../golden/GoldenIceScene'
import { GOLDEN_RESIDENTS, progressState } from '../golden/golden-spec'

/** Where the landmarks stand; mirrors GOLDEN_LANDMARKS in GoldenIceScene.tsx. */
const LANDMARKS = {
  observatory: [1.9, 0.67, -1.45] as [number, number, number],
  hutA: [-3.2, 0.65, -1.28] as [number, number, number],
  hutB: [-2.36, 0.65, -2.35] as [number, number, number],
}

export type LabelMode = 'tag' | 'bubble' | 'callout' | 'none'
export type PanelMode = 'side' | 'sheet' | 'anchored' | 'split'
export type MotionMode = 'reveal' | 'spring' | 'steps' | 'none'
export type StateKey = 'touched' | 'demonstrated' | 'mastered'
export type InteractId = 'pip' | 'mochi' | 'glyph' | 'observatory' | 'hut-a' | 'hut-b'

export const LABEL_MODES: LabelMode[] = ['tag', 'bubble', 'callout', 'none']
export const HIGHLIGHT_MODES: HighlightMode[] = ['outline', 'rim', 'ring', 'lift', 'none']
export const PANEL_MODES: PanelMode[] = ['side', 'sheet', 'anchored', 'split']
export const MOTION_MODES: MotionMode[] = ['reveal', 'spring', 'steps', 'none']

export const STATES: { key: StateKey; label: string; value: number; note: string }[] = [
  { key: 'touched', label: 'Touched', value: 0.2, note: 'Lecture opened' },
  { key: 'demonstrated', label: 'Demonstrated', value: 0.5, note: 'Problem solved' },
  { key: 'mastered', label: 'Mastered', value: 0.9, note: 'Assessment confirmed' },
]

export interface InteractTarget {
  id: InteractId
  name: string
  kind: 'resident' | 'landmark'
  /** what it is, for the eyebrow: "Ice bird", "Observatory" */
  kindLabel: string
  position: [number, number, number]
  /** how far above the object's base the label anchors, in world units */
  anchorHeight: number
  /** speaker accent from the world roster; landmarks have none */
  accent: string | null
  line: string
  evidence: string
  source: string
  page: number
  /** how many stages this object trails the course progress */
  lag: 0 | 1 | 2
}

const [pip, mochi, glyph] = GOLDEN_RESIDENTS

export const TARGETS: InteractTarget[] = [
  {
    id: 'pip',
    name: pip.name,
    kind: 'resident',
    kindLabel: 'Ice bird',
    position: [...pip.position],
    anchorHeight: 1.3,
    accent: pip.accent,
    line: pip.line,
    evidence: 'Merge sort invariant, graded correct',
    source: 'pset 2 · problem 3',
    page: 14,
    lag: 0,
  },
  {
    id: 'mochi',
    name: mochi.name,
    kind: 'resident',
    kindLabel: 'Snow blob',
    position: [...mochi.position],
    anchorHeight: 1.4,
    accent: mochi.accent,
    line: mochi.line,
    evidence: 'Master theorem, case two, applied cleanly',
    source: 'pset 4 · problem 1',
    page: 3,
    lag: 1,
  },
  {
    id: 'glyph',
    name: glyph.name,
    kind: 'resident',
    kindLabel: 'Book beetle',
    position: [...glyph.position],
    anchorHeight: 1.15,
    accent: glyph.accent,
    line: glyph.line,
    evidence: 'Counting sort stability, worked example',
    source: 'lecture 7 · notes',
    page: 21,
    lag: 0,
  },
  {
    id: 'observatory',
    name: 'The observatory',
    kind: 'landmark',
    kindLabel: 'Observatory',
    position: LANDMARKS.observatory,
    anchorHeight: 2.7,
    accent: null,
    line: 'The observatory. Lit from the inside since problem set two.',
    evidence: 'Sorting and recurrences, demonstrated',
    source: 'pset 2 · problem 3',
    page: 9,
    lag: 0,
  },
  {
    id: 'hut-a',
    name: 'The reading hut',
    kind: 'landmark',
    kindLabel: 'Study cabin',
    position: LANDMARKS.hutA,
    anchorHeight: 1.5,
    accent: null,
    line: 'The reading hut. Nobody has left since lecture four.',
    evidence: 'Divide and conquer, lecture opened',
    source: 'lecture 4 · slides',
    page: 6,
    lag: 1,
  },
  {
    id: 'hut-b',
    name: 'The scratch hut',
    kind: 'landmark',
    kindLabel: 'Study cabin',
    position: LANDMARKS.hutB,
    anchorHeight: 1.5,
    accent: null,
    line: 'The scratch hut. Every wall is a recurrence tree.',
    evidence: 'Recurrence trees, drawn twice',
    source: 'recitation 3 · board',
    page: 2,
    lag: 2,
  },
]

export const TARGET_BY_ID: Record<string, InteractTarget> = Object.fromEntries(
  TARGETS.map((target) => [target.id, target]),
)

export function isInteractId(value: string | null): value is InteractId {
  return value !== null && value in TARGET_BY_ID
}

/** Where a label hangs: the object's base plus its anchor height. */
export function anchorPoint(target: InteractTarget): [number, number, number] {
  return [target.position[0], target.position[1] + target.anchorHeight, target.position[2]]
}

const STAGE_ORDER: StateKey[] = ['touched', 'demonstrated', 'mastered']

/** Each object trails the course by its lag, so the sheet shows a spread of states. */
export function objectState(target: InteractTarget, progress: number): StateKey {
  const index = STAGE_ORDER.indexOf(progressState(progress).stage)
  return STAGE_ORDER[Math.max(0, index - target.lag)]
}

export interface InteractParams {
  label: LabelMode
  highlight: HighlightMode
  panel: PanelMode
  motion: MotionMode
  state: StateKey
  reduced: boolean
  /** pins the hovered object so a hover state can be deep-linked */
  hover: InteractId | null
  open: InteractId | null
}

export const DEFAULT_PARAMS: InteractParams = {
  label: 'callout',
  highlight: 'rim',
  panel: 'side',
  motion: 'reveal',
  state: 'demonstrated',
  reduced: false,
  hover: null,
  open: null,
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function readInteractParams(search: string): InteractParams {
  const p = new URLSearchParams(search)
  const hover = p.get('hover')
  const open = p.get('open')
  return {
    label: pick(p.get('label'), LABEL_MODES, DEFAULT_PARAMS.label),
    highlight: pick(p.get('highlight'), HIGHLIGHT_MODES, DEFAULT_PARAMS.highlight),
    panel: pick(p.get('panel'), PANEL_MODES, DEFAULT_PARAMS.panel),
    motion: pick(p.get('motion'), MOTION_MODES, DEFAULT_PARAMS.motion),
    state: pick(p.get('state'), STAGE_ORDER, DEFAULT_PARAMS.state),
    reduced: p.get('rm') === '1',
    hover: isInteractId(hover) ? hover : null,
    open: isInteractId(open) ? open : null,
  }
}

export function interactSearch(params: InteractParams, current = ''): string {
  const p = new URLSearchParams(current)
  p.set('mode', 'interact')
  p.set('label', params.label)
  p.set('highlight', params.highlight)
  p.set('panel', params.panel)
  p.set('motion', params.motion)
  p.set('state', params.state)
  if (params.reduced) p.set('rm', '1')
  else p.delete('rm')
  if (params.hover) p.set('hover', params.hover)
  else p.delete('hover')
  if (params.open) p.set('open', params.open)
  else p.delete('open')
  return `?${p.toString()}`
}

export function writeInteractParams(params: InteractParams) {
  window.history.replaceState(null, '', interactSearch(params, window.location.search))
}

export function stateOf(key: StateKey) {
  return STATES.find((stage) => stage.key === key) ?? STATES[1]
}
