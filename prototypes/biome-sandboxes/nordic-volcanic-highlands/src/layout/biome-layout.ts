export type DistrictKind = 'fjord-village' | 'basalt-canyon' | 'highland-hamlet' | 'geothermal-farms' | 'archipelago'
export type DistrictProgress = Record<string, number>
export type LandmarkStage = 'cairn' | 'ring' | 'beacon'
export type Point = [number, number]

export interface DistrictDef {
  id: DistrictKind
  name: string
  band: number
  anchor: string
  center: Point
  jitter: number
  yawDeg: number
  yawJitter: number
  footprintRadius: number
  stationAzimuth: number
  material: 'village' | 'basalt' | 'pasture' | 'geothermal' | 'lava'
  population: [number, number, number, number, number]
}

export interface GeneratedDistrict extends DistrictDef {
  center: Point
  yawDeg: number
  colorOrder: number
  clutter: number
}

export interface BiomeLayout {
  id: string
  name: string
  direction: string
  worldExtent: number
  frameRadius: number
  seaLevel: number
  groundHeight: number
  creatureHeight: number
  creatureScale: number
  cameraYawLimit: number
  horizon: { northZ: number; southRim: false }
  fjord: Point[]
  routes: Point[][]
  preserves: Array<{ id: string; center: Point; size: Point }>
  lavaBasin: { center: Point; roadConnected: boolean; islets: Array<{ center: Point; radii: Point }> }
  volcanoFoot: Point
  landmark: { center: Point; yawDeg: number }
  districts: DistrictDef[]
}

export const NORDIC_PALETTE = {
  sky: '#c7d4d6',
  skyNight: '#101a2d',
  fog: '#d4d8d5',
  ground: '#68765b',
  groundNight: '#34434a',
  cliff: '#2e3440',
  basalt: '#4b4a52',
  rearRim: '#55616a',
  road: '#8a7f6d',
  roadEdge: '#544f49',
  wet: '#526a68',
  water: '#315b70',
  waterNight: '#172f40',
  deepWater: '#203f52',
  geothermal: '#7cc8be',
  lava: '#d95336',
  hot: '#ffad42',
  red: '#c85643',
  ochre: '#d08a3c',
  cream: '#e8dfc9',
  turf: '#556b46',
  window: '#ffe9a8',
} as const

export const NORDIC_LAYOUT: BiomeLayout = {
  id: 'nordic-volcanic-highlands',
  name: 'Nordic Volcanic Highlands',
  direction: 'A — Fjord First / Ashen Homesteads',
  worldExtent: 170,
  frameRadius: 112,
  seaLevel: -1.2,
  groundHeight: 3,
  creatureHeight: 1.8,
  creatureScale: 1.5,
  cameraYawLimit: 35,
  horizon: { northZ: -126, southRim: false },
  fjord: [
    [-12, 148],
    [-35, 59],
    [3, 4],
    [18, -74],
    [25, -145],
  ],
  routes: [
    [[-116, -61], [-84, -60], [-54, -55], [-30, -48], [8, -36], [60, -18], [95, -28], [119, -52]],
    [[-84, 31], [-66, 27], [-53, 30]],
    [[-27, -49], [-16, -41], [-5, -35]],
    [[60, -14], [68, -5], [78, 6]],
  ],
  preserves: [
    { id: 'P1', center: [-2, -97], size: [30, 18] },
    { id: 'P2', center: [-13, 53], size: [28, 26] },
    { id: 'P3', center: [127, 8], size: [34, 32] },
  ],
  lavaBasin: {
    center: [67, 70],
    roadConnected: false,
    islets: [
      { center: [49, 58], radii: [15, 12] },
      { center: [82, 69], radii: [18, 14] },
      { center: [59, 87], radii: [13, 10] },
    ],
  },
  volcanoFoot: [8, -126],
  landmark: { center: [133, -70], yawDeg: -35 },
  districts: [
    {
      id: 'fjord-village',
      name: 'Fjord Village + Quay',
      band: 1,
      anchor: 'T-quay · ochre boathouse',
      center: [-84, 31],
      jitter: 7,
      yawDeg: -18,
      yawJitter: 22,
      footprintRadius: 18,
      stationAzimuth: 28,
      material: 'village',
      population: [0, 3, 6, 9, 11],
    },
    {
      id: 'basalt-canyon',
      name: 'Basalt Canyon + Mine/Forge',
      band: 2,
      anchor: '16 m gantry · black canyon slit',
      center: [-116, -64],
      jitter: 8,
      yawDeg: 12,
      yawJitter: 18,
      footprintRadius: 20,
      stationAzimuth: 24,
      material: 'basalt',
      population: [0, 1, 3, 6, 8],
    },
    {
      id: 'highland-hamlet',
      name: 'Highland Hamlet + Pasture',
      band: 3,
      anchor: 'Crossed turf halls · stone pasture',
      center: [-27, -49],
      jitter: 9,
      yawDeg: -6,
      yawJitter: 28,
      footprintRadius: 18,
      stationAzimuth: 18,
      material: 'pasture',
      population: [0, 2, 5, 8, 10],
    },
    {
      id: 'geothermal-farms',
      name: 'Geothermal Farms + Outpost',
      band: 4,
      anchor: 'Steam tripod · three aqua pools',
      center: [60, -14],
      jitter: 10,
      yawDeg: 17,
      yawJitter: 20,
      footprintRadius: 20,
      stationAzimuth: -22,
      material: 'geothermal',
      population: [0, 1, 4, 7, 9],
    },
    {
      id: 'archipelago',
      name: 'Lava Archipelago',
      band: 5,
      anchor: 'Natural lava arch · three islets',
      center: [67, 70],
      jitter: 6,
      yawDeg: 31,
      yawJitter: 14,
      footprintRadius: 15,
      stationAzimuth: -32,
      material: 'lava',
      population: [0, 1, 2, 4, 5],
    },
  ],
}

export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateDistricts(layout: BiomeLayout, seed: number): GeneratedDistrict[] {
  return layout.districts.map((district, index) => {
    const rng = seeded(seed * 1009 + index * 7919 + 73)
    const angle = rng() * Math.PI * 2
    const radius = Math.sqrt(rng()) * district.jitter
    return {
      ...district,
      center: [district.center[0] + Math.cos(angle) * radius, district.center[1] + Math.sin(angle) * radius],
      yawDeg: district.yawDeg + (rng() * 2 - 1) * district.yawJitter,
      colorOrder: Math.floor(rng() * 3),
      clutter: 0.55 + rng() * 0.45,
    }
  })
}

export function minimumDistrictGap(districts: GeneratedDistrict[]): number {
  let minimum = Number.POSITIVE_INFINITY
  for (let i = 0; i < districts.length; i++) {
    for (let j = i + 1; j < districts.length; j++) {
      const a = districts[i]
      const b = districts[j]
      minimum = Math.min(minimum, Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) - a.footprintRadius - b.footprintRadius)
    }
  }
  return minimum
}

export function bandForProgress(progress: number): number {
  return Math.floor(Math.min(1, Math.max(0, progress)) * 4 + 1e-9)
}

export function progressFromQuery(value: string | null): number {
  if (value === null || value.trim() === '') return 0.75
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0.75
  return Math.min(1, Math.max(0, parsed))
}

export function bandLabel(progress: number): string {
  return `${bandForProgress(progress) * 25}%`
}

export function populationFor(district: DistrictDef, progress: number) {
  const band = bandForProgress(progress)
  return {
    band,
    structures: district.population[band],
    accent: band >= 1,
    fences: band >= 2,
    clutter: band >= 3,
    extra: band >= 4,
  }
}

export function courseProgress(layout: BiomeLayout, progress: DistrictProgress): number {
  return layout.districts.reduce((sum, d) => sum + (progress[d.id] ?? 0), 0) / layout.districts.length
}

export function volcanoProfile(fraction: number) {
  const band = bandForProgress(fraction)
  return {
    band,
    shoulders: [3, 5, 7, 9, 11][band],
    height: [8, 11, 15, 18, 22][band],
    secondRow: band >= 3,
    glowArc: band >= 4 ? 0.08 : 0,
  }
}

export function landmarkStage(fraction: number): LandmarkStage {
  if (fraction < 0.5) return 'cairn'
  if (fraction < 1) return 'ring'
  return 'beacon'
}

export function districtOrder(layout: BiomeLayout): DistrictDef[] {
  return [...layout.districts].sort((a, b) => a.band - b.band)
}

export function districtCentre(district: DistrictDef): Point {
  return district.center
}

export function districtChord(district: DistrictDef): number {
  return {
    'fjord-village': 84,
    'basalt-canyon': 62,
    'highland-hamlet': 62,
    'geothermal-farms': 66,
    archipelago: 80,
  }[district.id]
}

export function creatureViewportFraction(creatureHeight: number, chord: number, fitWidth: number, aspect: number, pitchDeg: number): number {
  return (creatureHeight * Math.cos((pitchDeg * Math.PI) / 180)) / (chord / fitWidth / aspect)
}

export function fogRange(cameraDistance: number, mist: boolean) {
  return mist
    ? { near: cameraDistance + 160, far: cameraDistance + 900 }
    : { near: cameraDistance + 300, far: cameraDistance + 1200 }
}

export type AmbientEvent = { kind: 'boat' | 'geyser'; startAt: number; duration: number; lane: number }

export function ambientEventSchedule(seed: number, count = 24): AmbientEvent[] {
  const rng = seeded(seed * 31 + 17)
  const events: AmbientEvent[] = []
  let time = 6 + rng() * 8
  for (let i = 0; i < count; i++) {
    const kind = i % 3 === 1 ? 'geyser' : 'boat'
    events.push({ kind, startAt: time, duration: kind === 'boat' ? 12 + rng() * 8 : 2.5 + rng() * 2, lane: Math.floor(rng() * 3) })
    time += 12 + rng() * 20
  }
  return events
}

export function buildLayoutExport(layout: BiomeLayout, progress: DistrictProgress, seed: number, camera: unknown) {
  const fraction = courseProgress(layout, progress)
  return {
    version: 4 as const,
    biome: layout.id,
    direction: layout.direction,
    seed,
    fixed: {
      fjord: layout.fjord,
      routes: layout.routes,
      preserves: layout.preserves,
      lavaBasin: layout.lavaBasin,
      landmark: layout.landmark,
    },
    districts: generateDistricts(layout, seed),
    districtProgress: progress,
    progress: { course: fraction, landmark: landmarkStage(fraction), volcano: volcanoProfile(fraction) },
    creature: { height: layout.creatureHeight, scale: layout.creatureScale },
    pixelSize: 2,
    camera,
  }
}
