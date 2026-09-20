import { describe, expect, it } from 'vitest'
import { MARKERS } from './markers'
import { PLANET_MARKER_SCALE, PLANET_RADIUS, planetPlacements } from './planet'

describe('planet marker belt', () => {
  it('seats every roster family on the sphere once', () => {
    const placements = planetPlacements()
    expect(placements.map((entry) => entry.id)).toEqual(MARKERS.map((marker) => marker.id))
    for (const placement of placements) {
      const length = Math.hypot(...placement.position)
      expect(length).toBeCloseTo(PLANET_RADIUS, 5)
    }
  })

  it('keeps bouquet bases from colliding on the belt', () => {
    const placements = planetPlacements()
    const footprint = 16 * PLANET_MARKER_SCALE * 2
    for (let left = 0; left < placements.length; left++) {
      for (let right = left + 1; right < placements.length; right++) {
        const a = placements[left].position
        const b = placements[right].position
        const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
        expect(distance, `${placements[left].id} vs ${placements[right].id}`).toBeGreaterThan(footprint)
      }
    }
  })

  it('keeps the bouquet readable against the planet diameter', () => {
    const visualHeight = 34 * PLANET_MARKER_SCALE
    expect(visualHeight / (PLANET_RADIUS * 2)).toBeGreaterThan(0.1)
    expect(visualHeight / (PLANET_RADIUS * 2)).toBeLessThan(0.22)
  })
})
