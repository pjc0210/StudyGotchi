/**
 * Frontier Town front-facing diorama / Direction A — Ochre Railhead.
 * Coordinates are metres: +x east, +z south, +y up.
 */
export type DistrictId =
  | 'main-town'
  | 'railway-station'
  | 'outskirts-reserve'
  | 'broad-ranch'
  | 'mine-works'
  | 'archaeology-dig'

export interface DistrictDef {
  id: DistrictId
  name: string
  band: number
  anchor: string
  center: [number, number]
  envelope: [number, number]
  footprint: [number, number]
  jitter: [number, number]
  yawRange: number
  stationAzimuth: number
  stationChord: number
  population: [number, number, number, number, number]
}

export interface DistrictTransform extends DistrictDef {
  yaw: number
  buildingYaw: number
  scale: number
}

export type DistrictProgress = Record<string, number>
export type LandmarkStage = 'stake' | 's1' | 's2' | 's3'

export const FRONTIER_PALETTE = {
  sky: '#e6c58f',
  skyNight: '#17172c',
  sand: '#d9b07a',
  sandAlt: '#c2925a',
  paleGravel: '#e9dcbc',
  redRock: '#a0522d',
  farRock: '#6f3d2d',
  strata: '#c98b59',
  timber: '#6b4a3a',
  timberDark: '#3d302b',
  teal: '#5f8f8a',
  sage: '#8fa07a',
  oxblood: '#7a3a30',
  mustard: '#d9a441',
  copper: '#b8703f',
  cactus: '#4f7f48',
  water: '#76abc2',
  canvas: '#efe0bd',
  lamp: '#ffe9a8',
  ink: '#302723',
} as const

export const FRONTIER_LAYOUT = {
  id: 'frontier-town',
  name: 'Frontier Town',
  world: [400, 320] as [number, number],
  playable: [320, 260] as [number, number],
  cameraRadius: 105,
  creatureHeight: 1.7,
  creatureScale: 2.4,
  districts: [
    {
      id: 'main-town',
      name: 'Main Town',
      band: 1,
      anchor: 'water tower · sheriff · saloon · boardwalk',
      center: [-40, 4],
      envelope: [113, 72],
      footprint: [58, 24],
      jitter: [8, 6],
      yawRange: 12,
      stationAzimuth: 96,
      stationChord: 46,
      population: [0, 3, 6, 10, 12],
    },
    {
      id: 'railway-station',
      name: 'Grand Railway',
      band: 2,
      anchor: 'depot · 38 m platform · steam train event',
      center: [18, -65],
      envelope: [66, 66],
      footprint: [26, 42],
      jitter: [4, 5],
      yawRange: 5,
      stationAzimuth: 340,
      stationChord: 36,
      population: [0, 1, 2, 3, 5],
    },
    {
      id: 'outskirts-reserve',
      name: 'Desert Reserve',
      band: 3,
      anchor: 'rail-defined wilderness · cactus · burrows',
      center: [114, 1],
      envelope: [88, 253],
      footprint: [58, 214],
      jitter: [7, 10],
      yawRange: 18,
      stationAzimuth: 90,
      stationChord: 48,
      population: [0, 1, 2, 3, 4],
    },
    {
      id: 'broad-ranch',
      name: 'Broad Ranch',
      band: 4,
      anchor: 'three corrals · waterhole · cattle runs',
      center: [-108, 94],
      envelope: [87, 69],
      footprint: [54, 42],
      jitter: [8, 6],
      yawRange: 15,
      stationAzimuth: 130,
      stationChord: 48,
      population: [0, 1, 2, 3, 4],
    },
    {
      id: 'mine-works',
      name: 'Mine Works',
      band: 5,
      anchor: 'adit · headframe · boiler · ore spur',
      center: [-109, -91],
      envelope: [86, 67],
      footprint: [50, 38],
      jitter: [6, 5],
      yawRange: 12,
      stationAzimuth: 50,
      stationChord: 44,
      population: [0, 2, 4, 6, 8],
    },
    {
      id: 'archaeology-dig',
      name: 'Frontier Dig',
      band: 6,
      anchor: 'trenches · foundations · canvas camp',
      center: [0, 98],
      envelope: [72, 58],
      footprint: [44, 30],
      jitter: [6, 5],
      yawRange: 14,
      stationAzimuth: 180,
      stationChord: 42,
      population: [0, 2, 4, 6, 8],
    },
  ] satisfies DistrictDef[],
} as const

const FIXED = {
  canyon: {
    backOnly: true,
    frontGeometry: false,
    backZ: -142,
    sideWingEndZ: 38,
    nearBaseHeight: 60,
    farBaseHeight: 80,
  },
  railCorridor: { minX: 52, maxX: 66 },
  arroyo: [
    [-158, -46],
    [-136, -36],
    [-121, -17],
    [-111, 7],
    [-104, 35],
    [-99, 61],
    [-95, 84],
    [-89, 108],
    [-83, 132],
  ] as Array<[number, number]>,
  waterhole: { center: [-95, 84] as [number, number], size: [22, 16] as [number, number] },
  landmarkRise: { center: [118, 65] as [number, number], size: [20, 16] as [number, number] },
} as const

const PROTECTED = {
  railOperations: { center: [38, -57] as [number, number], size: [24, 22] as [number, number] },
  centralPreserve: { center: [-39, 57] as [number, number], size: [50, 22] as [number, number] },
  animalRuns: [
    { center: [-123, 94] as [number, number], size: [26, 19] as [number, number] },
    { center: [-87, 88] as [number, number], size: [24, 18] as [number, number] },
  ],
  futureEnvelopes: [
    { id: 'future-a', center: [-27, -108] as [number, number], size: [58, 41] as [number, number], blank: true },
    { id: 'future-b', center: [-131, -10] as [number, number], size: [44, 70] as [number, number], blank: true },
  ],
} as const

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

export function generateLayout(seed: number) {
  const rng = seeded(seed * 4177 + 31)
  const districts: DistrictTransform[] = FRONTIER_LAYOUT.districts.map((district) => {
    const jx = (rng() * 2 - 1) * district.jitter[0]
    const jz = (rng() * 2 - 1) * district.jitter[1]
    return {
      ...district,
      center: [district.center[0] + jx, district.center[1] + jz],
      yaw: ((rng() * 2 - 1) * district.yawRange * Math.PI) / 180,
      buildingYaw: ((rng() * 12 - 6) * Math.PI) / 180,
      scale: 0.82 + rng() * 0.36,
    }
  })
  return { seed, districts, fixed: FIXED, protected: PROTECTED }
}

export function districtGap(a: DistrictTransform, b: DistrictTransform): number {
  const ra = Math.hypot(a.footprint[0], a.footprint[1]) * 0.5
  const rb = Math.hypot(b.footprint[0], b.footprint[1]) * 0.5
  return Math.max(0, Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) - ra - rb)
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
    fences: band >= 2,
    clutter: band >= 3,
    extras: band >= 4,
  }
}

export function maxBuildings(district: DistrictDef): number {
  return district.population[4]
}

export function districtOrder(): DistrictDef[] {
  return [...FRONTIER_LAYOUT.districts].sort((a, b) => a.band - b.band)
}

export function courseProgress(progress: DistrictProgress): number {
  return FRONTIER_LAYOUT.districts.reduce((sum, d) => sum + (progress[d.id] ?? 0), 0) / FRONTIER_LAYOUT.districts.length
}

export function landmarkStage(fraction: number): LandmarkStage {
  if (fraction <= 0) return 'stake'
  if (fraction < 0.5) return 's1'
  if (fraction < 1) return 's2'
  return 's3'
}

export function skylineProfile(progress: number) {
  const band = bandForProgress(progress)
  return {
    near: [60, 63, 66, 70, 74][band],
    far: [80, 85, 90, 95, 100][band],
    spire: band === 4 ? 118 : 0,
  }
}

/** Plan-v4 front camera: fixed south station, yaw changes its north-facing target. */
export function dioramaCameraPose(yawDeg: number, dolly: number, pitchDeg = 37) {
  const yaw = Math.max(-35, Math.min(35, yawDeg))
  const elevationDeg = Math.max(34, Math.min(40, pitchDeg))
  const a = (yaw * Math.PI) / 180
  const dollyFraction = Math.max(0, Math.min(1, (dolly - 1) / 0.35))
  const cameraZ = 135 + dollyFraction * 20
  const span = 220 + dollyFraction * 20
  const cameraGround: [number, number] = [0, cameraZ]
  const target: [number, number, number] = [
    Math.sin(a) * span,
    4,
    cameraZ - Math.cos(a) * span,
  ]
  return {
    cameraGround,
    target,
    elevationDeg,
    yawDeg: yaw,
    position: [
      cameraGround[0],
      target[1] + Math.tan((elevationDeg * Math.PI) / 180) * span,
      cameraGround[1],
    ] as [number, number, number],
  }
}

export function skylineCoverage(yawDeg: number, dolly: number) {
  const safe = Math.abs(yawDeg) <= 35 && dolly >= 1 && dolly <= 1.35
  return {
    backSkylineVisible: safe,
    sideWingVisible: safe,
    worldEdgeVisible: !safe,
  }
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

export function buildLayoutExport(seed: number, progress: DistrictProgress, camera: unknown) {
  const generated = generateLayout(seed)
  const fraction = courseProgress(progress)
  return {
    version: 4,
    biome: FRONTIER_LAYOUT.id,
    world: FRONTIER_LAYOUT.world,
    playable: FRONTIER_LAYOUT.playable,
    seed,
    fixed: generated.fixed,
    protected: generated.protected,
    districts: generated.districts.map((district) => ({
      ...district,
      progress: progress[district.id] ?? 0,
      population: populationFor(district, progress[district.id] ?? 0),
    })),
    landmark: landmarkStage(fraction),
    courseProgress: fraction,
    camera,
  }
}
