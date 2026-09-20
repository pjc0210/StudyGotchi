import { describe, expect, it } from 'vitest'
import { STATIONS, clampBiomeYaw, defaultOverride, poseFor } from '../camera/stations'
import {
  JUNGLE_LAYOUT,
  birdSchedule,
  buildJungleExport,
  canopyHorizon,
  courseProgress,
  creatureViewportFraction,
  districtGap,
  landmarkStage,
  populationFor,
  seededDistricts,
  skylineProfile,
} from './jungle-layout'

const BANDS = [0, 0.25, 0.5, 0.75, 1]
const allAt = (value: number) => Object.fromEntries(JUNGLE_LAYOUT.districts.map((d) => [d.id, value]))

describe('fixed jungle world plan', () => {
  it('locks the waterfall, river, lagoon, crossings, clearings, and shrine headland', () => {
    expect(JUNGLE_LAYOUT.field).toEqual([288, 264])
    expect(JUNGLE_LAYOUT.hydrology.waterfall).toEqual([22, -118])
    expect(JUNGLE_LAYOUT.hydrology.riverWidth).toBe(9.5)
    expect(JUNGLE_LAYOUT.hydrology.wetWidth).toBe(14)
    expect(JUNGLE_LAYOUT.hydrology.lagoon.size).toEqual([62, 52])
    expect(JUNGLE_LAYOUT.bridges.map((b) => b.length)).toEqual([27, 18])
    expect(JUNGLE_LAYOUT.clearings.map((c) => c.size)).toEqual([
      [38, 24],
      [32, 26],
      [36, 26],
    ])
    expect(JUNGLE_LAYOUT.headland).toEqual({ center: [102, 80], size: [34, 42] })
  })

  it('builds a north/back skyline with fogged east/west wings and no front enclosure', () => {
    expect(JUNGLE_LAYOUT.horizon.orientation).toBe('north-back')
    expect(JUNGLE_LAYOUT.horizon.primary).toEqual({ z: [-136, -104], height: [14, 24] })
    expect(JUNGLE_LAYOUT.horizon.secondary).toEqual({ z: [-164, -132], height: [10, 15] })
    expect(JUNGLE_LAYOUT.horizon.wings).toEqual({ x: [-190, 190], taperFrom: 104 })
    expect(JUNGLE_LAYOUT.horizon.fog).toEqual({ startsBehindPrimary: 18, opaqueAfter: 58 })
    const trees = canopyHorizon(7, 0.75)
    expect(trees.every((tree) => tree.z < -68)).toBe(true)
    expect(trees.some((tree) => Math.abs(tree.x) > 132)).toBe(true)
    expect(trees.some((tree) => tree.row === 1)).toBe(true)
    expect(trees.some((tree) => tree.row === 2)).toBe(true)
  })
})

describe('front-facing diorama camera', () => {
  it('keeps every station south/front, pitched 34–40 degrees, and yaw-limited', () => {
    for (const station of Object.values(STATIONS)) {
      expect(station.pitchDeg).toBeGreaterThanOrEqual(34)
      expect(station.pitchDeg).toBeLessThanOrEqual(40)
      expect(Math.abs(station.azimuthDeg)).toBeLessThanOrEqual(35)
    }
    expect(clampBiomeYaw(-90)).toBe(-35)
    expect(clampBiomeYaw(90)).toBe(35)
    expect(clampBiomeYaw(12)).toBe(12)
  })

  it('stays in front at yaw −35/0/+35 for default and max dolly', () => {
    const subject = { center: [0, 0, 0] as [number, number, number], chord: 190 }
    for (const azimuthDeg of [-35, 0, 35]) {
      for (const dolly of [1, 1.55]) {
        const pose = poseFor(
          STATIONS.overview,
          { ...defaultOverride(STATIONS.overview), azimuthDeg, dolly },
          subject,
          16 / 9,
        )
        expect(pose.position[2]).toBeGreaterThan(pose.target[2])
      }
    }
  })
})

describe('seeded district synthesis', () => {
  it('jitter/yaw changes for seeds 1, 7, and 99 while fixed systems never move', () => {
    const variants = [1, 7, 99].map((seed) => seededDistricts(seed))
    expect(variants[0]).not.toEqual(variants[1])
    expect(variants[1]).not.toEqual(variants[2])
    for (const variant of variants) {
      for (const d of variant) {
        const spec = JUNGLE_LAYOUT.districts.find((candidate) => candidate.id === d.id)!
        expect(Math.abs(d.center[0] - spec.center[0])).toBeLessThanOrEqual(spec.jitter[0])
        expect(Math.abs(d.center[1] - spec.center[1])).toBeLessThanOrEqual(spec.jitter[1])
        expect(Math.abs(d.yaw - spec.yaw)).toBeLessThanOrEqual(spec.yawJitter)
      }
      for (let i = 0; i < variant.length; i++) {
        for (let j = i + 1; j < variant.length; j++) {
          expect(districtGap(variant[i], variant[j]), `${variant[i].id}–${variant[j].id}`).toBeGreaterThanOrEqual(20)
        }
      }
    }
    expect(JUNGLE_LAYOUT.hydrology.waterfall).toEqual([22, -118])
    expect(JUNGLE_LAYOUT.bridges[0].a).toEqual([5, -54])
  })
})

describe('growth and scale', () => {
  it('uses monotonic five-band populations for all districts', () => {
    for (const district of JUNGLE_LAYOUT.districts) {
      const counts = BANDS.map((progress) => populationFor(district, progress).structures)
      expect(populationFor(district, 0).primary).toBe(0)
      expect(counts[1]).toBeGreaterThan(0)
      expect(counts[4]).toBeGreaterThanOrEqual(counts[3])
      for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
    }
  })

  it('grows only the canopy skyline while keeping ground fixed', () => {
    const profiles = BANDS.map(skylineProfile)
    expect(new Set(profiles.map((p) => p.groundHeight))).toEqual(new Set([0]))
    for (let i = 1; i < profiles.length; i++) {
      expect(profiles[i].crowns).toBeGreaterThanOrEqual(profiles[i - 1].crowns)
      expect(profiles[i].maxHeight).toBeGreaterThanOrEqual(profiles[i - 1].maxHeight)
    }
    expect(profiles[4].emergents).toBe(2)
  })

  it('advances the Root-Crown shrine through stake, s1, s2, and s3', () => {
    expect(landmarkStage(0)).toBe('stake')
    expect(landmarkStage(0.25)).toBe('s1')
    expect(landmarkStage(0.5)).toBe('s2')
    expect(landmarkStage(1)).toBe('s3')
  })

  it('keeps creatures at least six percent tall at district framing', () => {
    for (const district of JUNGLE_LAYOUT.districts) {
      const fraction = creatureViewportFraction(
        JUNGLE_LAYOUT.creature.height * JUNGLE_LAYOUT.creature.scale,
        district.cameraChord,
        0.72,
        16 / 9,
        30,
      )
      expect(fraction, district.id).toBeGreaterThanOrEqual(0.06)
    }
  })
})

describe('ambient schedule and export', () => {
  it('schedules short deterministic bird events separated by quiet intervals', () => {
    const schedule = birdSchedule(7)
    expect(schedule).toEqual(birdSchedule(7))
    expect(schedule).not.toEqual(birdSchedule(99))
    for (let i = 1; i < schedule.length; i++) {
      const gap = schedule[i].startAt - (schedule[i - 1].startAt + schedule[i - 1].duration)
      expect(gap).toBeGreaterThanOrEqual(18)
      expect(gap).toBeLessThanOrEqual(42)
    }
  })

  it('exports the direction, fixed plan, synthesis, stages, and camera state', () => {
    const progress = allAt(0.5)
    const exported = buildJungleExport(7, progress, { station: 'overview' })
    expect(exported.version).toBe(1)
    expect(exported.direction).toBe('River-Canopy Commons')
    expect(exported.courseProgress).toBe(0.5)
    expect(exported.landmark).toBe('s2')
    expect(exported.skyline.groundHeight).toBe(0)
    expect(exported.districts).toHaveLength(5)
    expect(courseProgress(progress)).toBe(0.5)
  })
})
