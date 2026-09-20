import { describe, expect, it } from 'vitest'
import { STATIONS, defaultOverride, poseFor } from '../camera/stations'
import {
  COASTAL_RUINS_LAYOUT as L,
  DIORAMA_VIEWS,
  bandForProgress,
  buildLayoutExport,
  courseProgress,
  creatureViewportFraction,
  districtCentre,
  districtGap,
  landmarkStage,
  maxBuildings,
  populationFor,
  seededDistrictPlan,
  skylineProfile,
} from './biome-layout'
import {
  boatRouteClearance,
  districtSlots,
  fixedWorldFingerprint,
  landField,
  sampleTerrain,
  seaStacks,
} from './terrain'

const BANDS = [0, 0.25, 0.5, 0.75, 1]
const allAt = (value: number) => Object.fromEntries(L.districts.map((district) => [district.id, value]))

describe('seeded coastal variation', () => {
  it('is deterministic and visibly different for seeds 1, 7, and 99', () => {
    for (const seed of [1, 7, 99]) expect(seededDistrictPlan(L, seed)).toEqual(seededDistrictPlan(L, seed))
    expect(seededDistrictPlan(L, 1)).not.toEqual(seededDistrictPlan(L, 7))
    expect(seededDistrictPlan(L, 7)).not.toEqual(seededDistrictPlan(L, 99))
  })

  it('bounds anchor jitter and yaw while fixed world systems never change', () => {
    const fingerprint = fixedWorldFingerprint(L)
    for (const seed of [1, 7, 99]) {
      const plan = seededDistrictPlan(L, seed)
      expect(fixedWorldFingerprint(L)).toBe(fingerprint)
      for (const district of L.districts) {
        const placed = plan[district.id]
        expect(Math.abs(placed.center[0] - district.nominalCenter[0])).toBeLessThanOrEqual(district.jitter[0])
        expect(Math.abs(placed.center[1] - district.nominalCenter[1])).toBeLessThanOrEqual(district.jitter[1])
        expect(Math.abs(placed.yawDeg)).toBeLessThanOrEqual(district.yawRange)
      }
    }
  })
})

describe('fixed districts and water corridors', () => {
  it('encodes the corrected plan v3 fog and front-diorama contract', () => {
    expect(L.planVersion).toBe(3)
    expect(L.fog).toEqual({ near: 210, far: 310 })
  })

  it('keeps at least 20 m between all fixed district catchments', () => {
    for (let i = 0; i < L.districts.length; i++) {
      for (let j = i + 1; j < L.districts.length; j++) {
        expect(districtGap(L.districts[i], L.districts[j]), `${L.districts[i].id}–${L.districts[j].id}`).toBeGreaterThanOrEqual(20)
      }
    }
  })

  it('keeps the landmark headland isolated by a navigable channel', () => {
    const [hx, hz] = L.headland.center
    expect(landField(L, hx, hz)).toBeGreaterThan(0)
    let waterSamples = 0
    for (let t = 0.18; t <= 0.82; t += 0.04) {
      const x = 86 + (hx - 86) * t
      const z = 61 + (hz - 61) * t
      if (['sea', 'shallows', 'ruin-bed'].includes(sampleTerrain(L, x, z).material)) waterSamples++
    }
    // 0.04 samples are ~1.5 m apart, so six consecutive water samples preserve the 9 m channel.
    expect(waterSamples).toBeGreaterThanOrEqual(6)
  })

  it('keeps all three sea routes open and outside mainland rock', () => {
    expect(L.boatRoutes).toHaveLength(3)
    for (const route of L.boatRoutes) {
      expect(boatRouteClearance(L, route), route.id).toBeGreaterThanOrEqual(4)
      for (const [x, z] of route.points.slice(1, -1)) {
        expect(['sea', 'shallows', 'ruin-bed'], route.id).toContain(sampleTerrain(L, x, z).material)
      }
    }
  })
})

describe('front-facing diorama camera', () => {
  it('covers yaw −35/0/+35 at default and max dolly with north/back closure', () => {
    expect(DIORAMA_VIEWS.map((view) => [view.yaw, view.dolly])).toEqual([
      [-35, 1], [0, 1], [35, 1], [-35, 1.55], [0, 1.55], [35, 1.55],
    ])
    for (const view of DIORAMA_VIEWS) {
      expect(view.backBlockerHeight, `${view.yaw}° @ ${view.dolly}×`).toBeGreaterThanOrEqual(8)
      expect(view.sideFog).toBe(true)
    }
  })

  it('always stays south/front looking north, within yaw and pitch limits', () => {
    for (const station of Object.values(STATIONS)) {
      expect(station.pitchDeg).toBeGreaterThanOrEqual(34)
      expect(station.pitchDeg).toBeLessThanOrEqual(40)
      expect(Math.abs(station.azimuthDeg)).toBeLessThanOrEqual(35)
    }
    for (const yaw of [-35, 0, 35]) {
      for (const dolly of [1, 1.55]) {
        const camera = { ...defaultOverride(STATIONS.overview), azimuthDeg: yaw, dolly }
        const pose = poseFor(STATIONS.overview, camera, { center: [0, 0, 0], chord: L.frameRadius * 2 }, 16 / 9)
        expect(pose.position[2], `${yaw}° @ ${dolly}×`).toBeGreaterThan(pose.target[2])
        expect(Math.hypot(...pose.position)).toBeLessThanOrEqual(133)
      }
    }
  })

  it('places islet stacks only on east/west sides, never under the front camera', () => {
    const stacks = seaStacks()
    expect(stacks.length).toBeGreaterThanOrEqual(12)
    for (const stack of stacks) expect(Math.abs(stack.x)).toBeGreaterThanOrEqual(120)
  })
})

describe('population growth and camera scale', () => {
  it('gives the cliff village and dry terraces three fixed authored elevations', () => {
    const cliffHeights = [-70, -55, -38].map((z) => sampleTerrain(L, -26, z).height)
    const dryHeights = [55, 72, 90].map((x) => sampleTerrain(L, x, -58).height)
    expect(new Set(cliffHeights.map((height) => height.toFixed(2))).size).toBe(3)
    expect(new Set(dryHeights.map((height) => height.toFixed(2))).size).toBe(3)
    expect(sampleTerrain(L, -12, 38).material).toBe('ruin-bed')
  })

  it('uses five monotonic population bands without moving district ground', () => {
    expect(BANDS.map(bandForProgress)).toEqual([0, 1, 2, 3, 4])
    for (const district of L.districts) {
      const buildings = BANDS.map((progress) => populationFor(district, progress).buildings)
      for (let i = 1; i < buildings.length; i++) expect(buildings[i]).toBeGreaterThanOrEqual(buildings[i - 1])
      expect(buildings[0]).toBe(0)
      expect(buildings[4]).toBe(maxBuildings(district))
      expect(districtSlots(L, district, 7)).toHaveLength(maxBuildings(district))
      const [x, z] = districtCentre(district)
      const heights = BANDS.map((progress) => sampleTerrain(L, x, z, skylineProfile(progress)).height)
      expect(new Set(heights.map((height) => height.toFixed(5))).size).toBe(1)
    }
  })

  it('grows only the skyline profile and advances landmark s1/s2/s3', () => {
    expect(BANDS.map((progress) => skylineProfile(progress).shoulders)).toEqual([3, 4, 6, 8, 9])
    expect(BANDS.map((progress) => skylineProfile(progress).height)).toEqual([8, 10, 13, 16, 18])
    expect(skylineProfile(0.75).secondRowOpacity).toBeGreaterThan(0)
    expect(skylineProfile(1).slitMasses).toBe(4)
    expect([0, 0.32, 0.33, 0.66, 0.67, 1].map(landmarkStage)).toEqual(['s1', 's1', 's2', 's2', 's3', 's3'])
  })

  it('keeps creatures readable at every district station', () => {
    for (const aspect of [16 / 9, 4 / 3]) {
      for (const district of L.districts) {
        const fraction = creatureViewportFraction(
          L.creatureHeight * L.creatureScale,
          district.cameraChord,
          STATIONS.district.fitWidth ?? 0.75,
          aspect,
          STATIONS.district.pitchDeg,
        )
        expect(fraction, `${district.id} at ${aspect.toFixed(2)}`).toBeGreaterThanOrEqual(0.06)
      }
    }
    expect(L.creatureHeight * L.creatureScale).toBeLessThan(3.5)
  })

  it('exports fixed systems, seeded districts, skyline, landmark, and camera', () => {
    const exported = buildLayoutExport(L, allAt(1), 99, { station: 'overview' })
    expect(exported.version).toBe(4)
    expect(exported.biome).toBe('coastal-ruins')
    expect(exported.districts).toHaveLength(5)
    expect(exported.seed).toBe(99)
    expect(exported.skyline.slitMasses).toBe(4)
    expect(exported.landmark).toBe('s3')
    expect(exported.boatRoutes).toHaveLength(3)
    expect(courseProgress(L, allAt(1))).toBe(1)
  })
})
