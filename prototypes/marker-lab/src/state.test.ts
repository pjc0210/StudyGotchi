import { describe, expect, it } from 'vitest'
import { ICE_BOUQUET } from './iceBouquet'
import { MARKERS } from './markers'
import { CREATURE_HEIGHT, clampPropCount, stateFromSearch, visibleProps } from './state'

describe('marker lab state', () => {
  it('clamps prop controls to their supported range', () => {
    expect([-2, 2, 3, 4, 9].map(clampPropCount)).toEqual([2, 2, 3, 4, 4])
  })

  it('reveals the bouquet elements in the requested priority order', () => {
    const marker = MARKERS[0]
    expect(visibleProps(marker, 2).map((prop) => prop.id)).toEqual(['snow-mountain', 'red-cap-lighthouse'])
    expect(visibleProps(marker, 3).map((prop) => prop.id)).toEqual(['snow-mountain', 'red-cap-lighthouse', 'pine-trio'])
    expect(visibleProps(marker, 4)).toHaveLength(4)
  })

  it('keeps the optional creature shorter than P3', () => {
    expect(CREATURE_HEIGHT).toBe(4.5)
    expect(CREATURE_HEIGHT).toBeLessThan(4.8)
  })

  it('reads deterministic review state from URL parameters', () => {
    expect(stateFromSearch('?marker=ice-town&props=1&creature=1&night=1&mode=planet')).toMatchObject({
      markerId: 'ice-town',
      mode: 'planet',
    })
    expect(stateFromSearch('?marker=ice-town&props=1&creature=1&night=1&mode=review')).toMatchObject({
      markerId: 'ice-town',
      propCount: 2,
      creature: true,
      night: true,
      mode: 'review',
    })
  })

  it('defines the approved Chilly Village Burst proportions', () => {
    expect(ICE_BOUQUET.name).toBe('Chilly Village Burst')
    expect(ICE_BOUQUET.heights).toEqual({ mountain: 32, pines: 28, lighthouse: 28, houses: 24 })
    expect(ICE_BOUQUET.mountain).toEqual({ peaks: 3, snowCaps: 3, rockFaces: 3, capHeightRatio: 0.48, spread: 13.2 })
    expect(ICE_BOUQUET.houses).toEqual({ count: 2, gablePanels: 2, windows: 2, chimney: true })
    expect(ICE_BOUQUET.base.visibleRim).toBeGreaterThanOrEqual(2.5)
  })
})
