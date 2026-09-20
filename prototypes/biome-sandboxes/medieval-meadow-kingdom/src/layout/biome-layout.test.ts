import { describe, expect, it } from 'vitest'
import {
  FIXED_BRIDGES,
  GREEN_CROWN,
  MEADOW_KINGDOM,
  OPEN_SHARE,
  PIXEL_SIZE,
  buildLayoutExport,
  castleRenderInstances,
  courseProgress,
  creatureViewportFraction,
  districtGap,
  districtOrder,
  generateKingdom,
  greenCrownProfile,
  landmarkStage,
  pointInPolygon,
  populationFor,
  routeNetwork,
} from './biome-layout'
import { STATIONS, clampDioramaYaw, overviewPoseForYaw } from '../camera/stations'
import {
  animalPlacements,
  authoredDistrictDetails,
  buildingSlots,
  distToPolyline,
  localLaneSegments,
  sampleTerrain,
} from './terrain'

const SEEDS = [1, 7, 99]
const BANDS = [0, 0.25, 0.5, 0.75, 1]
const allAt = (value: number) => Object.fromEntries(MEADOW_KINGDOM.districts.map((district) => [district.id, value]))

describe('medieval meadow kingdom contract', () => {
  it('contains the five authored districts and the castle is the sole landmark', () => {
    expect(MEADOW_KINGDOM.districts.map((district) => district.name)).toEqual([
      'Forest Hamlet + Timber Common',
      'River Village + Mill',
      'Bridge Market + Guild Court',
      'Farm + Village Common',
      'Crown Headland + Castle Court',
    ])
    expect(MEADOW_KINGDOM.landmark.kind).toBe('castle')
    expect(MEADOW_KINGDOM.sites.filter((site) => site.kind === 'landmark')).toHaveLength(1)
    expect(castleRenderInstances(MEADOW_KINGDOM)).toBe(1)
  })

  it('allows the landmark site to overlap its host district without allowing district overlap', () => {
    const court = MEADOW_KINGDOM.districts.find((district) => district.id === 'castle-court')!
    expect(pointInPolygon(court.polygon, ...MEADOW_KINGDOM.landmark.position)).toBe(true)
    expect(MEADOW_KINGDOM.landmark.districtId).toBe(court.id)
    for (const seed of SEEDS) {
      const districts = generateKingdom(seed).districts
      for (let i = 0; i < districts.length; i++) {
        for (let j = i + 1; j < districts.length; j++) {
          expect(districtGap(districts[i], districts[j]), `${seed}: ${districts[i].id}/${districts[j].id}`).toBeGreaterThanOrEqual(20)
        }
      }
    }
  })

  it('preserves 39% open meadow/water and four inviolate preserves', () => {
    expect(OPEN_SHARE).toBe(0.39)
    expect(MEADOW_KINGDOM.preserves).toHaveLength(4)
    for (const preserve of MEADOW_KINGDOM.preserves) {
      expect(MEADOW_KINGDOM.districts.every((district) => !pointInPolygon(district.polygon, ...preserve.center))).toBe(true)
    }
  })

  it('uses the enlarged v3 authored footprints and district-specific capacities', () => {
    const minimums: Record<string, [number, number, number]> = {
      'forest-hamlet': [44, 28, 6],
      'river-village': [37, 29, 6],
      'bridge-market': [37, 28, 7],
      'farm-common': [49, 37, 5],
      'castle-court': [44, 40, 0],
    }
    for (const district of MEADOW_KINGDOM.districts) {
      const xs = district.polygon.map((point) => point[0])
      const zs = district.polygon.map((point) => point[1])
      const [width, depth, capacity] = minimums[district.id]
      expect(Math.max(...xs) - Math.min(...xs), district.id).toBeGreaterThanOrEqual(width)
      expect(Math.max(...zs) - Math.min(...zs), district.id).toBeGreaterThanOrEqual(depth)
      expect(district.population[4], district.id).toBe(capacity)
    }
  })
})

describe('deterministic seeds, routes and gaps', () => {
  it('repeats seed output exactly while seeds 1, 7 and 99 visibly differ', () => {
    for (const seed of SEEDS) expect(generateKingdom(seed)).toEqual(generateKingdom(seed))
    expect(generateKingdom(1).districts).not.toEqual(generateKingdom(7).districts)
    expect(generateKingdom(7).districts).not.toEqual(generateKingdom(99).districts)
  })

  it('jitters only districts; river, bridges, roads and preserves remain fixed', () => {
    const fixed = generateKingdom(1).fixed
    for (const seed of SEEDS) expect(generateKingdom(seed).fixed).toEqual(fixed)
    expect(fixed.bridges).toEqual(FIXED_BRIDGES)
    expect(routeNetwork(MEADOW_KINGDOM).length).toBeGreaterThanOrEqual(4)
    for (const bridge of FIXED_BRIDGES) {
      const line = bridge.id === 'B3' ? MEADOW_KINGDOM.tributary : MEADOW_KINGDOM.river
      const channelHalfWidth = bridge.id === 'B3' ? 3.5 : MEADOW_KINGDOM.riverWidth / 2
      expect(distToPolyline(line, ...bridge.center).dist, bridge.id).toBeLessThan(channelHalfWidth + 2)
    }
  })

  it('uses winding connectors without long empty-meadow spokes', () => {
    for (const route of routeNetwork(MEADOW_KINGDOM)) {
      expect(route.points.length, route.id).toBeGreaterThanOrEqual(4)
      for (let index = 1; index < route.points.length; index++) {
        expect(Math.hypot(
          route.points[index][0] - route.points[index - 1][0],
          route.points[index][1] - route.points[index - 1][1],
        ), `${route.id} segment ${index}`).toBeLessThan(30)
      }
    }
  })

  it('keeps authored slots monotonic and clear of water', () => {
    for (const seed of SEEDS) {
      const kingdom = generateKingdom(seed)
      for (const district of kingdom.districts) {
        const counts = BANDS.map((progress) => populationFor(district, progress).buildings)
        for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
        for (const slot of buildingSlots(kingdom, district)) {
          expect(sampleTerrain(kingdom, slot.position[0], slot.position[2]).material, `${seed}: ${district.id}`).not.toBe('water')
        }
      }
    }
  })

  it('authors each district around its named working features', () => {
    const kingdom = generateKingdom(7)
    const expected = {
      'forest-hamlet': ['sawyard', 'log-stacks', 'coppice'],
      'river-village': ['landing', 'kitchen-gardens', 'millrace'],
      'bridge-market': ['guild-hall', 'market-stalls', 'fountain'],
      'farm-common': ['l-barn', 'orchard', 'crop-strips', 'hedges'],
      'castle-court': ['forecourt', 'hedge-rooms', 'kitchen-orchard'],
    }
    for (const district of kingdom.districts) {
      expect(authoredDistrictDetails(district).map((detail) => detail.kind)).toEqual(
        expect.arrayContaining(expected[district.id]),
      )
    }
  })

  it('adds short local lanes inside districts without converting preserves into roads', () => {
    const kingdom = generateKingdom(7)
    const lanes = localLaneSegments(kingdom)
    expect(lanes).toHaveLength(5)
    for (const lane of lanes) {
      expect(lane.points.length).toBeGreaterThanOrEqual(3)
      for (let index = 1; index < lane.points.length; index++) {
        expect(Math.hypot(
          lane.points[index][0] - lane.points[index - 1][0],
          lane.points[index][1] - lane.points[index - 1][1],
        ), lane.id).toBeLessThan(14)
      }
      expect(kingdom.preserves.every((preserve) =>
        lane.points.every(([x, z]) =>
          Math.abs(x - preserve.center[0]) >= preserve.size[0] / 2 ||
          Math.abs(z - preserve.center[1]) >= preserve.size[1] / 2,
        ),
      ), lane.id).toBe(true)
    }
  })

  it('places a small readable animal population on dry authored ground', () => {
    for (const seed of SEEDS) {
      const kingdom = generateKingdom(seed)
      const animals = animalPlacements(kingdom, seed)
      expect(animals.length).toBeGreaterThanOrEqual(8)
      expect(new Set(animals.map((animal) => animal.kind))).toEqual(new Set(['sheep', 'cow', 'chicken']))
      for (const animal of animals) {
        expect(sampleTerrain(kingdom, animal.position[0], animal.position[2]).material).not.toBe('water')
      }
    }
  })
})

describe('camera, horizon and growth', () => {
  it('keeps the Green Crown on the north skyline and side wings, never the foreground or castle', () => {
    expect(GREEN_CROWN.some((crown) => crown.kind === 'castle')).toBe(false)
    expect(GREEN_CROWN.every((crown) => crown.position[1] <= -78)).toBe(true)
    expect(GREEN_CROWN.some((crown) => crown.position[0] < -110)).toBe(true)
    expect(GREEN_CROWN.some((crown) => crown.position[0] > 110)).toBe(true)
    expect(GREEN_CROWN.some((crown) => crown.position[1] > 0)).toBe(false)
  })

  it('limits the front-facing camera to yaw −35/0/+35 at default and max dolly', () => {
    expect([-90, -35, 0, 35, 90].map(clampDioramaYaw)).toEqual([-35, -35, 0, 35, 35])
    for (const yaw of [-35, 0, 35]) {
      const pose = overviewPoseForYaw(yaw)
      expect(pose.pitchDeg).toBeGreaterThanOrEqual(34)
      expect(pose.pitchDeg).toBeLessThanOrEqual(40)
      expect(pose.fov).toBe(26)
      expect(pose.azimuthDeg).toBe(yaw)
      expect(overviewPoseForYaw(yaw, 2.2).dolly).toBe(2.2)
    }
    expect(MEADOW_KINGDOM.diorama.foregroundZ).toBeGreaterThan(MEADOW_KINGDOM.worldSize[1] / 2)
    expect(MEADOW_KINGDOM.diorama.yawLimit).toBe(35)
    expect(MEADOW_KINGDOM.districts.every((district) => Math.abs(district.stationAzimuth) <= 35)).toBe(true)
  })

  it('grows only the crown silhouette across five course bands', () => {
    const profiles = BANDS.map(greenCrownProfile)
    expect(profiles.map((profile) => profile.crowns)).toEqual([8, 12, 16, 22, 26])
    for (let i = 1; i < profiles.length; i++) {
      expect(profiles[i].height).toBeGreaterThan(profiles[i - 1].height)
    }
    expect(profiles[4].oakHeight).toBe(18)
    expect(profiles[4].limestoneShoulders).toBe(3)
  })

  it('supports s1/s2/s3, fixed 2px rendering and readable creatures', () => {
    expect([0, 0.2, 0.5, 0.75, 1].map(landmarkStage)).toEqual(['stake', 's1', 's2', 's3', 's3'])
    expect(PIXEL_SIZE).toBe(2)
    expect(STATIONS.overview.pitchDeg).toBeGreaterThanOrEqual(34)
    expect(STATIONS.overview.pitchDeg).toBeLessThanOrEqual(40)
    for (const district of MEADOW_KINGDOM.districts) {
      const fraction = creatureViewportFraction(
        MEADOW_KINGDOM.creatureHeight * MEADOW_KINGDOM.creatureScale,
        district.stationChord,
        STATIONS.district.fitWidth!,
        16 / 9,
        STATIONS.district.pitchDeg,
      )
      expect(fraction, district.id).toBeGreaterThanOrEqual(0.06)
    }
  })
})

describe('export', () => {
  it('exports the complete authored and generated contract', () => {
    const progress = allAt(0.5)
    const out = buildLayoutExport(generateKingdom(7), progress, { station: 'overview' })
    expect(out.version).toBe(4)
    expect(out.biome).toBe('medieval-meadow-kingdom')
    expect(out.seed).toBe(7)
    expect(out.openShare).toBe(0.39)
    expect(out.districts).toHaveLength(5)
    expect(out.landmark.stage).toBe('s2')
    expect(out.landmark.renderInstances).toBe(1)
    expect(out.greenCrown.band).toBe(2)
    expect(courseProgress(MEADOW_KINGDOM, progress)).toBe(0.5)
    expect(districtOrder(MEADOW_KINGDOM)[0].id).toBe('forest-hamlet')
  })
})
