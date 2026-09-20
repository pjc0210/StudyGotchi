import { describe, expect, it } from 'vitest'
import {
  ICE_TOWN_LAYOUT as L,
  bandForProgress,
  buildLayoutExport,
  courseProgress,
  creatureViewportFraction,
  districtCentre,
  districtChord,
  districtField,
  districtGap,
  districtOrder,
  districtRadius,
  landmarkStage,
  maxBuildings,
  mountainProfile,
  pointInPolygon,
  populationFor,
  requiredCreatureScale,
  shapePolygon,
  whalePointOnArc,
  whaleSchedule,
  whaleStateAt,
} from './biome-layout'
import { STATIONS } from '../camera/stations'
import {
  ambientScatter,
  anchorPoint,
  backBoundaryZ,
  distToPolyline,
  districtSlots,
  floePositions,
  footbridges,
  forestField,
  forestPines,
  harbourFixtures,
  landField,
  localPaths,
  mainlandBlob,
  mountainPeaks,
  propPlacements,
  rangeArcZ,
  residentSeats,
  sampleTerrain,
  visibleProps,
} from './terrain'

const allAt = (value: number) => Object.fromEntries(L.districts.map((c) => [c.id, value]))
const BANDS = [0, 0.25, 0.5, 0.75, 1]
const forest = L.districts.find((d) => d.id === 'forest')!
const harbour = L.districts.find((d) => d.id === 'harbour')!

describe('district shapes', () => {
  it('are polygons or strips shaped by the land, not circles', () => {
    expect(forest.shape.kind).toBe('strip')
    expect(harbour.shape.kind).toBe('polygon')
    for (const d of L.districts) {
      const poly = shapePolygon(d.shape)
      expect(poly.length).toBeGreaterThanOrEqual(6)
      // Non-circular: the vertex distances from the centroid vary by more than 25 %.
      const [cx, cz] = districtCentre(d)
      const radii = poly.map(([x, z]) => Math.hypot(x - cx, z - cz))
      expect(Math.max(...radii) / Math.min(...radii), d.id).toBeGreaterThan(1.25)
    }
    // The forest strip is long: at least 2.2 × as long as it is wide.
    const fb = shapePolygon(forest.shape)
    const xs = fb.map((p) => p[0])
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(forest.shape.kind === 'strip' ? forest.shape.width * 2.2 : 0)
  })

  it('signed field is positive inside, negative outside, and matches point-in-polygon', () => {
    for (const d of L.districts) {
      const [cx, cz] = districtCentre(d)
      expect(districtField(d, cx, cz), d.id).toBeGreaterThan(0)
      expect(pointInPolygon(shapePolygon(d.shape), cx, cz)).toBe(true)
      const r = districtRadius(d)
      expect(districtField(d, cx + r + 5, cz)).toBeLessThan(0)
    }
  })

  it('keeps ≥ 20 m of empty snow between every pair of districts', () => {
    for (let i = 0; i < L.districts.length; i++) {
      for (let j = i + 1; j < L.districts.length; j++) {
        const a = L.districts[i]
        const b = L.districts[j]
        expect(districtGap(a, b), `${a.id}–${b.id}`).toBeGreaterThanOrEqual(20)
      }
    }
  })

  it('sits on the land: every district centre is above sea level and its interior is mostly land', () => {
    for (const d of L.districts) {
      const [cx, cz] = districtCentre(d)
      const s = sampleTerrain(L, cx, cz)
      expect(s.material, d.id).not.toBe('sea')
      expect(s.height).toBeGreaterThan(L.seaLevel)
    }
    // The forest strip lies in front of the foothill boundary, so its ground is flat snow.
    if (forest.shape.kind === 'strip') {
      for (const [x, z] of forest.shape.centreline) {
        const s = sampleTerrain(L, x, z)
        expect(['snow', 'river', 'riverBank']).toContain(s.material)
        expect(Math.abs(s.height - L.groundHeight)).toBeLessThan(1.2)
        expect(z).toBeGreaterThan(backBoundaryZ(L, x))
      }
    }
  })
})

describe('growth encoding: population, not elevation', () => {
  it('quantises progress into five bands', () => {
    expect([0, 0.1, 0.25, 0.49, 0.5, 0.75, 1].map(bandForProgress)).toEqual([0, 0, 1, 1, 2, 3, 4])
  })

  it('never changes the ground under a district', () => {
    for (const c of L.districts) {
      const [x, z] = districtCentre(c)
      const heights = BANDS.map((p) => sampleTerrain(L, x, z, mountainProfile(p)).height)
      for (const h of heights) expect(h).toBeCloseTo(heights[0], 6)
    }
  })

  it('has every district anchor on land at 0 %, with nothing else built', () => {
    for (const c of L.districts) {
      const [ax, az] = anchorPoint(L, c)
      const s = sampleTerrain(L, ax, az)
      expect(s.material, c.id).not.toBe('sea')
      expect(s.height).toBeGreaterThan(L.seaLevel)
      expect(populationFor(c, 0).buildings).toBe(0)
    }
    // Forest town at 0 %: the river, the forest and the sawmill exist; no houses, no props.
    const at0 = visibleProps(propPlacements(L, 7), L, allAt(0)).filter((p) => p.districtId === 'forest')
    expect(at0).toHaveLength(0)
    expect(forestPines(L, 7).length).toBeGreaterThan(150)
  })

  it('grows building count monotonically from the population table and fills every slot', () => {
    for (const c of L.districts) {
      const counts = BANDS.map((p) => populationFor(c, p).buildings)
      for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
      expect(counts[1]).toBeGreaterThan(0)
      expect(counts[4]).toBe(maxBuildings(c))
      expect(populationFor(c, 1).extras).toBe(true)
      expect(populationFor(c, 0.75).extras).toBe(false)
      expect(districtSlots(L, c).length, c.id).toBe(maxBuildings(c))
    }
    expect(maxBuildings(forest)).toBeGreaterThanOrEqual(14)
  })

  it('derives slots from the shape: inside the polygon, on valid ground, never in the river', () => {
    for (const c of L.districts) {
      for (const slot of districtSlots(L, c)) {
        const [x, , z] = slot.position
        const s = sampleTerrain(L, x, z)
        expect(s.material, `${c.id} slot ${slot.index}`).not.toBe('openWater')
        expect(s.material).not.toBe('river')
        if (slot.overWater) {
          // Harbour stilt houses stand in the shallows just off the beach.
          expect(['sea', 'snow']).toContain(s.material)
          expect(s.height).toBeGreaterThan(L.seaLevel - 1.2)
        } else {
          expect(s.material).not.toBe('sea')
        }
        if (c.building === 'fishing-hut') expect(s.material).toBe('lake')
        else expect(districtField(c, x, z), `${c.id} slot ${slot.index} inside shape`).toBeGreaterThan(c.id === 'harbour' ? -2 : 0)
        expect(distToPolyline(L.river, x, z).dist).toBeGreaterThan(L.riverWidth / 2 + 1)
      }
    }
    // Forest houses form two rows along the strip: both sides of the centreline are used.
    if (forest.shape.kind === 'strip') {
      const line = forest.shape.centreline
      const sides = districtSlots(L, forest).map((s) => {
        const p = line[1]
        const q = line[2]
        return Math.sign((q[0] - p[0]) * (s.position[2] - p[1]) - (q[1] - p[1]) * (s.position[0] - p[0]))
      })
      expect(sides.filter((s) => s > 0).length).toBeGreaterThan(4)
      expect(sides.filter((s) => s < 0).length).toBeGreaterThan(4)
    }
  })

  it('reveals props band by band, with the forest town extras at 100 %', () => {
    const props = propPlacements(L, 7)
    const counts = BANDS.map((p) => visibleProps(props, L, allAt(p)).length)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
    expect(counts[4]).toBeGreaterThan(counts[1])
    expect(props.some((p) => p.kind === 'helicopter' && p.minBand === 4)).toBe(true)
    const forestProps = props.filter((p) => p.districtId === 'forest')
    expect(forestProps.some((p) => p.kind === 'windmill' && p.minBand === 4)).toBe(true)
    expect(forestProps.filter((p) => p.kind === 'watchtower').length).toBeGreaterThanOrEqual(2)
    expect(forestProps.filter((p) => p.kind === 'fenced-plot').length).toBeGreaterThanOrEqual(2)
    expect(forestProps.filter((p) => p.kind === 'fence').length).toBeGreaterThanOrEqual(4)
    expect(forestProps.filter((p) => p.kind === 'lamp').length).toBeGreaterThanOrEqual(4)
    expect(forestProps.filter((p) => p.kind === 'footbridge').length).toBeGreaterThanOrEqual(1)
    // Every forest prop is inside the strip (footbridges sit over the river inside it).
    for (const p of forestProps) expect(districtField(forest, p.position[0], p.position[2]), p.kind).toBeGreaterThan(-0.5)
  })

  it('landmark stage follows the course fraction', () => {
    expect(landmarkStage(0)).toBe('stake')
    expect(landmarkStage(0.2)).toBe('s1')
    expect(landmarkStage(0.5)).toBe('s2')
    expect(landmarkStage(1)).toBe('s3')
    expect(courseProgress(L, allAt(0.5))).toBeCloseTo(0.5)
    expect(districtOrder(L)[0].id).toBe('harbour')
  })
})

describe('forest town', () => {
  it('has a river from the foothills through the strip into the lake, teal with banks', () => {
    const [x0, z0] = L.river[0]
    expect(z0).toBeLessThan(backBoundaryZ(L, x0))
    const [xe, ze] = L.river[L.river.length - 1]
    expect(Math.hypot(xe - L.lake.center[0], ze - L.lake.center[1])).toBeLessThan(L.lake.radius + 1)
    // The river crosses the strip: some centreline-adjacent samples are river.
    let river = 0
    let bank = 0
    for (let x = 4; x <= 52; x += 0.5) {
      const s = sampleTerrain(L, x, -45)
      if (s.material === 'river') river++
      if (s.material === 'riverBank') bank++
    }
    expect(river).toBeGreaterThan(4)
    expect(bank).toBeGreaterThan(2)
    // The channel is sunk below the snow.
    const mid = L.river[3]
    const inRiver = sampleTerrain(L, mid[0], mid[1])
    const beside = sampleTerrain(L, mid[0] + L.riverWidth / 2 + 4, mid[1])
    expect(inRiver.material).toBe('river')
    expect(inRiver.height).toBeLessThan(beside.height - 0.4)
    expect(footbridges(L).length).toBeGreaterThanOrEqual(1)
    for (const b of footbridges(L)) expect(distToPolyline(L.river, b.position[0], b.position[2]).dist).toBeLessThan(1)
  })

  it('wraps the strip in dense pines on all sides and keeps them out of the river, lane and other districts', () => {
    const pines = forestPines(L, 7)
    expect(pines.length).toBeGreaterThan(200)
    const [cx, cz] = districtCentre(forest)
    const quadrants = new Set(pines.map((t) => `${t.x > cx ? 'e' : 'w'}${t.z > cz ? 's' : 'n'}`))
    expect(quadrants.size).toBe(4)
    // Behind (north) and in front (south) of the strip.
    expect(pines.filter((t) => districtField(forest, t.x, t.z) < -2 && t.z < cz).length).toBeGreaterThan(40)
    expect(pines.filter((t) => districtField(forest, t.x, t.z) < -2 && t.z > cz).length).toBeGreaterThan(40)
    for (const t of pines) {
      expect(forestField(L, t.x, t.z)).toBeGreaterThan(0)
      expect(distToPolyline(L.river, t.x, t.z).dist).toBeGreaterThan(L.riverWidth / 2 + 1.5)
      for (const d of L.districts) if (d.id !== 'forest') expect(districtField(d, t.x, t.z)).toBeLessThan(-5)
      expect(sampleTerrain(L, t.x, t.z).material).not.toBe('mountain')
    }
    // Density inside the belt: at least one tree per 16 m² in a 12 m band just outside the strip.
    let cells = 0
    let filled = 0
    for (let x = 0; x <= 56; x += 4) {
      for (let z = -70; z <= -20; z += 4) {
        const f = districtField(forest, x + 2, z + 2)
        if (f > -12 && f < -1 && sampleTerrain(L, x + 2, z + 2).material === 'snow') {
          cells++
          if (pines.some((t) => t.x >= x && t.x < x + 4 && t.z >= z && t.z < z + 4)) filled++
        }
      }
    }
    expect(filled / cells).toBeGreaterThan(0.55)
  })
})

describe('harbour', () => {
  it('has a sloped shore: the land rises 2–3 m from the water over ~20 m, no cliff', () => {
    const fx = harbourFixtures(L)
    const [nx, nz] = fx.dockDir
    const profile: number[] = []
    for (let d = -4; d <= 22; d += 1) {
      const x = fx.dockRoot[0] - nx * d
      const z = fx.dockRoot[1] - nz * d
      profile.push(sampleTerrain(L, x, z).height)
    }
    // A beach, not a cliff: no step taller than 0.6 m per metre (the old cliff dropped 1.9 m in
    // 1.6 m), and only shallow dips from the rolling relief on the way up.
    for (let i = 1; i < profile.length; i++) {
      expect(profile[i] - profile[i - 1]).toBeGreaterThan(-0.4)
      expect(profile[i] - profile[i - 1]).toBeLessThan(0.6)
    }
    const rise = profile[profile.length - 1] - L.seaLevel
    expect(rise).toBeGreaterThan(2)
    expect(rise).toBeLessThan(4)
    // One clean incline: the smoothed depth removes the coast wobble, so no metre loses height.
    for (let i = 1; i < profile.length; i++) expect(profile[i]).toBeGreaterThanOrEqual(profile[i - 1] - 0.05)
  })

  it('places the dock from the quay into deep water, the icebreaker alongside it, the skeleton on the quay', () => {
    const fx = harbourFixtures(L)
    const root = sampleTerrain(L, fx.dockRoot[0], fx.dockRoot[1])
    expect(root.material).toBe('snow')
    const end = sampleTerrain(L, fx.dockRoot[0] + fx.dockDir[0] * fx.dockLength, fx.dockRoot[1] + fx.dockDir[1] * fx.dockLength)
    expect(end.material).toBe('sea')
    expect(sampleTerrain(L, fx.icebreaker[0], fx.icebreaker[1]).material).toBe('sea')
    // Moored: within 8 m of the dock line, parallel to it.
    const dockEnd: [number, number] = [fx.dockRoot[0] + fx.dockDir[0] * fx.dockLength, fx.dockRoot[1] + fx.dockDir[1] * fx.dockLength]
    expect(distToPolyline([fx.dockRoot, dockEnd], fx.icebreaker[0], fx.icebreaker[1]).dist).toBeLessThan(8)
    expect(Math.abs(Math.sin(fx.icebreakerYaw) - fx.dockDir[0])).toBeLessThan(1e-6)
    const gantry = sampleTerrain(L, fx.gantry[0], fx.gantry[1])
    expect(gantry.material).toBe('snow')
    expect(gantry.height).toBeGreaterThan(L.seaLevel + 0.5)
    expect(districtField(harbour, fx.gantry[0], fx.gantry[1])).toBeGreaterThan(0)
    const paths = localPaths(L).filter((p) => p.districtId === 'harbour')
    expect(paths.filter((p) => p.kind === 'dock').length).toBe(2)
    expect(paths.some((p) => p.kind === 'lane')).toBe(true)
  })

  it('puts a row of stilt houses at the waterline and lamps along the quay', () => {
    const slots = districtSlots(L, harbour)
    expect(slots.filter((s) => s.overWater).length).toBeGreaterThanOrEqual(4)
    const props = propPlacements(L, 7).filter((p) => p.districtId === 'harbour')
    expect(props.filter((p) => p.kind === 'lamp').length).toBeGreaterThanOrEqual(4)
    expect(props.filter((p) => p.kind === 'boat').length).toBeGreaterThanOrEqual(3)
    for (const p of props.filter((p) => p.kind === 'boat')) expect(sampleTerrain(L, p.position[0], p.position[2]).material).toBe('sea')
  })
})

describe('the scale rule (pure computation)', () => {
  it('creature fraction of the viewport follows chord, aspect and pitch only', () => {
    // 1.8 m creature, 30 m chord at 70 % width, 16:9, pitch 0 → 1.8 / (30 / 0.7 / (16 / 9)) = 7.47 %.
    expect(creatureViewportFraction(1.8, 30, 0.7, 16 / 9, 0)).toBeCloseTo(0.0747, 3)
    expect(creatureViewportFraction(1.8, 60, 0.7, 16 / 9, 0)).toBeCloseTo(0.0373, 3)
    expect(creatureViewportFraction(1.8, 30, 0.7, 16 / 9, 60)).toBeCloseTo(0.0747 * 0.5, 3)
    expect(requiredCreatureScale(1.8, 30, 0.7, 16 / 9, 0)).toBe(1)
    expect(requiredCreatureScale(1.8, 60, 0.7, 16 / 9, 0)).toBeCloseTo(0.06 / 0.0373, 2)
  })

  it('meets ≥ 6 % at the district station for the two realised districts at 16:9 with the layout creature scale', () => {
    const st = STATIONS.district
    for (const d of [forest, harbour]) {
      const chord = districtChord(d, d.stationAzimuth ?? st.azimuthDeg)
      const fraction = creatureViewportFraction(L.creatureHeight * L.creatureScale, chord, st.fitWidth ?? 0.7, 16 / 9, st.pitchDeg)
      expect(fraction, d.id).toBeGreaterThanOrEqual(0.06)
      expect(L.creatureScale).toBeGreaterThanOrEqual(requiredCreatureScale(L.creatureHeight, chord, st.fitWidth ?? 0.7, 16 / 9, st.pitchDeg) - 1e-9)
      // The creature stays a creature: at most 3 m, well under a 4.9 m house.
      expect(L.creatureHeight * L.creatureScale).toBeLessThan(3)
    }
    // Without the scale, 1.8 m creatures would be too small at either district station.
    expect(creatureViewportFraction(L.creatureHeight, districtChord(forest, forest.stationAzimuth ?? 30), 0.7, 16 / 9, st.pitchDeg)).toBeLessThan(0.06)
  })

  it('frames the district shape: the chord is the projected width plus a margin', () => {
    const c0 = districtChord(forest, 90)
    const c1 = districtChord(forest, 0)
    // Seen along its length (azimuth 90°) the strip is narrow; seen head-on it is long.
    expect(c0).toBeLessThan(c1)
    expect(c1).toBeGreaterThan(40)
  })
})

describe('mountain range', () => {
  it('gains peaks and height with the course fraction', () => {
    const profiles = BANDS.map(mountainProfile)
    for (let i = 1; i < profiles.length; i++) {
      expect(profiles[i].peaks).toBeGreaterThanOrEqual(profiles[i - 1].peaks)
      expect(profiles[i].heightScale).toBeGreaterThan(profiles[i - 1].heightScale)
    }
    expect(profiles[0].peaks).toBe(3)
    expect(mountainPeaks(L, profiles[4]).length).toBeGreaterThan(mountainPeaks(L, profiles[0]).length)
  })

  it('rises at the tallest peak as the course progresses and has no closed back coastline', () => {
    const peak = mountainPeaks(L, mountainProfile(0))[0]
    const heights = BANDS.map((p) => sampleTerrain(L, peak.x, peak.z, mountainProfile(p)).height)
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThan(heights[i - 1])
    expect(heights[4] - heights[0]).toBeGreaterThan(8)
    for (const x of [-100, -60, 0, 60, 100]) {
      const z = rangeArcZ(L, x) - 50
      expect(sampleTerrain(L, x, z, mountainProfile(1)).material, `x=${x}`).not.toBe('sea')
      expect(landField(L, x, z)).toBeGreaterThan(0)
    }
  })
})

describe('land shape', () => {
  it('is sea in front and to the east, shelf ice to the west', () => {
    expect(sampleTerrain(L, 0, 100).material).toBe('sea')
    expect(sampleTerrain(L, 100, 40).material).toBe('sea')
    const glacier = L.districts.find((c) => c.id === 'glacier')!
    const [gx, gz] = districtCentre(glacier)
    const shelf = sampleTerrain(L, gx, gz)
    expect(shelf.material).toBe('ice')
    expect(shelf.height).toBeLessThan(L.groundHeight)
    expect(shelf.height).toBeGreaterThan(L.seaLevel)
  })

  it('has no coordinate-aligned coastline', () => {
    const westCrossings: number[] = []
    for (const z of [-30, -15, 0, 15, 30]) {
      let edge = Number.NaN
      for (let x = 0; x > -110; x -= 0.5) {
        if (mainlandBlob(L, x, z) <= 0) {
          edge = x
          break
        }
      }
      westCrossings.push(edge)
    }
    expect(Math.max(...westCrossings) - Math.min(...westCrossings)).toBeGreaterThan(6)
  })

  it('scatters groves and outcrops into the empty snow, clear of every district and the forest belt', () => {
    const scatter = ambientScatter(L, 7)
    expect(scatter.filter((s) => s.kind === 'grove').length).toBeGreaterThanOrEqual(2)
    expect(scatter.filter((s) => s.kind === 'outcrop').length).toBeGreaterThanOrEqual(3)
    for (const s of scatter) {
      for (const c of L.districts) expect(districtField(c, s.position[0], s.position[2])).toBeLessThan(0)
      expect(forestField(L, s.position[0], s.position[2])).toBeLessThan(0)
    }
  })

  it('keeps the mini island as land separated from the mainland by water', () => {
    const [ix, iz] = L.miniIsland.center
    expect(sampleTerrain(L, ix, iz).material).not.toBe('sea')
    const [mx, mz] = L.mainland.center
    let sawSea = false
    for (let i = 0; i <= 60; i++) {
      const x = mx + (ix - mx) * (i / 60)
      const z = mz + (iz - mz) * (i / 60)
      if (sampleTerrain(L, x, z).material === 'sea') sawSea = true
    }
    expect(sawSea).toBe(true)
  })

  it('has a frozen lake with dark open-water patches', () => {
    expect(sampleTerrain(L, L.lake.center[0], L.lake.center[1] + 4).material).toBe('lake')
    for (const [px, pz] of L.lake.openWater) expect(sampleTerrain(L, px, pz).material).toBe('openWater')
  })
})

describe('paths, residents, floes', () => {
  it('gives each district 1–3 local paths and no inter-district route', () => {
    const paths = localPaths(L)
    for (const c of L.districts) {
      const mine = paths.filter((p) => p.districtId === c.id)
      expect(mine.length, c.id).toBeGreaterThanOrEqual(1)
      expect(mine.length, c.id).toBeLessThanOrEqual(3)
      for (const p of mine) {
        for (const [x, , z] of p.points) expect(districtField(c, x, z), `${c.id} ${p.kind}`).toBeGreaterThan(c.id === 'harbour' ? -16 : -6)
      }
    }
  })

  it('distributes residents to districts by progress and seats them inside the shape', () => {
    const seats = residentSeats(L, { ...allAt(0), town: 1 }, 6, 3)
    expect(seats.every((s) => s.districtId === 'town')).toBe(true)
    const spread = residentSeats(L, allAt(1), 12, 3)
    expect(new Set(spread.map((s) => s.districtId)).size).toBeGreaterThan(3)
    for (const s of spread) {
      const d = L.districts.find((k) => k.id === s.districtId)!
      expect(districtField(d, s.center[0], s.center[1]), d.id).toBeGreaterThan(-1)
    }
  })

  it('keeps floes on the sea and clear of the whale arc', () => {
    for (const [x, z] of floePositions(L, 7)) {
      expect(sampleTerrain(L, x, z).material).toBe('sea')
      expect(Math.hypot(x - L.whaleArc.center[0], z - L.whaleArc.center[1])).toBeGreaterThan(L.whaleArc.radius + 6)
    }
  })

  it('is deterministic for a seed', () => {
    expect(propPlacements(L, 3)).toEqual(propPlacements(L, 3))
    expect(propPlacements(L, 3)).not.toEqual(propPlacements(L, 4))
    expect(whaleSchedule(5)).toEqual(whaleSchedule(5))
    expect(forestPines(L, 2)).toEqual(forestPines(L, 2))
  })
})

describe('whale', () => {
  it('is hidden by default and surfaces every 45–90 s', () => {
    const schedule = whaleSchedule(7)
    expect(whaleStateAt(schedule, 0).phase).toBe('hidden')
    for (let i = 1; i < schedule.length; i++) {
      const gap = schedule[i].startAt - (schedule[i - 1].startAt + schedule[i - 1].duration)
      expect(gap).toBeGreaterThanOrEqual(45)
      expect(gap).toBeLessThanOrEqual(90)
    }
    let visible = 0
    for (let t = 0; t < 600; t += 0.5) if (whaleStateAt(schedule, t).phase !== 'hidden') visible += 0.5
    expect(visible / 600).toBeLessThan(0.15)
  })

  it('surfaces off the harbour on the sea and never within 15 m of a district', () => {
    for (const event of whaleSchedule(11, 12)) {
      for (let u = 0; u <= 1; u += 0.1) {
        const [x, z] = whalePointOnArc(L, event, u)
        expect(sampleTerrain(L, x, z).material).toBe('sea')
        for (const c of L.districts) expect(districtField(c, x, z)).toBeLessThan(-15)
        expect(-districtField(harbour, x, z)).toBeLessThan(45)
      }
    }
  })
})

describe('export', () => {
  it('exports districts with shape, population and the mountain profile', () => {
    const out = buildLayoutExport(L, allAt(0.25), { station: 'overview' })
    expect(out.version).toBe(3)
    expect(out.districts).toHaveLength(6)
    expect(out.districts.every((c) => c.population.band === 1)).toBe(true)
    expect(out.districts.find((c) => c.id === 'forest')?.shape.kind).toBe('strip')
    expect(out.creature.scale).toBe(L.creatureScale)
    expect(out.mountains.band).toBe(1)
    expect(out.landmark).toBe('s1')
  })
})
