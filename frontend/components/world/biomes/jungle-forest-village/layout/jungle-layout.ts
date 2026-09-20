export type DistrictId = 'canopy' | 'falls' | 'lagoon' | 'ruins' | 'riverworks'
export type Progress = Record<string, number>
export type LandmarkStage = 'stake' | 's1' | 's2' | 's3'

export interface DistrictDef {
  id: DistrictId
  name: string
  anchor: string
  center: [number, number]
  footprint: [number, number]
  buildRadius: number
  jitter: [number, number]
  yaw: number
  yawJitter: number
  stationAzimuth: number
  cameraChord: number
  primary: [number, number, number, number, number]
  secondary: [number, number, number, number, number]
  primaryLabel: string
  secondaryLabel: string
  accent: string
}

export interface SeededDistrict extends DistrictDef {
  center: [number, number]
  yaw: number
}

export const JUNGLE_PALETTE = {
  sky: '#d9eee2',
  skyNight: '#102a25',
  ground: '#69a85f',
  groundAlt: '#93bd62',
  canopy: '#356f48',
  canopyDark: '#234c3b',
  canopyNight: '#173529',
  cliff: '#4f8a4a',
  path: '#c69758',
  pathEdge: '#6c4c37',
  wet: '#2b797c',
  water: '#55c4c2',
  waterLight: '#87d9cf',
  waterNight: '#1f6268',
  ruin: '#b7a58f',
  bark: '#5a3e2b',
  deck: '#b88a50',
  gold: '#f2b84f',
  coral: '#ee8b5a',
  window: '#ffe9a8',
  ink: '#173629',
} as const

export const JUNGLE_LAYOUT = {
  id: 'jungle-forest-village',
  name: 'Jungle / Forest Village',
  direction: 'River-Canopy Commons',
  field: [288, 264] as [number, number],
  worldExtent: 190,
  frameRadius: 106,
  groundHeight: 0,
  hydrology: {
    waterfall: [22, -118] as [number, number],
    riverWidth: 9.5,
    wetWidth: 14,
    river: [
      [22, -118],
      [21, -101],
      [25, -88],
      [22, -79],
      [12, -60],
      [10, -45],
      [18, -29],
      [35, -14],
      [42, 2],
      [48, 16],
      [63, 23],
      [82, 30],
      [116, 46],
    ] as Array<[number, number]>,
    lagoon: { center: [73, 27] as [number, number], size: [62, 52] as [number, number] },
  },
  bridges: [
    { id: 'falls-crossing', a: [5, -54] as [number, number], b: [31, -49] as [number, number], length: 27 },
    { id: 'lagoon-crossing', a: [34, -8] as [number, number], b: [51, -1] as [number, number], length: 18 },
  ],
  clearings: [
    { id: 'firefly', name: 'Firefly Clearing', center: [-2, 8] as [number, number], size: [38, 24] as [number, number] },
    { id: 'orchid', name: 'Orchid Glade', center: [-91, -70] as [number, number], size: [32, 26] as [number, number] },
    { id: 'sunbreak', name: 'Sunbreak', center: [27, 52] as [number, number], size: [36, 26] as [number, number] },
  ],
  headland: { center: [102, 80] as [number, number], size: [34, 42] as [number, number] },
  horizon: {
    orientation: 'north-back',
    primary: { z: [-136, -104] as [number, number], height: [14, 24] as [number, number] },
    secondary: { z: [-164, -132] as [number, number], height: [10, 15] as [number, number] },
    wings: { x: [-190, 190] as [number, number], taperFrom: 104 },
    fog: { startsBehindPrimary: 18, opaqueAfter: 58 },
  },
  creature: { height: 1.8, scale: 1.65 },
  districts: [
    {
      id: 'canopy',
      name: 'Great Canopy Village',
      anchor: 'Mother Tree · three civic deck rings',
      center: [-53, -27],
      footprint: [74, 58],
      buildRadius: 23,
      jitter: [12, 8],
      yaw: -18,
      yawJitter: 12,
      stationAzimuth: -35,
      cameraChord: 54,
      primary: [0, 3, 5, 7, 10],
      secondary: [0, 1, 3, 5, 7],
      primaryLabel: 'dwelling pods',
      secondaryLabel: 'canopy spans',
      accent: JUNGLE_PALETTE.gold,
    },
    {
      id: 'falls',
      name: 'Falls Terraces',
      anchor: 'white fall · fixed rope crossing',
      center: [24, -79],
      footprint: [66, 52],
      buildRadius: 20,
      jitter: [10, 7],
      yaw: 10,
      yawJitter: 15,
      stationAzimuth: 15,
      cameraChord: 48,
      primary: [0, 2, 4, 6, 8],
      secondary: [0, 1, 2, 3, 4],
      primaryLabel: 'upper homes',
      secondaryLabel: 'mist stalls',
      accent: JUNGLE_PALETTE.coral,
    },
    {
      id: 'lagoon',
      name: 'Lagoon Quarter',
      anchor: 'long stilt hall · ferry fingers',
      center: [69, 2],
      footprint: [68, 58],
      buildRadius: 21,
      jitter: [9, 11],
      yaw: -8,
      yawJitter: 18,
      stationAzimuth: 30,
      cameraChord: 49,
      primary: [0, 2, 4, 6, 8],
      secondary: [1, 1, 2, 3, 4],
      primaryLabel: 'stilt homes',
      secondaryLabel: 'dock fingers',
      accent: '#e6b45a',
    },
    {
      id: 'ruins',
      name: 'Ruin Commons',
      anchor: 'broken root gate · vine court',
      center: [-76, 55],
      footprint: [64, 54],
      buildRadius: 20,
      jitter: [12, 9],
      yaw: 16,
      yawJitter: 20,
      stationAzimuth: -30,
      cameraChord: 48,
      primary: [0, 2, 4, 6, 8],
      secondary: [0, 1, 2, 3, 4],
      primaryLabel: 'market canopies',
      secondaryLabel: 'archive bays',
      accent: '#d97a58',
    },
    {
      id: 'riverworks',
      name: 'Riverworks',
      anchor: 'waterwheel · canopy farms',
      center: [6, 66],
      footprint: [72, 52],
      buildRadius: 21,
      jitter: [10, 8],
      yaw: -12,
      yawJitter: 20,
      stationAzimuth: 22,
      cameraChord: 50,
      primary: [0, 2, 4, 6, 8],
      secondary: [0, 1, 2, 3, 4],
      primaryLabel: 'farm rows',
      secondaryLabel: 'mill sheds',
      accent: '#e3a35e',
    },
  ] as DistrictDef[],
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

export function seededDistricts(seed: number): SeededDistrict[] {
  return JUNGLE_LAYOUT.districts.map((district, index) => {
    const rng = seeded(seed * 101 + index * 997 + 17)
    return {
      ...district,
      center: [
        district.center[0] + (rng() * 2 - 1) * district.jitter[0] * 0.68,
        district.center[1] + (rng() * 2 - 1) * district.jitter[1] * 0.68,
      ],
      yaw: district.yaw + (rng() * 2 - 1) * district.yawJitter,
    }
  })
}

export function districtGap(a: SeededDistrict, b: SeededDistrict): number {
  return Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) - a.buildRadius - b.buildRadius
}

export function bandForProgress(progress: number): number {
  return Math.floor(Math.min(1, Math.max(0, progress)) * 4 + 1e-9)
}

export function bandLabel(progress: number): string {
  return `${bandForProgress(progress) * 25}%`
}

export function populationFor(district: DistrictDef, progress: number) {
  const band = bandForProgress(progress)
  const primary = district.primary[band]
  const secondary = district.secondary[band]
  return {
    band,
    primary,
    secondary,
    structures: primary + secondary,
    lamps: band >= 2,
    clutter: band >= 3,
    extras: band >= 4,
  }
}

export function courseProgress(progress: Progress): number {
  const values = JUNGLE_LAYOUT.districts.map((district) => progress[district.id] ?? 0)
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export interface SkylineProfile {
  band: number
  crowns: number
  maxHeight: number
  ridgeHeight: number
  secondRow: boolean
  emergents: number
  groundHeight: 0
}

export function skylineProfile(fraction: number): SkylineProfile {
  const band = bandForProgress(fraction)
  return {
    band,
    crowns: [8, 12, 17, 24, 28][band],
    maxHeight: [18, 21, 22, 24, 26][band],
    ridgeHeight: [12, 15, 18, 22, 24][band],
    secondRow: band >= 3,
    emergents: band === 4 ? 2 : 0,
    groundHeight: 0,
  }
}

export interface HorizonTree {
  x: number
  z: number
  h: number
  s: number
  row: 1 | 2
}

/** North/back canopy wall plus tapering east/west wings. Nothing is placed south/front. */
export function canopyHorizon(seed: number, fraction: number): HorizonTree[] {
  const rng = seeded(seed * 17 + 20260920)
  const profile = skylineProfile(fraction)
  const output: HorizonTree[] = []
  const row = (
    count: number,
    span: number,
    zRange: [number, number],
    heightRange: [number, number],
    which: 1 | 2,
  ) => {
    for (let index = 0; index < count; index++) {
      const t = index / (count - 1)
      output.push({
        x: -span + t * span * 2 + (rng() - 0.5) * 5,
        z: zRange[0] + rng() * (zRange[1] - zRange[0]),
        h: heightRange[0] + rng() * (heightRange[1] - heightRange[0]),
        s: 0.72 + rng() * 0.34,
        row: which,
      })
    }
  }
  row(38, 154, JUNGLE_LAYOUT.horizon.secondary.z, JUNGLE_LAYOUT.horizon.secondary.height, 2)
  row(34, 136, JUNGLE_LAYOUT.horizon.primary.z, [14, profile.ridgeHeight], 1)
  for (const side of [-1, 1]) {
    for (let index = 0; index < 10; index++) {
      const t = index / 9
      output.push({
        x: side * (108 + t * 76),
        z: -111 + t * 38 + (rng() - 0.5) * 5,
        h: 17 - t * 6 + rng() * 2,
        s: 0.9 - t * 0.25,
        row: index % 3 === 0 ? 2 : 1,
      })
    }
  }
  if (profile.emergents > 0) {
    output.push({ x: -88, z: -124, h: 26, s: 1.35, row: 1 })
    output.push({ x: 91, z: -120, h: 26, s: 1.3, row: 1 })
  }
  return output
}

export function landmarkStage(fraction: number): LandmarkStage {
  if (fraction <= 0) return 'stake'
  if (fraction < 0.5) return 's1'
  if (fraction < 1) return 's2'
  return 's3'
}

export function creatureViewportFraction(
  creatureHeight: number,
  chord: number,
  fitWidth: number,
  aspect: number,
  pitchDeg: number,
): number {
  const visibleHeight = chord / fitWidth / aspect
  return (creatureHeight * Math.cos((pitchDeg * Math.PI) / 180)) / visibleHeight
}

export interface BirdEvent {
  startAt: number
  duration: number
  altitude: number
  sweep: number
}

export function birdSchedule(seed: number, count = 32): BirdEvent[] {
  const rng = seeded(seed * 43 + 19)
  const out: BirdEvent[] = []
  let t = 8 + rng() * 12
  for (let i = 0; i < count; i++) {
    const duration = 4 + rng() * 3
    out.push({ startAt: t, duration, altitude: 16 + rng() * 12, sweep: 0.55 + rng() * 0.45 })
    t += duration + 18 + rng() * 24
  }
  return out
}

export function buildJungleExport(seed: number, progress: Progress, camera: unknown) {
  const fraction = courseProgress(progress)
  return {
    version: 1 as const,
    biome: JUNGLE_LAYOUT.id,
    direction: JUNGLE_LAYOUT.direction,
    seed,
    fixed: {
      field: JUNGLE_LAYOUT.field,
      hydrology: JUNGLE_LAYOUT.hydrology,
      bridges: JUNGLE_LAYOUT.bridges,
      clearings: JUNGLE_LAYOUT.clearings,
      headland: JUNGLE_LAYOUT.headland,
      horizon: JUNGLE_LAYOUT.horizon,
    },
    districts: seededDistricts(seed).map((district) => ({
      id: district.id,
      center: district.center,
      yaw: district.yaw,
      progress: progress[district.id] ?? 0,
      population: populationFor(district, progress[district.id] ?? 0),
    })),
    courseProgress: fraction,
    skyline: skylineProfile(fraction),
    landmark: landmarkStage(fraction),
    camera,
  }
}
