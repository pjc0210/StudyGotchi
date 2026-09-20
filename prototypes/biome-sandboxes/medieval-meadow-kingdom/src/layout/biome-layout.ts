/**
 * Medieval Meadow Kingdom authoring contract.
 * Pure data and deterministic layout functions; coordinates are metres, +x east and +z south.
 */

export type DistrictId = 'forest-hamlet' | 'river-village' | 'bridge-market' | 'farm-common' | 'castle-court'
export type LandmarkStage = 'stake' | 's1' | 's2' | 's3'
export type DistrictProgress = Record<string, number>
export type Point2 = [number, number]
export type Polygon = Point2[]

export interface DistrictDef {
  id: DistrictId
  name: string
  band: number
  anchor: string
  centre: Point2
  polygon: Polygon
  yaw: number
  maxJitter: number
  maxYaw: number
  stationAzimuth: number
  stationChord: number
  population: [number, number, number, number, number]
  accent: string
}

export interface Preserve {
  id: string
  name: string
  center: Point2
  size: Point2
}

export interface Bridge {
  id: 'B1' | 'B2' | 'B3'
  name: string
  center: Point2
  size: Point2
  yaw: number
}

export interface Site {
  id: string
  kind: 'landmark' | 'work' | 'civic'
  districtId: DistrictId
  position: Point2
}

export interface LandmarkSite extends Site {
  kind: 'landmark'
  landmarkKind: 'castle'
}

export interface LandmarkDef {
  id: string
  kind: 'castle'
  districtId: DistrictId
  position: Point2
}

export interface CrownElement {
  id: string
  kind: string
  position: Point2
  row: 1 | 2
  phase: number
}

export interface BiomeLayout {
  id: 'medieval-meadow-kingdom'
  name: string
  worldSize: Point2
  frameSize: Point2
  groundHeight: number
  waterHeight: number
  riverWidth: number
  wetBandWidth: number
  river: Point2[]
  tributary: Point2[]
  roads: Array<{ id: string; points: Point2[]; width: number }>
  bridges: Bridge[]
  preserves: Preserve[]
  districts: DistrictDef[]
  sites: Site[]
  landmark: LandmarkDef
  creatureHeight: number
  creatureScale: number
  diorama: {
    backZ: number
    foregroundZ: number
    yawLimit: number
    pitchRange: [number, number]
  }
}

export interface GeneratedKingdom extends BiomeLayout {
  seed: number
  fixed: {
    river: Point2[]
    tributary: Point2[]
    roads: BiomeLayout['roads']
    bridges: Bridge[]
    preserves: Preserve[]
  }
}

export const PIXEL_SIZE = 2
export const OPEN_SHARE = 0.39

export const MEADOW_PALETTE = {
  sky: '#cfe5dc',
  skyNight: '#17223a',
  meadow: '#9fcf75',
  meadowLight: '#b9dc83',
  meadowDark: '#6f8055',
  forest: '#4f7d4a',
  forestLight: '#6d9c58',
  road: '#d8c49a',
  roadEdge: '#a58d68',
  court: '#d9d2c4',
  bank: '#6f9c66',
  water: '#5faeb6',
  waterNight: '#244a62',
  limestone: '#c7b98f',
  limestoneShade: '#9f906e',
  timber: '#6b4a3a',
  timberDark: '#402f2b',
  roof: '#68445a',
  coral: '#d9765c',
  ochre: '#c96f45',
  wheat: '#e6c45a',
  rose: '#b85c6b',
  light: '#ffe9a8',
  ink: '#2f3040',
} as const

const FOREST_POLYGON: Polygon = [
  [-105, -70], [-96, -80], [-81, -81], [-65, -76], [-58, -69], [-58, -59], [-63, -52], [-75, -49], [-91, -49], [-104, -58],
]
const RIVER_POLYGON: Polygon = [
  [-53, -24], [-44, -29], [-30, -28], [-18, -20], [-16, -13], [-18, -7], [-24, 2], [-34, 4], [-45, 3], [-53, -2], [-56, -10], [-56, -18],
]
const MARKET_POLYGON: Polygon = [
  [18, 7], [30, 6], [45, 8], [55, 15], [56, 24], [53, 31], [47, 35], [34, 36], [23, 34], [18, 28], [16, 19], [16, 12],
]
const FARM_POLYGON: Polygon = [
  [-99, 36], [-86, 31], [-68, 32], [-53, 40], [-50, 48], [-50, 57], [-58, 70], [-73, 76], [-90, 70], [-102, 58], [-102, 44],
]
const CASTLE_POLYGON: Polygon = [
  [52, -82], [62, -90], [78, -91], [92, -84], [98, -76], [98, -66], [95, -56], [87, -46], [72, -43], [58, -49], [51, -58], [49, -71],
]

export const FIXED_BRIDGES: Bridge[] = [
  { id: 'B1', name: 'Mill Bridge', center: [-9, -17.5], size: [20, 5], yaw: 62 },
  { id: 'B2', name: 'Market Bridge', center: [13.5, 16], size: [27, 6], yaw: 12 },
  { id: 'B3', name: 'Castle Causeway', center: [37, -62.5], size: [16, 5], yaw: 42 },
]

const RIVER: Point2[] = [
  [-22, -132], [-29, -107], [-16, -70], [-10, -15], [10, 34], [17, 88], [31, 132], [42, 190],
]

const TRIBUTARY: Point2[] = [
  [-13, -67], [9, -65], [34, -61], [50, -34],
]

const ROADS: BiomeLayout['roads'] = [
  { id: 'forest-river-lane', width: 5.4, points: [[-82, -50], [-69, -44], [-58, -36], [-46, -25], [-34, -15]] },
  { id: 'river-market-lane', width: 5.8, points: [[-34, -15], [-23, -7], [-10, 1], [4, 8], [18, 13], [31, 17]] },
  { id: 'market-farm-lane', width: 5.4, points: [[31, 17], [19, 25], [5, 32], [-10, 38], [-24, 43], [-35, 48], [-49, 58], [-65, 66]] },
  { id: 'castle-lane', width: 5.8, points: [[31, 17], [36, 2], [42, -13], [48, -27], [56, -40], [65, -50], [75, -58]] },
  { id: 'farm-common-lane', width: 3.6, points: [[-95, 48], [-84, 50], [-72, 54], [-60, 60]] },
]

const PRESERVES: Preserve[] = [
  { id: 'P1', name: 'North Meadow', center: [-35, -81], size: [44, 30] },
  { id: 'P2', name: 'Water Meadow', center: [38, -14], size: [42, 34] },
  { id: 'P3', name: 'South Common', center: [7, 76], size: [46, 36] },
  { id: 'P4', name: 'East Meadow', center: [79, 66], size: [50, 38] },
]

const CASTLE_SITE: LandmarkSite = {
  id: 'castle',
  kind: 'landmark',
  landmarkKind: 'castle',
  districtId: 'castle-court',
  position: [75, -67],
}

const CASTLE: LandmarkDef = {
  id: 'castle',
  kind: 'castle',
  districtId: 'castle-court',
  position: [75, -67],
}

export const MEADOW_KINGDOM: BiomeLayout = {
  id: 'medieval-meadow-kingdom',
  name: 'Medieval Meadow Kingdom',
  worldSize: [278, 260],
  frameSize: [184, 176],
  groundHeight: 0,
  waterHeight: -0.72,
  riverWidth: 18,
  wetBandWidth: 28,
  river: RIVER,
  tributary: TRIBUTARY,
  roads: ROADS,
  bridges: FIXED_BRIDGES,
  preserves: PRESERVES,
  districts: [
    {
      id: 'forest-hamlet',
      name: 'Forest Hamlet + Timber Common',
      band: 1,
      anchor: 'great oak · sawyard · timber common',
      centre: [-82, -64],
      polygon: FOREST_POLYGON,
      yaw: 0,
      maxJitter: 8,
      maxYaw: 35,
      stationAzimuth: -24,
      stationChord: 52,
      population: [0, 1, 3, 5, 6],
      accent: '#e8a13a',
    },
    {
      id: 'river-village',
      name: 'River Village + Mill',
      band: 2,
      anchor: 'waterwheel · landing · kitchen gardens',
      centre: [-35, -10],
      polygon: RIVER_POLYGON,
      yaw: 0,
      maxJitter: 7,
      maxYaw: 30,
      stationAzimuth: -12,
      stationChord: 45,
      population: [0, 1, 3, 5, 6],
      accent: MEADOW_PALETTE.coral,
    },
    {
      id: 'bridge-market',
      name: 'Bridge Market + Guild Court',
      band: 3,
      anchor: 'two-span bridge · guild hall · canopy peaks',
      centre: [36, 20],
      polygon: MARKET_POLYGON,
      yaw: 0,
      maxJitter: 6,
      maxYaw: 25,
      stationAzimuth: 8,
      stationChord: 46,
      population: [0, 2, 4, 6, 7],
      accent: MEADOW_PALETTE.ochre,
    },
    {
      id: 'farm-common',
      name: 'Farm + Village Common',
      band: 4,
      anchor: 'windmill · L-barn · orchard strips',
      centre: [-76, 54],
      polygon: FARM_POLYGON,
      yaw: 0,
      maxJitter: 10,
      maxYaw: 40,
      stationAzimuth: 22,
      stationChord: 58,
      population: [0, 1, 2, 4, 5],
      accent: MEADOW_PALETTE.wheat,
    },
    {
      id: 'castle-court',
      name: 'Crown Headland + Castle Court',
      band: 5,
      anchor: 'forecourt · gatehouse · hedge rooms',
      centre: [75, -67],
      polygon: CASTLE_POLYGON,
      yaw: 0,
      maxJitter: 4,
      maxYaw: 18,
      stationAzimuth: 30,
      stationChord: 54,
      population: [0, 0, 0, 0, 0],
      accent: MEADOW_PALETTE.rose,
    },
  ],
  sites: [
    { id: 'great-oak', kind: 'work', districtId: 'forest-hamlet', position: [-96, -67] },
    { id: 'mill', kind: 'work', districtId: 'river-village', position: [-22, -12] },
    { id: 'guild-court', kind: 'civic', districtId: 'bridge-market', position: [39, 20] },
    { id: 'windmill', kind: 'work', districtId: 'farm-common', position: [-64, 50] },
    CASTLE_SITE,
  ],
  landmark: CASTLE,
  creatureHeight: 1.45,
  creatureScale: 2.3,
  diorama: {
    backZ: -130,
    foregroundZ: 180,
    yawLimit: 35,
    pitchRange: [34, 40],
  },
}

/** North/back skyline with forested side wings; no crown geometry exists south of the kingdom. */
const FRONT_CROWN_X = [-8, 8, -24, 24, -40, 40, -56, 56, -72, 72, -88, 88, -104, 104, -124, 124]
const BACK_CROWN_X = [-16, 16, -48, 48, -80, 80, -112, 112, -132, 132, 0, -64, 64, -96, 96, 128]

export const GREEN_CROWN: CrownElement[] = Array.from({ length: 32 }, (_, index) => {
  const row: 1 | 2 = index < 16 ? 1 : 2
  const rowIndex = row === 1 ? index : index - 16
  const x = (row === 1 ? FRONT_CROWN_X : BACK_CROWN_X)[rowIndex]
  const wing = Math.pow(Math.abs(x) / 132, 1.7)
  return {
    id: `crown-${index}`,
    kind: index === 25 ? 'oak' : index >= 22 && index <= 24 ? 'limestone' : 'wooded-hill',
    position: [x, (row === 1 ? -108 : -124) + wing * (row === 1 ? 30 : 24)],
    row,
    phase: index / 32,
  }
})

export function seeded(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pointInPolygon(polygon: Polygon, x: number, z: number): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i]
    const [xj, zj] = polygon[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

function segmentDistance(a: Point2, b: Point2, p: Point2): number {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const length2 = dx * dx + dz * dz || 1
  const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / length2))
  return Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1])
}

export function polygonEdgeDistance(polygon: Polygon, point: Point2): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < polygon.length; i++) best = Math.min(best, segmentDistance(polygon[i], polygon[(i + 1) % polygon.length], point))
  return best
}

export function districtGap(a: DistrictDef, b: DistrictDef): number {
  if (a.polygon.some((point) => pointInPolygon(b.polygon, ...point)) || b.polygon.some((point) => pointInPolygon(a.polygon, ...point))) return 0
  let best = Number.POSITIVE_INFINITY
  for (const point of a.polygon) best = Math.min(best, polygonEdgeDistance(b.polygon, point))
  for (const point of b.polygon) best = Math.min(best, polygonEdgeDistance(a.polygon, point))
  return best
}

function transformPoint(point: Point2, centre: Point2, dx: number, dz: number, yaw: number): Point2 {
  const x = point[0] - centre[0]
  const z = point[1] - centre[1]
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return [centre[0] + dx + x * c - z * s, centre[1] + dz + x * s + z * c]
}

export function generateKingdom(seed: number): GeneratedKingdom {
  const rng = seeded(seed * 7919 + 17)
  const districts = MEADOW_KINGDOM.districts.map((district) => {
    const angle = rng() * Math.PI * 2
    const distance = Math.sqrt(rng()) * district.maxJitter * 0.25
    const dx = Math.cos(angle) * distance
    const dz = Math.sin(angle) * distance
    const yaw = ((rng() * 2 - 1) * district.maxYaw * Math.PI) / 180
    return {
      ...district,
      centre: [district.centre[0] + dx, district.centre[1] + dz] as Point2,
      polygon: district.polygon.map((point) => transformPoint(point, district.centre, dx, dz, yaw)),
      yaw,
    }
  })
  const castleDistrict = districts.find((district) => district.id === 'castle-court')!
  const landmark: LandmarkDef = {
    ...MEADOW_KINGDOM.landmark,
    position: transformPoint(MEADOW_KINGDOM.landmark.position, MEADOW_KINGDOM.districts[4].centre, castleDistrict.centre[0] - MEADOW_KINGDOM.districts[4].centre[0], castleDistrict.centre[1] - MEADOW_KINGDOM.districts[4].centre[1], castleDistrict.yaw),
  }
  const sites = MEADOW_KINGDOM.sites.map((site) => {
    const baseDistrict = MEADOW_KINGDOM.districts.find((district) => district.id === site.districtId)!
    const generatedDistrict = districts.find((district) => district.id === site.districtId)!
    return {
      ...site,
      position: transformPoint(
        site.position,
        baseDistrict.centre,
        generatedDistrict.centre[0] - baseDistrict.centre[0],
        generatedDistrict.centre[1] - baseDistrict.centre[1],
        generatedDistrict.yaw,
      ),
    }
  })
  return {
    ...MEADOW_KINGDOM,
    seed,
    districts,
    landmark,
    sites: sites.map((site) => (site.id === 'castle' ? { ...site, position: landmark.position } : site)),
    fixed: {
      river: MEADOW_KINGDOM.river,
      tributary: MEADOW_KINGDOM.tributary,
      roads: MEADOW_KINGDOM.roads,
      bridges: MEADOW_KINGDOM.bridges,
      preserves: MEADOW_KINGDOM.preserves,
    },
  }
}

export function bandForProgress(progress: number): number {
  return Math.floor(Math.min(1, Math.max(0, progress)) * 4 + 1e-9)
}

export function bandLabel(progress: number): string {
  return `${bandForProgress(progress) * 25}%`
}

export function populationFor(district: DistrictDef, progress: number) {
  const band = bandForProgress(progress)
  return {
    band,
    buildings: district.population[band],
    accent: band >= 1,
    workProps: band >= 2,
    clutter: band >= 3,
    extras: band >= 4,
  }
}

export function maxBuildings(district: DistrictDef): number {
  return district.population[4]
}

export function courseProgress(layout: BiomeLayout, progress: DistrictProgress): number {
  return layout.districts.reduce((sum, district) => sum + (progress[district.id] ?? 0), 0) / layout.districts.length
}

export function districtOrder(layout: BiomeLayout): DistrictDef[] {
  return [...layout.districts].sort((a, b) => a.band - b.band)
}

export function landmarkStage(progress: number): LandmarkStage {
  if (progress <= 0) return 'stake'
  if (progress < 1 / 3) return 's1'
  if (progress < 2 / 3) return 's2'
  return 's3'
}

export interface GreenCrownProfile {
  band: number
  crowns: number
  height: number
  secondRow: boolean
  limestoneShoulders: number
  oakHeight: number
}

export function greenCrownProfile(progress: number): GreenCrownProfile {
  const band = bandForProgress(progress)
  return {
    band,
    crowns: [8, 12, 16, 22, 26][band],
    height: [6, 8, 10, 14, 16][band],
    secondRow: band >= 3,
    limestoneShoulders: band === 4 ? 3 : 0,
    oakHeight: band === 4 ? 18 : 0,
  }
}

export function routeNetwork(layout: BiomeLayout) {
  return layout.roads
}

export function castleRenderInstances(layout: BiomeLayout): number {
  return layout.sites.filter((site) => site.kind === 'landmark' && site.id === layout.landmark.id).length
}

export function creatureViewportFraction(creatureHeight: number, chord: number, fitWidth: number, aspect: number, pitchDeg: number): number {
  const visibleHeight = chord / fitWidth / aspect
  return (creatureHeight * Math.cos((pitchDeg * Math.PI) / 180)) / visibleHeight
}

export interface LayoutExport {
  version: 4
  biome: string
  seed: number
  openShare: number
  districts: Array<Omit<DistrictDef, 'population'> & { progress: number; population: ReturnType<typeof populationFor> }>
  fixed: GeneratedKingdom['fixed']
  landmark: { stage: LandmarkStage; renderInstances: number; site: LandmarkDef }
  greenCrown: GreenCrownProfile
  courseProgress: number
  camera: unknown
}

export function buildLayoutExport(layout: GeneratedKingdom, progress: DistrictProgress, camera: unknown): LayoutExport {
  const fraction = courseProgress(layout, progress)
  return {
    version: 4,
    biome: layout.id,
    seed: layout.seed,
    openShare: OPEN_SHARE,
    districts: layout.districts.map((district) => ({
      ...district,
      progress: progress[district.id] ?? 0,
      population: populationFor(district, progress[district.id] ?? 0),
    })),
    fixed: layout.fixed,
    landmark: {
      stage: landmarkStage(fraction),
      renderInstances: castleRenderInstances(layout),
      site: layout.landmark,
    },
    greenCrown: greenCrownProfile(fraction),
    courseProgress: fraction,
    camera,
  }
}
