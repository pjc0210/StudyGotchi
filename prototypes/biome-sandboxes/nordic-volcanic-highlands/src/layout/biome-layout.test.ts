import { describe, expect, it } from 'vitest'
import {
  NORDIC_LAYOUT,
  ambientEventSchedule,
  bandForProgress,
  buildLayoutExport,
  courseProgress,
  creatureViewportFraction,
  districtChord,
  fogRange,
  generateDistricts,
  landmarkStage,
  minimumDistrictGap,
  progressFromQuery,
  populationFor,
  volcanoProfile,
} from './biome-layout'

const BANDS = [0, 0.25, 0.5, 0.75, 1]
const allAt = (value: number) => Object.fromEntries(NORDIC_LAYOUT.districts.map((d) => [d.id, value]))

describe('fixed geography and seeded districts', () => {
  it('defines a front-facing camera and north-only horizon contract', () => {
    expect(NORDIC_LAYOUT.cameraYawLimit).toBe(35)
    expect(NORDIC_LAYOUT.horizon.northZ).toBeLessThan(-100)
    expect(NORDIC_LAYOUT.horizon.southRim).toBe(false)
  })

  it('keeps hydrology, routes, preserves and lava basin fixed while seed changes districts', () => {
    expect(generateDistricts(NORDIC_LAYOUT, 1)).not.toEqual(generateDistricts(NORDIC_LAYOUT, 7))
    expect(NORDIC_LAYOUT.fjord).toEqual([
      [-12, 148],
      [-35, 59],
      [3, 4],
      [18, -74],
      [25, -145],
    ])
    expect(NORDIC_LAYOUT.routes).toHaveLength(4)
    expect(NORDIC_LAYOUT.preserves).toHaveLength(3)
    expect(NORDIC_LAYOUT.lavaBasin.center).toEqual([67, 70])
  })

  it('keeps every supported seed deterministic, legal, and at least 20 m apart', () => {
    for (let seed = 1; seed <= 99; seed++) {
      const a = generateDistricts(NORDIC_LAYOUT, seed)
      expect(a).toEqual(generateDistricts(NORDIC_LAYOUT, seed))
      expect(minimumDistrictGap(a)).toBeGreaterThanOrEqual(20)
      for (const district of a) {
        const source = NORDIC_LAYOUT.districts.find((d) => d.id === district.id)!
        expect(Math.hypot(district.center[0] - source.center[0], district.center[1] - source.center[1])).toBeLessThanOrEqual(source.jitter + 1e-6)
        expect(Math.abs(district.yawDeg - source.yawDeg)).toBeLessThanOrEqual(source.yawJitter + 1e-6)
      }
    }
  })

  it('keeps lava geographically isolated to the boat-only archipelago', () => {
    expect(NORDIC_LAYOUT.districts.filter((d) => d.material === 'lava').map((d) => d.id)).toEqual(['archipelago'])
    expect(NORDIC_LAYOUT.lavaBasin.roadConnected).toBe(false)
    expect(NORDIC_LAYOUT.lavaBasin.islets).toHaveLength(3)
  })
})

describe('population, landmark and environmental skyline progression', () => {
  it('frames authored district silhouettes with their shoreline and terrain context', () => {
    expect(NORDIC_LAYOUT.districts.map(districtChord)).toEqual([84, 62, 62, 66, 80])
  })

  it('accepts deterministic URL progress stages and clamps malformed values', () => {
    expect([null, '0', '0.5', '1', '-4', '3', 'nope'].map(progressFromQuery)).toEqual([
      0.75,
      0,
      0.5,
      1,
      0,
      1,
      0.75,
    ])
  })

  it('uses five population bands without changing district footprints', () => {
    expect([0, 0.1, 0.25, 0.49, 0.5, 0.75, 1].map(bandForProgress)).toEqual([0, 0, 1, 1, 2, 3, 4])
    for (const district of NORDIC_LAYOUT.districts) {
      const counts = BANDS.map((p) => populationFor(district, p).structures)
      expect(counts).toEqual(district.population)
      for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
    }
  })

  it('grows cairn to ring observatory to aurora beacon independently of the volcano', () => {
    expect([0, 0.25, 0.5, 0.99, 1].map(landmarkStage)).toEqual(['cairn', 'cairn', 'ring', 'ring', 'beacon'])
    const profiles = BANDS.map(volcanoProfile)
    expect(profiles.map((p) => p.shoulders)).toEqual([3, 5, 7, 9, 11])
    expect(profiles.map((p) => p.height)).toEqual([8, 11, 15, 18, 22])
    expect(profiles[4].glowArc).toBeLessThanOrEqual(0.08)
    expect(NORDIC_LAYOUT.landmark.center).not.toEqual(NORDIC_LAYOUT.volcanoFoot)
  })

  it('meets the creature scale rule at the district station', () => {
    const fraction = creatureViewportFraction(NORDIC_LAYOUT.creatureHeight * NORDIC_LAYOUT.creatureScale, 42, 0.75, 16 / 9, 28)
    expect(fraction).toBeGreaterThanOrEqual(0.06)
    expect(NORDIC_LAYOUT.creatureHeight * NORDIC_LAYOUT.creatureScale).toBeLessThan(3)
  })
})

describe('ambient events and export', () => {
  it('keeps the distant skyline legible across the full dolly range', () => {
    expect(fogRange(400, true)).toEqual({ near: 560, far: 1300 })
    expect(fogRange(650, true)).toEqual({ near: 810, far: 1550 })
    expect(fogRange(650, false)).toEqual({ near: 950, far: 1850 })
  })

  it('schedules sparse boat and geyser events deterministically', () => {
    const events = ambientEventSchedule(7, 8)
    expect(events).toEqual(ambientEventSchedule(7, 8))
    expect(events.some((e) => e.kind === 'boat')).toBe(true)
    expect(events.some((e) => e.kind === 'geyser')).toBe(true)
    for (let i = 1; i < events.length; i++) expect(events[i].startAt).toBeGreaterThan(events[i - 1].startAt)
  })

  it('exports procedural inputs and realised seeded districts', () => {
    const out = buildLayoutExport(NORDIC_LAYOUT, allAt(0.5), 99, { station: 'overview' })
    expect(out.version).toBe(4)
    expect(out.biome).toBe('nordic-volcanic-highlands')
    expect(out.direction).toBe('A — Fjord First / Ashen Homesteads')
    expect(out.districts).toEqual(generateDistricts(NORDIC_LAYOUT, 99))
    expect(out.progress.landmark).toBe('ring')
    expect(out.progress.volcano.shoulders).toBe(7)
    expect(courseProgress(NORDIC_LAYOUT, allAt(0.5))).toBe(0.5)
  })
})
