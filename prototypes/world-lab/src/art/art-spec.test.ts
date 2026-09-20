import { describe, expect, it } from 'vitest'
import {
  BAKE_PX,
  MASTER_CELLS,
  SECTIONS,
  SHEET_SPRITES,
  SPRITES,
  SPRITE_VIEW,
  THREAD_PLACES,
  WORLD_PIXEL,
  cellsFor,
  readArtParams,
  writeArtParams,
} from './art-spec'

describe('art params', () => {
  it('falls back to the sprite sheet on day paper', () => {
    expect(readArtParams('')).toEqual({ section: 'sprites', theme: 'day', pixel: 'fixed' })
    expect(readArtParams('?section=nope&theme=dawn&pixel=huge')).toEqual({ section: 'sprites', theme: 'day', pixel: 'fixed' })
  })

  it('round-trips every section and theme', () => {
    for (const { id } of SECTIONS) {
      const search = writeArtParams({ section: id, theme: 'night', pixel: 'scaled' }, '?mode=art&seed=x')
      expect(readArtParams(search)).toEqual({ section: id, theme: 'night', pixel: 'scaled' })
      expect(new URLSearchParams(search).get('seed')).toBe('x')
      expect(new URLSearchParams(search).get('mode')).toBe('art')
    }
  })
})

describe('sprite sheet', () => {
  it('bakes at the world pixel size with a whole number of cells', () => {
    expect(BAKE_PX % WORLD_PIXEL).toBe(0)
    expect(MASTER_CELLS).toBe(48)
    expect(cellsFor(48, 'fixed')).toBe(12)
    expect(cellsFor(96, 'fixed')).toBe(24)
    expect(cellsFor(192, 'fixed')).toBe(48)
    expect(cellsFor(48, 'scaled')).toBe(48)
  })

  it('puts the three residents and two landmarks on the sheet', () => {
    expect(SHEET_SPRITES).toEqual(['pip', 'mochi', 'glyph', 'observatory', 'hut'])
    for (const id of SHEET_SPRITES) expect(SPRITES[id].radius).toBeGreaterThan(0)
  })

  it('looks from the overview camera direction', () => {
    const length = Math.hypot(...SPRITE_VIEW)
    expect(length).toBeCloseTo(1, 2)
    // the overview pose is (10.5, 8.05, 13.5) from its target
    expect(SPRITE_VIEW[0] / SPRITE_VIEW[2]).toBeCloseTo(10.5 / 13.5, 1)
  })
})

describe('accent thread', () => {
  it('names exactly five places', () => {
    expect(THREAD_PLACES).toHaveLength(5)
  })
})
