import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PARAMS,
  TARGETS,
  interactSearch,
  objectState,
  readInteractParams,
} from './interact-spec'

describe('interact params', () => {
  it('falls back to defaults on an empty or malformed query', () => {
    expect(readInteractParams('')).toEqual(DEFAULT_PARAMS)
    expect(readInteractParams('?label=nope&highlight=glow&hover=nobody&open=nobody')).toEqual(DEFAULT_PARAMS)
  })

  it('round-trips every dimension through the query string', () => {
    const params = {
      ...DEFAULT_PARAMS,
      label: 'callout' as const,
      highlight: 'ring' as const,
      panel: 'split' as const,
      motion: 'steps' as const,
      state: 'mastered' as const,
      reduced: true,
      hover: 'pip' as const,
      open: 'observatory' as const,
    }
    const search = interactSearch(params, '?mode=interact&seed=keep')
    expect(search).toContain('mode=interact')
    expect(search).toContain('seed=keep')
    expect(readInteractParams(search)).toEqual(params)
  })

  it('drops hover, open, and rm when they are off', () => {
    const search = interactSearch(DEFAULT_PARAMS)
    expect(search).not.toContain('hover=')
    expect(search).not.toContain('open=')
    expect(search).not.toContain('rm=')
  })
})

describe('object states', () => {
  it('never rise above the course and never fall below touched', () => {
    for (const target of TARGETS) {
      expect(objectState(target, 0.2)).toBe('touched')
      expect(['touched', 'demonstrated']).toContain(objectState(target, 0.5))
    }
    expect(objectState(TARGETS[0], 0.9)).toBe('mastered')
  })
})

describe('copy', () => {
  it('uses no em or en dashes and no emoji', () => {
    for (const target of TARGETS) {
      for (const text of [target.name, target.line, target.evidence, target.source, target.kindLabel]) {
        expect(text).not.toMatch(/[\u2013\u2014]/)
        expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
      }
    }
  })
})
