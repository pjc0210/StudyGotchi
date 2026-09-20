import { describe, expect, it } from 'vitest'
import {
  CAMERA_COURSES,
  CONTINENT_LOBES_PER_GROUP,
  DEFAULT_PIXEL_GRAIN,
  GLOBE_CAMERA_PADDING,
  GLOBE_FOCUS_DIRECTION,
  LANDMARK_OFFSETS,
  MAX_PIXEL_GRAIN,
  MIN_PIXEL_GRAIN,
  PIXEL_ATLAS_HEIGHT,
  PIXEL_ATLAS_WIDTH,
  SNAP_DAMPING,
  TRACKPAD_SETTLE_MS,
  WATER_FRAME_COUNT,
  WATER_FRAME_MS,
  WATER_FLOW_SPEED,
  activeRouteForPosition,
  archipelagoSurface,
  cameraDistanceForSphere,
  clampCoursePosition,
  courseGroundBlend,
  courseIndexForPosition,
  courseIndexForRotation,
  courseIndexForStep,
  estimatedOceanShare,
  markerState,
  nearestCourseNeighbors,
  normalizePixelGrain,
  continentLobes,
  pixelGrassTone,
  oceanMaskForScores,
  routeEdges,
  routeLift,
  rotationForStep,
  settleCoursePosition,
  seededCourseDirections,
  surfaceBandForScore,
  terrainReliefForBand,
  stepForIndex,
  trackpadSpin,
  waterFrameState,
} from './camera-globe-spec'

describe('locked globe camera proof', () => {
  it('wraps course stops in either direction', () => {
    expect(courseIndexForStep(0, 7)).toBe(0)
    expect(courseIndexForStep(7, 7)).toBe(0)
    expect(courseIndexForStep(-1, 7)).toBe(6)
    expect(courseIndexForStep(-8, 7)).toBe(6)
  })

  it('chooses the nearest equivalent stop when a course card is clicked', () => {
    expect(stepForIndex(0, 6, 7)).toBe(-1)
    expect(stepForIndex(6, 0, 7)).toBe(7)
    expect(stepForIndex(10, 1, 7)).toBe(8)
  })

  it('maps each stop to an evenly spaced globe rotation', () => {
    expect(rotationForStep(0, 7)).toBe(0)
    expect(rotationForStep(1, 7)).toBeCloseTo((-Math.PI * 2) / 7)
    expect(rotationForStep(-1, 7)).toBeCloseTo((Math.PI * 2) / 7)
    expect(courseIndexForRotation((-Math.PI * 4) / 7, 7)).toBe(2)
  })

  it('keeps progression readable through several redundant marker channels', () => {
    expect(markerState(0.15)).toEqual({
      band: 'seed',
      footprintScale: 0.72,
      tiers: 1,
      landmarkCount: 1,
      pawnCount: 1,
      activity: 0.15,
    })
    expect(markerState(0.5)).toEqual({
      band: 'growing',
      footprintScale: 0.9,
      tiers: 2,
      landmarkCount: 2,
      pawnCount: 3,
      activity: 0.5,
    })
    expect(markerState(0.9)).toEqual({
      band: 'thriving',
      footprintScale: 1.08,
      tiers: 3,
      landmarkCount: 3,
      pawnCount: 5,
      activity: 0.9,
    })
  })

  it('provides a varied seven-course carousel fixture', () => {
    expect(CAMERA_COURSES).toHaveLength(7)
    expect(new Set(CAMERA_COURSES.map((course) => course.biome)).size).toBe(7)
    expect(CAMERA_COURSES[0]).toMatchObject({
      code: '6.1210',
      biome: 'ice',
    })
  })

  it('starts from an even deterministic distribution before intentional clustering', () => {
    const directions = seededCourseDirections(CAMERA_COURSES.length, 'philote/demo', 0)
    expect(seededCourseDirections(CAMERA_COURSES.length, 'philote/demo', 0)).toEqual(directions)
    expect(seededCourseDirections(CAMERA_COURSES.length, 'another/student', 0)).not.toEqual(directions)
    for (const direction of directions) {
      expect(Math.hypot(...direction)).toBeCloseTo(1)
    }
    let closestPairDot = -1
    for (let a = 0; a < directions.length; a++) {
      for (let b = a + 1; b < directions.length; b++) {
        const dot =
          directions[a][0] * directions[b][0] +
          directions[a][1] * directions[b][1] +
          directions[a][2] * directions[b][2]
        closestPairDot = Math.max(closestPairDot, dot)
      }
    }
    expect(closestPairDot).toBeLessThan(0.82)
  })

  it('clusters selected towns without collapsing the globe distribution', () => {
    const spread = seededCourseDirections(CAMERA_COURSES.length, 'philote/demo', 0)
    const clustered = seededCourseDirections(CAMERA_COURSES.length, 'philote/demo')
    const closestDot = (directions: Array<[number, number, number]>) => {
      let closest = -1
      for (let a = 0; a < directions.length; a++) {
        for (let b = a + 1; b < directions.length; b++) {
          closest = Math.max(
            closest,
            directions[a][0] * directions[b][0] +
              directions[a][1] * directions[b][1] +
              directions[a][2] * directions[b][2],
          )
        }
      }
      return closest
    }
    expect(closestDot(clustered)).toBeGreaterThan(closestDot(spread))
    expect(closestDot(clustered)).toBeGreaterThan(0.82)
    expect(closestDot(clustered)).toBeLessThan(0.93)
  })

  it('returns exactly the three nearest neighboring lands', () => {
    const directions = seededCourseDirections(CAMERA_COURSES.length, 'philote/demo')
    const neighbors = nearestCourseNeighbors(0, directions, 3)
    expect(neighbors).toHaveLength(3)
    expect(new Set(neighbors).size).toBe(3)
    expect(neighbors).not.toContain(0)
    const source = directions[0]
    const dots = neighbors.map(
      (index) =>
        source[0] * directions[index][0] +
        source[1] * directions[index][1] +
        source[2] * directions[index][2],
    )
    expect(dots[0]).toBeGreaterThanOrEqual(dots[1])
    expect(dots[1]).toBeGreaterThanOrEqual(dots[2])
  })

  it('waits for trackpad inertia before locking a landmark', () => {
    expect(TRACKPAD_SETTLE_MS).toBeGreaterThanOrEqual(500)
    expect(TRACKPAD_SETTLE_MS).toBeLessThanOrEqual(550)
    expect(SNAP_DAMPING).toBeGreaterThanOrEqual(4)
  })

  it('maps trackpad deltas to content motion instead of reversed scroll motion', () => {
    const [horizontal, vertical] = trackpadSpin(20, -10)
    expect(horizontal).toBeCloseTo(-0.048)
    expect(vertical).toBeCloseTo(0.024)
  })

  it('blends biome ground continuously without a forced water annulus', () => {
    expect(courseGroundBlend(0.82)).toBe(0)
    expect(courseGroundBlend(0.88)).toBeGreaterThan(0)
    expect(courseGroundBlend(0.92)).toBeGreaterThan(courseGroundBlend(0.88))
    expect(courseGroundBlend(0.98)).toBeCloseTo(0.9)
  })

  it('selects the nearest course for fractional continuous positions', () => {
    expect(courseIndexForPosition(2.49, 7)).toBe(2)
    expect(courseIndexForPosition(2.51, 7)).toBe(3)
    expect(courseIndexForPosition(-0.6, 7)).toBe(6)
  })

  it('soft-locks continuous movement to its nearest course stop', () => {
    expect(settleCoursePosition(2.47)).toBe(2)
    expect(settleCoursePosition(2.53)).toBe(3)
    expect(settleCoursePosition(-0.62)).toBe(-1)
  })

  it('moves the camera back enough to fit the full planet in narrow panes', () => {
    const wide = cameraDistanceForSphere(4.55, 26, 1.4, 1.15)
    const narrow = cameraDistanceForSphere(4.55, 26, 0.65, 1.15)
    expect(wide).toBeGreaterThan(22)
    expect(wide).toBeLessThan(24)
    expect(narrow).toBeGreaterThan(wide * 1.4)
  })

  it('connects every course into one open spiral route', () => {
    expect(routeEdges(4)).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ])
  })

  it('clamps continuous movement at both ends of the spiral', () => {
    expect(clampCoursePosition(-0.4, 7)).toBe(0)
    expect(clampCoursePosition(3.2, 7)).toBe(3.2)
    expect(clampCoursePosition(7.4, 7)).toBe(6)
  })

  it('identifies the active route and fractional travel position', () => {
    expect(activeRouteForPosition(1.25, 7)).toEqual({ from: 1, to: 2, t: 0.25 })
    expect(activeRouteForPosition(-0.4, 7)).toEqual({ from: 0, to: 1, t: 0 })
    expect(activeRouteForPosition(7.4, 7)).toEqual({ from: 5, to: 6, t: 1 })
  })

  it('keeps surface routes low and lifts active hybrid routes into an arc', () => {
    expect(routeLift('surface', false, 0.5)).toBeCloseTo(0.06)
    expect(routeLift('arcs', false, 0.5)).toBeCloseTo(1.31)
    expect(routeLift('hybrid', false, 0.5)).toBeCloseTo(0.06)
    expect(routeLift('hybrid', true, 0.5)).toBeCloseTo(1.51)
    expect(routeLift('hybrid', true, 0)).toBeCloseTo(0.06)
  })

  it('quantizes atlas terrain into readable material bands', () => {
    expect(surfaceBandForScore(-0.2)).toBe('deep-ocean')
    expect(surfaceBandForScore(-0.02)).toBe('shallow')
    expect(surfaceBandForScore(0.12)).toBe('lowland')
    expect(surfaceBandForScore(0.29)).toBe('highland')
    expect(surfaceBandForScore(0.48)).toBe('snow')
  })

  it('uses a detailed square terrain atlas beneath the adjustable pixel pass', () => {
    expect(PIXEL_ATLAS_WIDTH).toBeGreaterThanOrEqual(256)
    expect(PIXEL_ATLAS_HEIGHT).toBeGreaterThanOrEqual(256)
    expect(PIXEL_ATLAS_WIDTH).toBe(PIXEL_ATLAS_HEIGHT)
  })

  it('raises land substantially above sea level', () => {
    expect(terrainReliefForBand('lowland')).toBeGreaterThanOrEqual(0.1)
    expect(terrainReliefForBand('highland')).toBeGreaterThanOrEqual(0.25)
    expect(terrainReliefForBand('snow')).toBeGreaterThanOrEqual(0.4)
  })

  it('keeps water out of land and course-ground patches', () => {
    expect(oceanMaskForScores(-0.2, 0.2)).toBeCloseTo(1)
    expect(oceanMaskForScores(-0.03, 0.2)).toBeGreaterThan(0)
    expect(oceanMaskForScores(0.04, 0.2)).toBe(0)
    expect(oceanMaskForScores(-0.2, 0.95)).toBe(0)
  })

  it('interpolates a seamless indexed ocean loop instead of teleporting frames', () => {
    expect(WATER_FRAME_COUNT).toBe(32)
    expect(WATER_FRAME_MS).toBeGreaterThanOrEqual(120)
    expect(WATER_FRAME_MS).toBeLessThanOrEqual(240)
    expect(WATER_FLOW_SPEED).toBeGreaterThan(0)
    expect(WATER_FLOW_SPEED).toBeLessThanOrEqual(0.2)
    expect(waterFrameState(0)).toEqual({ current: 0, next: 1, mix: 0 })
    expect(waterFrameState(WATER_FRAME_MS / 2).mix).toBeCloseTo(0.5)
    expect(waterFrameState(WATER_FRAME_MS - 1).mix).toBeGreaterThan(0.99)
    expect(waterFrameState(WATER_FRAME_MS)).toEqual({ current: 1, next: 2, mix: 0 })
  })

  it('uses larger continents while preserving broad seas', () => {
    const oceanShare = estimatedOceanShare(4096)
    expect(oceanShare).toBeGreaterThanOrEqual(0.55)
    expect(oceanShare).toBeLessThanOrEqual(0.68)
  })

  it('builds every continent from several unequal offset lobes', () => {
    const courseDirections = seededCourseDirections(
      CAMERA_COURSES.length,
      'studygotchi:demo:philote',
    )
    const lobes = continentLobes(courseDirections)
    expect(lobes).toHaveLength(
      Math.ceil(CAMERA_COURSES.length / 2) * CONTINENT_LOBES_PER_GROUP,
    )
    for (let group = 0; group < Math.ceil(CAMERA_COURSES.length / 2); group++) {
      const groupLobes = lobes.filter((lobe) => lobe.group === group)
      expect(groupLobes).toHaveLength(CONTINENT_LOBES_PER_GROUP)
      expect(new Set(groupLobes.map((lobe) => lobe.threshold)).size).toBeGreaterThan(2)
      expect(new Set(groupLobes.map((lobe) => lobe.direction.join(':'))).size).toBe(
        CONTINENT_LOBES_PER_GROUP,
      )
      expect(groupLobes[0].direction).toEqual(courseDirections[group * 2])
      if (courseDirections[group * 2 + 1]) {
        expect(groupLobes[1].direction).toEqual(courseDirections[group * 2 + 1])
      }
    }
  })

  it('produces deterministic clustered pixel-grass tones with visible variation', () => {
    const tones = Array.from({ length: 16 * 16 }, (_, index) =>
      pixelGrassTone(index % 16, Math.floor(index / 16)),
    )
    expect(tones).toEqual(
      Array.from({ length: 16 * 16 }, (_, index) =>
        pixelGrassTone(index % 16, Math.floor(index / 16)),
      ),
    )
    expect(new Set(tones).size).toBeGreaterThanOrEqual(4)
    const texturedPixels = tones.filter((tone) => tone !== 0).length
    expect(texturedPixels).toBeGreaterThan(16)
    expect(texturedPixels).toBeLessThan(72)
    expect(tones.filter((tone) => Math.abs(tone) >= 2).length).toBeGreaterThan(4)
  })

  it('gives every course marker a raised island while preserving open sea elsewhere', () => {
    const courseDirections = seededCourseDirections(
      CAMERA_COURSES.length,
      'studygotchi:demo:philote',
    )
    for (const direction of courseDirections) {
      const sample = archipelagoSurface(direction, courseDirections)
      expect(sample.land).toBe(true)
      expect(sample.elevation).toBeGreaterThanOrEqual(0.12)
      expect(sample.biomeWeight).toBeGreaterThan(0.9)
    }
    expect(archipelagoSurface([0, 0, -1], courseDirections).elevation).toBeGreaterThanOrEqual(0)
  })

  it('keeps shared continental land green between nearby biome districts', () => {
    const courseDirections = seededCourseDirections(
      CAMERA_COURSES.length,
      'studygotchi:demo:philote',
    )
    const a = courseDirections[0]
    const b = courseDirections[1]
    const length = Math.hypot(a[0] + b[0], a[1] + b[1], a[2] + b[2])
    const midpoint: [number, number, number] = [
      (a[0] + b[0]) / length,
      (a[1] + b[1]) / length,
      (a[2] + b[2]) / length,
    ]
    const sample = archipelagoSurface(midpoint, courseDirections)
    expect(sample.land).toBe(true)
    expect(sample.biomeWeight).toBeLessThan(0.2)
  })

  it('uses a luminous white-cyan palette for the ice biome', () => {
    expect(CAMERA_COURSES[0]).toMatchObject({
      ground: '#dff4f7',
      accent: '#9dd9e7',
    })
  })

  it('keeps town landmarks in a close readable cluster', () => {
    for (const [x, z] of LANDMARK_OFFSETS) {
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(0.2)
    }
  })

  it('frames a larger globe down-right while the active town sits upper-left', () => {
    expect(GLOBE_CAMERA_PADDING).toBeLessThan(1)
    expect(GLOBE_FOCUS_DIRECTION[0]).toBeLessThan(-0.1)
    expect(GLOBE_FOCUS_DIRECTION[1]).toBeGreaterThan(0.4)
  })

  it('provides a live fine-to-chunky pixel-grain range', () => {
    expect(DEFAULT_PIXEL_GRAIN).toBe(2)
    expect(MIN_PIXEL_GRAIN).toBe(1)
    expect(MAX_PIXEL_GRAIN).toBe(6)
    expect(normalizePixelGrain(-3)).toBe(1)
    expect(normalizePixelGrain(3.4)).toBe(3)
    expect(normalizePixelGrain(99)).toBe(6)
  })
})
