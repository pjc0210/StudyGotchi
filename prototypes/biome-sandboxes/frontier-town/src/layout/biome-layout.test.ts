import { describe, expect, it } from 'vitest'
import {
  FRONTIER_LAYOUT as L,
  buildLayoutExport,
  creatureViewportFraction,
  dioramaCameraPose,
  districtGap,
  generateLayout,
  landmarkStage,
  populationFor,
  skylineCoverage,
  skylineProfile,
} from './biome-layout'

const BANDS = [0, 0.25, 0.5, 0.75, 1]

describe('Frontier Town growth', () => {
  it('uses the five population bands monotonically while anchors remain at zero', () => {
    for (const district of L.districts) {
      const populations = BANDS.map((progress) => populationFor(district, progress))
      expect(populations[0].buildings, district.id).toBe(0)
      const buildings = populations.map((p) => p.buildings)
      expect(buildings).toEqual(buildings.toSorted((a, b) => a - b))
      expect(populations[4].extras).toBe(true)
    }
    expect(landmarkStage(0.25)).toBe('s1')
    expect(landmarkStage(0.5)).toBe('s2')
    expect(landmarkStage(1)).toBe('s3')
  })
})

describe('seeded district placement', () => {
  it('is deterministic for one seed and visibly varies seeds 1, 7, and 99', () => {
    expect(generateLayout(7)).toEqual(generateLayout(7))
    const variants = [1, 7, 99].map((seed) => generateLayout(seed).districts)
    expect(new Set(variants.map((v) => JSON.stringify(v))).size).toBe(3)
  })

  it('keeps fixed canyon, water, arroyo, and rail geometry fixed across seeds', () => {
    const fixed = [1, 7, 99].map((seed) => generateLayout(seed).fixed)
    expect(fixed[1]).toEqual(fixed[0])
    expect(fixed[2]).toEqual(fixed[0])
    expect(fixed[0].railCorridor).toEqual({ minX: 52, maxX: 66 })
    expect(fixed[0].waterhole).toEqual({ center: [-95, 84], size: [22, 16] })
  })

  it('preserves at least 20 m between non-rail districts for seeds 1, 7, and 99', () => {
    for (const seed of [1, 7, 99]) {
      const generated = generateLayout(seed)
      for (let i = 0; i < generated.districts.length; i++) {
        for (let j = i + 1; j < generated.districts.length; j++) {
          const a = generated.districts[i]
          const b = generated.districts[j]
          if (a.id === 'outskirts-reserve' || b.id === 'outskirts-reserve') continue
          expect(districtGap(a, b), `${seed}: ${a.id}–${b.id}`).toBeGreaterThanOrEqual(20)
        }
      }
    }
  })

  it('protects rail operations, future envelopes, animal runs, and central preserve', () => {
    const generated = generateLayout(99)
    expect(generated.protected.railOperations.size).toEqual([24, 22])
    expect(generated.protected.centralPreserve.size).toEqual([50, 22])
    expect(generated.protected.animalRuns).toHaveLength(2)
    expect(generated.protected.animalRuns.every((run) => run.size[0] >= 24 && run.size[1] >= 18)).toBe(true)
    expect(generated.protected.futureEnvelopes.every((future) => future.blank)).toBe(true)
    expect(generated.districts.find((d) => d.id === 'outskirts-reserve')?.center[0]).toBeGreaterThan(66)
  })
})

describe('camera and horizon acceptance', () => {
  it.each([
    { dolly: 1, yaw: -35, cameraZ: 135, targetX: -126.2, targetZ: -45.2 },
    { dolly: 1, yaw: 0, cameraZ: 135, targetX: 0, targetZ: -85 },
    { dolly: 1, yaw: 35, cameraZ: 135, targetX: 126.2, targetZ: -45.2 },
    { dolly: 1.35, yaw: -35, cameraZ: 155, targetX: -137.7, targetZ: -41.6 },
    { dolly: 1.35, yaw: 0, cameraZ: 155, targetX: 0, targetZ: -85 },
    { dolly: 1.35, yaw: 35, cameraZ: 155, targetX: 137.7, targetZ: -41.6 },
  ])('matches the v4 $yaw° / $dolly× front-camera station', ({ dolly, yaw, cameraZ, targetX, targetZ }) => {
    const pose = dioramaCameraPose(yaw, dolly)
    expect(pose.cameraGround[0]).toBeCloseTo(0, 3)
    expect(pose.cameraGround[1]).toBeCloseTo(cameraZ, 3)
    expect(pose.position[2]).toBeCloseTo(cameraZ, 3)
    expect(pose.target[0]).toBeCloseTo(targetX, 1)
    expect(pose.target[2]).toBeCloseTo(targetZ, 1)
    expect(pose.target[2]).toBeLessThan(pose.position[2])
    expect(pose.yawDeg).toBe(yaw)
    expect(pose.elevationDeg).toBe(37)
  })

  it('clamps pitch to 34–40° and yaw to ±35°', () => {
    expect(dioramaCameraPose(-90, 1, 20).yawDeg).toBe(-35)
    expect(dioramaCameraPose(-90, 1, 20).elevationDeg).toBe(34)
    expect(dioramaCameraPose(90, 1.35, 60).yawDeg).toBe(35)
    expect(dioramaCameraPose(90, 1.35, 60).elevationDeg).toBe(40)
  })

  it('fills the horizon at safe yaw extremes and default/max dolly', () => {
    for (const yaw of [-35, 0, 35]) {
      for (const dolly of [1, 1.35]) {
        const check = skylineCoverage(yaw, dolly)
        expect(check.backSkylineVisible, `${yaw}/${dolly} skyline`).toBe(true)
        expect(check.sideWingVisible, `${yaw}/${dolly} wing`).toBe(true)
        expect(check.worldEdgeVisible, `${yaw}/${dolly} edge`).toBe(false)
      }
    }
  })

  it('passes the complete left/centre/right × default/max × low/high pitch matrix', () => {
    for (const yaw of [-35, 0, 35]) {
      for (const dolly of [1, 1.35]) {
        for (const pitch of [34, 40]) {
          const pose = dioramaCameraPose(yaw, dolly, pitch)
          const coverage = skylineCoverage(yaw, dolly)
          expect(pose.position[0], `${yaw}/${dolly}/${pitch} fixed south station`).toBe(0)
          expect(pose.position[2], `${yaw}/${dolly}/${pitch} south foreground`).toBeGreaterThanOrEqual(135)
          expect(pose.target[2], `${yaw}/${dolly}/${pitch} north heading`).toBeLessThan(0)
          expect(pose.elevationDeg, `${yaw}/${dolly}/${pitch} pitch`).toBe(pitch)
          expect(coverage.backSkylineVisible, `${yaw}/${dolly}/${pitch} skyline`).toBe(true)
          expect(coverage.sideWingVisible, `${yaw}/${dolly}/${pitch} wing`).toBe(true)
          expect(coverage.worldEdgeVisible, `${yaw}/${dolly}/${pitch} edge`).toBe(false)
        }
      }
    }
  })

  it('has no south/front canyon geometry', () => {
    const fixed = generateLayout(7).fixed
    expect(fixed.canyon.backOnly).toBe(true)
    expect(fixed.canyon.frontGeometry).toBe(false)
    expect(fixed.canyon.backZ).toBeLessThan(-130)
    expect(fixed.canyon.sideWingEndZ).toBeGreaterThan(20)
  })

  it('keeps south/front land beneath and behind both camera stations', () => {
    for (const dolly of [1, 1.35]) {
      const pose = dioramaCameraPose(0, dolly)
      expect(pose.position[2]).toBeGreaterThan(130)
      expect(pose.target[2]).toBe(-85)
    }
  })

  it('uses the plan-v4 north skyline height progression', () => {
    expect(BANDS.map(skylineProfile)).toEqual([
      { near: 60, far: 80, spire: 0 },
      { near: 63, far: 85, spire: 0 },
      { near: 66, far: 90, spire: 0 },
      { near: 70, far: 95, spire: 0 },
      { near: 74, far: 100, spire: 118 },
    ])
  })

  it('keeps creatures at least 6% of the viewport at every district station', () => {
    for (const district of L.districts) {
      const fraction = creatureViewportFraction(
        L.creatureHeight * L.creatureScale,
        district.stationChord,
        0.75,
        16 / 9,
        30,
      )
      expect(fraction, district.id).toBeGreaterThanOrEqual(0.06)
    }
  })
})

describe('export', () => {
  it('exports the v4 envelopes, fixed lookout rise, and protected geometry', () => {
    const exported = buildLayoutExport(7, Object.fromEntries(L.districts.map((d) => [d.id, 1])), {
      station: 'overview',
    })
    expect(exported.version).toBe(4)
    expect(exported.world).toEqual([400, 320])
    expect(exported.playable).toEqual([320, 260])
    expect(exported.districts).toHaveLength(6)
    expect(exported.fixed.canyon.backOnly).toBe(true)
    expect(exported.fixed.landmarkRise).toEqual({ center: [118, 65], size: [20, 16] })
    expect(exported.districts.map((district) => district.envelope)).toEqual([
      [113, 72],
      [66, 66],
      [88, 253],
      [87, 69],
      [86, 67],
      [72, 58],
    ])
    expect(exported.landmark).toBe('s3')
  })
})
