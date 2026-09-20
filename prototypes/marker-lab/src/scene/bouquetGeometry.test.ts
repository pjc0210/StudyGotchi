import { describe, expect, it } from 'vitest'
import {
  BASE_HEIGHT,
  BASE_RADIUS,
  BOUQUET_PLACEMENTS,
  SNOW_CAP_THICKNESS,
  TERRAIN_RADIUS,
  projectedCrownRadius,
  terrainLobes,
} from './bouquetGeometry'

describe('landscape bouquet geometry', () => {
  it('uses one visible circular base with a thin snow cap', () => {
    expect(BASE_RADIUS).toBe(16)
    expect(BASE_HEIGHT).toBe(2.4)
    expect(SNOW_CAP_THICKNESS).toBe(0.08)
    expect(TERRAIN_RADIUS).toBe(13)
    expect(BASE_RADIUS - TERRAIN_RADIUS).toBeGreaterThanOrEqual(2.5)
  })

  it('fans oversized Ice structures outward at bouquet scale', () => {
    expect(BOUQUET_PLACEMENTS.map(({ id, height }) => [id, height])).toEqual([
      ['mountain', 32],
      ['lighthouse', 28],
      ['pines', 28],
      ['houses', 24],
    ])
    const xs = BOUQUET_PLACEMENTS.map(({ position }) => position[0])
    const zs = BOUQUET_PLACEMENTS.map(({ position }) => position[2])
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(13)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(7)
    const mountain = BOUQUET_PLACEMENTS.find(({ id }) => id === 'mountain')!
    expect(Math.abs(mountain.position[0])).toBeLessThan(2)
    expect(mountain.position[2]).toBeLessThan(-6)
  })

  it('anchors only the bases while every crown curves beyond the platform edge', () => {
    for (const placement of BOUQUET_PLACEMENTS) {
      expect(Math.hypot(placement.position[0], placement.position[2]), `${placement.id} base`).toBeLessThan(TERRAIN_RADIUS)
      expect(projectedCrownRadius(placement), `${placement.id} crown`).toBeGreaterThan(BASE_RADIUS)
      expect(placement.outwardLean, `${placement.id} minimum lean`).toBeGreaterThanOrEqual(0.14)
      expect(placement.outwardLean, `${placement.id} maximum lean`).toBeLessThanOrEqual(0.22)
    }
  })

  it('connects every structure with one asymmetric terrain mass', () => {
    const lobes = terrainLobes()
    expect(lobes).toHaveLength(6)
    for (const placement of BOUQUET_PLACEMENTS) {
      expect(lobes.some((lobe) => Math.hypot(lobe.position[0] - placement.position[0], lobe.position[2] - placement.position[2]) < lobe.radius)).toBe(true)
    }
  })
})
