/**
 * Coastal Ruins procedural contract. Coordinates are metres: +x east, +z south.
 * Coast, hydrology, catchments, routes, preserves, skyline foot, and headland are fixed.
 * A seed only moves district content inside its labelled envelope and changes local yaw.
 */

export type DistrictKind = 'cliff-village' | 'archaeology-ridge' | 'dry-terraces' | 'drowned-forum' | 'working-quay'
export type BuildingKind = 'plaster-house' | 'survey-shelter' | 'terrace-shed' | 'forum-shelter' | 'quay-workshop'
export type DistrictProgress = Record<string, number>
export type Point2 = [number, number]

export interface DistrictDef {
  id: DistrictKind
  name: string
  band: number
  anchor: string
  motif: string
  nominalCenter: Point2
  catchment: Point2[]
  jitter: Point2
  yawRange: number
  laneYaw: number
  stationAzimuth: number
  cameraChord: number
  building: BuildingKind
  population: [number, number, number, number, number]
  accent: string
  wet?: boolean
}

export interface BoatRoute {
  id: 'headland' | 'forum-loop' | 'outer-coast'
  points: Point2[]
}

export interface BiomeLayout {
  id: 'coastal-ruins'
  planVersion: 3
  name: string
  direction: string
  worldExtent: number
  frameRadius: number
  /** Render metres are compressed for the builder camera; exported coordinates stay real metres. */
  renderScale: number
  seaLevel: number
  groundHeight: number
  relief: number
  fog: { near: number; far: number }
  coastline: Point2[]
  headland: { center: Point2; polygon: Point2[]; height: number }
  districts: DistrictDef[]
  protectedOpen: Array<{ center: Point2; size: Point2 }>
  boatRoutes: BoatRoute[]
  shallowsWidth: number
  creatureHeight: number
  creatureScale: number
}

export const COASTAL_PALETTE = {
  sky: '#d9eef0',
  skyNight: '#1b2d3b',
  ground: '#e8dfc6',
  plaster: '#f5efdc',
  cliff: '#b98762',
  cliffNight: '#6f554a',
  ruin: '#9d9078',
  ruinDark: '#766f5d',
  road: '#f5efdc',
  roadEdge: '#c7b894',
  shallows: '#63bec6',
  shallowsNight: '#397f8b',
  water: '#2f7f99',
  waterNight: '#173f58',
  cobalt: '#5279a5',
  vine: '#c64b92',
  violet: '#5e466f',
  olive: '#6f805c',
  ochre: '#c88955',
  horizon: '#b7a981',
  horizonBack: '#9aa99f',
  ink: '#273e49',
  window: '#ffe9a8',
} as const

const districts: DistrictDef[] = [
  {
    id: 'cliff-village',
    name: 'Cliff Village Terraces',
    band: 1,
    anchor: '36 m civic stair zigzag',
    motif: 'white/cyan stepped lanes · one vine court',
    nominalCenter: [-26, -55],
    catchment: [[-53, -73], [-39, -80], [-19, -78], [1, -68], [2, -48], [-9, -34], [-31, -32], [-50, -41], [-55, -58]],
    jitter: [8, 6],
    yawRange: 16,
    laneYaw: -0.3,
    stationAzimuth: 20,
    cameraChord: 40,
    building: 'plaster-house',
    population: [0, 2, 5, 8, 10],
    accent: COASTAL_PALETTE.vine,
  },
  {
    id: 'archaeology-ridge',
    name: 'Archaeology Ridge',
    band: 2,
    anchor: '41 m six-tooth column comb',
    motif: 'survey yard · cistern · cataloguing shelter',
    nominalCenter: [-112, -24],
    catchment: [[-135, -39], [-125, -47], [-105, -46], [-90, -35], [-89, -14], [-101, -3], [-121, -5], [-135, -17]],
    jitter: [7, 6],
    yawRange: 18,
    laneYaw: 0.12,
    stationAzimuth: -35,
    cameraChord: 41,
    building: 'survey-shelter',
    population: [0, 1, 2, 3, 4],
    accent: COASTAL_PALETTE.cobalt,
  },
  {
    id: 'dry-terraces',
    name: 'Dry Terraces',
    band: 3,
    anchor: 'three retaining-wall crescents',
    motif: 'olive garden · lime kiln · cobalt cistern',
    nominalCenter: [72, -58],
    catchment: [[46, -75], [63, -80], [85, -78], [98, -64], [97, -45], [83, -36], [60, -37], [47, -49]],
    jitter: [8, 5],
    yawRange: 14,
    laneYaw: 0.04,
    stationAzimuth: 25,
    cameraChord: 40,
    building: 'terrace-shed',
    population: [0, 1, 2, 3, 4],
    accent: COASTAL_PALETTE.cobalt,
  },
  {
    id: 'drowned-forum',
    name: 'Drowned Forum Cove',
    band: 4,
    anchor: '28 m dark broken forum ring',
    motif: 'mosaic quay · submerged steps · glass-bottom stop',
    nominalCenter: [-12, 38],
    catchment: [[-39, 18], [-25, 13], [-4, 17], [13, 30], [14, 48], [0, 60], [-20, 61], [-38, 50], [-43, 34]],
    jitter: [7, 6],
    yawRange: 18,
    laneYaw: -0.2,
    stationAzimuth: -10,
    cameraChord: 40,
    building: 'forum-shelter',
    population: [0, 1, 2, 3, 4],
    accent: COASTAL_PALETTE.cobalt,
    wet: true,
  },
  {
    id: 'working-quay',
    name: 'Working Quay & Cove Town',
    band: 5,
    anchor: '32 m L-shaped working quay',
    motif: 'market · repair sheds · violet awning',
    nominalCenter: [86, 30],
    catchment: [[62, 11], [76, 7], [99, 11], [111, 24], [108, 42], [94, 51], [73, 48], [60, 35]],
    jitter: [8, 6],
    yawRange: 16,
    laneYaw: 0.9,
    stationAzimuth: 32,
    cameraChord: 41,
    building: 'quay-workshop',
    population: [0, 2, 4, 6, 8],
    accent: COASTAL_PALETTE.violet,
  },
]

export const COASTAL_RUINS_LAYOUT: BiomeLayout = {
  id: 'coastal-ruins',
  planVersion: 3,
  name: 'Coastal Ruins',
  direction: 'A — Salt-White Working Coast',
  worldExtent: 400,
  frameRadius: 86,
  renderScale: 0.17,
  seaLevel: 0,
  groundHeight: 2.4,
  relief: 0.22,
  fog: { near: 210, far: 310 },
  coastline: [
    [-420, -420], [420, -420], [420, -73], [148, -73], [130, -64], [111, -61], [98, -49], [91, -31],
    [103, -17], [98, 2], [82, 16], [66, 22], [54, 38], [39, 49], [24, 46], [12, 31], [0, 24],
    [-12, 31], [-25, 49], [-44, 64], [-67, 75], [-91, 72], [-114, 60], [-132, 44], [-148, 37], [-420, 37],
  ],
  headland: {
    center: [104, 96],
    polygon: [[84, 83], [93, 77], [111, 78], [123, 88], [122, 104], [112, 113], [95, 113], [84, 103]],
    height: 2,
  },
  districts,
  protectedOpen: [
    { center: [-68, 29], size: [30, 24] },
    { center: [27, -7], size: [28, 22] },
    { center: [-36, 98], size: [34, 26] },
    { center: [38, 89], size: [28, 24] },
  ],
  boatRoutes: [
    { id: 'headland', points: [[101, 55], [112, 62], [122, 70], [123, 84]] },
    { id: 'forum-loop', points: [[86, 56], [66, 66], [42, 76], [18, 82], [-7, 79], [-30, 72], [-54, 58]] },
    { id: 'outer-coast', points: [[-63, 78], [-30, 98], [8, 106], [46, 104], [85, 94]] },
  ],
  shallowsWidth: 18,
  creatureHeight: 1.65,
  creatureScale: 2,
}

export const DIORAMA_VIEWS = ([-35, 0, 35] as const).flatMap((yaw) =>
  ([1, 1.55] as const).map((dolly) => ({
    yaw,
    dolly,
    backBlockerHeight: dolly === 1.55 ? 10 : 8,
    sideFog: true,
    frontSeaOpen: true,
  })),
).sort((a, b) => a.dolly - b.dolly || a.yaw - b.yaw)

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

export interface SeededDistrict {
  center: Point2
  yawDeg: number
}

export type SeededDistrictPlan = Record<DistrictKind, SeededDistrict>

export function seededDistrictPlan(layout: BiomeLayout, seed: number): SeededDistrictPlan {
  const entries = layout.districts.map((district) => {
    const rng = seeded(seed * 101 + district.band * 7919)
    const angle = rng() * Math.PI * 2
    const radius = Math.sqrt(rng())
    const center: Point2 = [
      district.nominalCenter[0] + Math.cos(angle) * district.jitter[0] * radius,
      district.nominalCenter[1] + Math.sin(angle) * district.jitter[1] * radius,
    ]
    return [district.id, { center, yawDeg: (rng() * 2 - 1) * district.yawRange }] as const
  })
  return Object.fromEntries(entries) as SeededDistrictPlan
}

export function pointInPolygon(poly: Point2[], x: number, z: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

function segmentDistance(a: Point2, b: Point2, x: number, z: number): number {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const length2 = dx * dx + dz * dz || 1
  const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / length2))
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)
}

export function polygonEdgeDistance(poly: Point2[], x: number, z: number): number {
  let distance = Number.POSITIVE_INFINITY
  for (let i = 0; i < poly.length; i++) distance = Math.min(distance, segmentDistance(poly[i], poly[(i + 1) % poly.length], x, z))
  return distance
}

export function polygonField(poly: Point2[], x: number, z: number): number {
  const distance = polygonEdgeDistance(poly, x, z)
  return pointInPolygon(poly, x, z) ? distance : -distance
}

export function districtCentre(district: DistrictDef): Point2 {
  return district.nominalCenter
}

export function districtField(district: DistrictDef, x: number, z: number): number {
  return polygonField(district.catchment, x, z)
}

export function districtGap(a: DistrictDef, b: DistrictDef): number {
  if (a.catchment.some(([x, z]) => pointInPolygon(b.catchment, x, z)) || b.catchment.some(([x, z]) => pointInPolygon(a.catchment, x, z))) return 0
  let gap = Number.POSITIVE_INFINITY
  for (const [poly, other] of [[a.catchment, b.catchment], [b.catchment, a.catchment]] as const) {
    for (let i = 0; i < poly.length; i++) {
      const start = poly[i]
      const end = poly[(i + 1) % poly.length]
      for (let step = 0; step <= 10; step++) {
        const t = step / 10
        gap = Math.min(gap, polygonEdgeDistance(other, start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t))
      }
    }
  }
  return gap
}

export function bandForProgress(progress: number): number {
  return Math.floor(Math.min(1, Math.max(0, progress)) * 4 + 1e-9)
}

export function bandLabel(progress: number): string {
  return `${bandForProgress(progress) * 25}%`
}

export interface Population {
  band: number
  buildings: number
  accent: boolean
  props: boolean
  lamps: boolean
  residents: boolean
}

export function populationFor(district: DistrictDef, progress: number): Population {
  const band = bandForProgress(progress)
  return {
    band,
    buildings: district.population[band],
    accent: band >= 1,
    props: band >= 2,
    lamps: band >= 3,
    residents: band >= 4,
  }
}

export function maxBuildings(district: DistrictDef): number {
  return district.population[4]
}

export function courseProgress(layout: BiomeLayout, progress: DistrictProgress): number {
  return layout.districts.reduce((sum, district) => sum + (progress[district.id] ?? 0), 0) / layout.districts.length
}

export interface SkylineProfile {
  band: number
  shoulders: number
  height: number
  secondRowOpacity: number
  slitMasses: number
}

export function skylineProfile(progress: number): SkylineProfile {
  const band = bandForProgress(progress)
  return {
    band,
    shoulders: [3, 4, 6, 8, 9][band],
    height: [8, 10, 13, 16, 18][band],
    secondRowOpacity: band >= 3 ? (band === 3 ? 0.55 : 0.82) : 0.18,
    slitMasses: band === 4 ? 4 : 0,
  }
}

/** Compatibility alias retained for the copied scene while it is converted. */
export const mountainProfile = skylineProfile
export type MountainProfile = SkylineProfile

export type LandmarkStage = 's1' | 's2' | 's3'

export function landmarkStage(progress: number): LandmarkStage {
  if (progress < 0.33) return 's1'
  if (progress < 0.67) return 's2'
  return 's3'
}

export function districtOrder(layout: BiomeLayout): DistrictDef[] {
  return [...layout.districts].sort((a, b) => a.band - b.band)
}

export function creatureViewportFraction(height: number, chord: number, fitWidth: number, aspect: number, pitchDeg: number): number {
  const visibleHeight = chord / fitWidth / aspect
  return (height * Math.cos((pitchDeg * Math.PI) / 180)) / visibleHeight
}

export interface LayoutExport {
  version: 4
  biome: string
  direction: string
  seed: number
  fixedWorld: {
    coastline: Point2[]
    headland: BiomeLayout['headland']
    protectedOpen: BiomeLayout['protectedOpen']
    fog: BiomeLayout['fog']
  }
  boatRoutes: BoatRoute[]
  districts: Array<{
    id: DistrictKind
    catchment: Point2[]
    seeded: SeededDistrict
    progress: number
    population: Population
  }>
  skyline: SkylineProfile
  landmark: LandmarkStage
  courseProgress: number
  camera: unknown
}

export function buildLayoutExport(layout: BiomeLayout, progress: DistrictProgress, seed: number, camera: unknown): LayoutExport {
  const fraction = courseProgress(layout, progress)
  const plan = seededDistrictPlan(layout, seed)
  return {
    version: 4,
    biome: layout.id,
    direction: layout.direction,
    seed,
    fixedWorld: {
      coastline: layout.coastline,
      headland: layout.headland,
      protectedOpen: layout.protectedOpen,
      fog: layout.fog,
    },
    boatRoutes: layout.boatRoutes,
    districts: layout.districts.map((district) => ({
      id: district.id,
      catchment: district.catchment,
      seeded: plan[district.id],
      progress: progress[district.id] ?? 0,
      population: populationFor(district, progress[district.id] ?? 0),
    })),
    skyline: skylineProfile(fraction),
    landmark: landmarkStage(fraction),
    courseProgress: fraction,
    camera,
  }
}
