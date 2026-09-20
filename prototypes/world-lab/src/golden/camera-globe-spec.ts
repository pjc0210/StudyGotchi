export type CameraBiome = 'ice' | 'city' | 'meadow' | 'forest' | 'volcanic' | 'sand' | 'coast'
export type PathMode = 'surface' | 'arcs' | 'hybrid'
export type SurfaceBand = 'deep-ocean' | 'shallow' | 'lowland' | 'highland' | 'snow'
export type UnitDirection = [number, number, number]
export const DEFAULT_GLOBE_LAYOUT_SEED = 'studygotchi:demo:philote'
export const TRACKPAD_SETTLE_MS = 520
export const SNAP_DAMPING = 4.4
export const PIXEL_ATLAS_WIDTH = 256
export const PIXEL_ATLAS_HEIGHT = 256
export const WATER_FLOW_SPEED = 0.11
export const WATER_FRAME_COUNT = 32
export const WATER_FRAME_MS = 180
export const MIN_PIXEL_GRAIN = 1
export const MAX_PIXEL_GRAIN = 6
export const DEFAULT_PIXEL_GRAIN = 2
export const CONTINENT_LOBES_PER_GROUP = 4
export const GLOBE_CAMERA_PADDING = 0.9
export const GLOBE_FOCUS_DIRECTION: UnitDirection = [-0.22, 0.54, 0.81]
export const LANDMARK_OFFSETS: Array<[number, number]> = [
  [-0.14, 0.02],
  [0.1, -0.1],
  [0.11, 0.1],
]
export const PAWN_OFFSETS: Array<[number, number]> = [
  [-0.22, 0.16],
  [0.22, 0.15],
  [0.23, -0.15],
  [-0.21, -0.14],
  [0, 0.22],
]
const COURSE_CLUSTER_STRENGTH = 0.56
const TRACKPAD_SPIN_SCALE = 0.0024

export function normalizePixelGrain(value: number) {
  return Math.min(MAX_PIXEL_GRAIN, Math.max(MIN_PIXEL_GRAIN, Math.round(value)))
}

export function waterFrameState(elapsedMs: number) {
  const position = Math.max(0, elapsedMs) / WATER_FRAME_MS
  const current = Math.floor(position) % WATER_FRAME_COUNT
  const next = (current + 1) % WATER_FRAME_COUNT
  const rawMix = position - Math.floor(position)
  const mix = rawMix * rawMix * (3 - 2 * rawMix)
  return { current, next, mix }
}

export interface CameraCourse {
  code: string
  name: string
  biome: CameraBiome
  progress: number
  ground: string
  accent: string
  summary: string
}

export const CAMERA_COURSES: CameraCourse[] = [
  {
    code: '6.1210',
    name: 'Introduction to Algorithms',
    biome: 'ice',
    progress: 0.68,
    ground: '#dff4f7',
    accent: '#9dd9e7',
    summary: 'Five topic ridges · two landmark districts · four residents',
  },
  {
    code: '18.06',
    name: 'Linear Algebra',
    biome: 'city',
    progress: 0.52,
    ground: '#d9c3d6',
    accent: '#b98bb0',
    summary: 'Three tower blocks · one transit loop · three residents',
  },
  {
    code: '18.03',
    name: 'Differential Equations',
    biome: 'meadow',
    progress: 0.37,
    ground: '#bfe0a0',
    accent: '#8fbf6a',
    summary: 'Two wind terraces · one pond · two residents',
  },
  {
    code: '6.1400',
    name: 'Computability & Complexity',
    biome: 'forest',
    progress: 0.79,
    ground: '#8fc48a',
    accent: '#4f8a4a',
    summary: 'Six canopy layers · three monuments · five residents',
  },
  {
    code: '8.022',
    name: 'Electricity & Magnetism',
    biome: 'volcanic',
    progress: 0.24,
    ground: '#c9a08f',
    accent: '#e0653a',
    summary: 'One active vent · one field station · one resident',
  },
  {
    code: '8.223',
    name: 'Classical Mechanics II',
    biome: 'sand',
    progress: 0.61,
    ground: '#efd9a2',
    accent: '#d2a95e',
    summary: 'Four dune shelves · two observatories · three residents',
  },
  {
    code: '16.C20',
    name: 'Computational Thinking',
    biome: 'coast',
    progress: 0.45,
    ground: '#9fd3e0',
    accent: '#3f8fa8',
    summary: 'Three tidal terraces · one dock · two residents',
  },
]

function modulo(value: number, count: number) {
  return ((value % count) + count) % count
}

export function courseIndexForStep(step: number, count: number) {
  return modulo(step, count)
}

export function stepForIndex(currentStep: number, targetIndex: number, count: number) {
  const currentIndex = courseIndexForStep(currentStep, count)
  const forward = modulo(targetIndex - currentIndex, count)
  const backward = forward - count
  const delta = Math.abs(backward) <= Math.abs(forward) ? backward : forward
  return currentStep + delta
}

export function rotationForStep(step: number, count: number) {
  if (step === 0) return 0
  return (-step * Math.PI * 2) / count
}

export function courseIndexForRotation(rotation: number, count: number) {
  const step = Math.round((-rotation * count) / (Math.PI * 2))
  return courseIndexForStep(step, count)
}

export function courseIndexForPosition(position: number, count: number) {
  return courseIndexForStep(Math.round(position), count)
}

export function settleCoursePosition(position: number) {
  return Math.round(position)
}

export function clampCoursePosition(position: number, count: number) {
  return Math.min(count - 1, Math.max(0, position))
}

export function fibonacciCourseDirection(index: number, count: number): [number, number, number] {
  const y = -1 + (2 * (index + 0.5)) / count
  const radial = Math.sqrt(Math.max(0, 1 - y * y))
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const angle = index * goldenAngle
  return [Math.cos(angle) * radial, y, Math.sin(angle) * radial]
}

function seedHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededUnit(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function rotateDirection(
  direction: [number, number, number],
  pitch: number,
  yaw: number,
  roll: number,
): [number, number, number] {
  const [x, y, z] = direction
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cr = Math.cos(roll)
  const sr = Math.sin(roll)
  const x1 = x
  const y1 = y * cp - z * sp
  const z1 = y * sp + z * cp
  const x2 = x1 * cy + z1 * sy
  const y2 = y1
  const z2 = -x1 * sy + z1 * cy
  return [x2 * cr - y2 * sr, x2 * sr + y2 * cr, z2]
}

function normalizeDirection(direction: [number, number, number]): [number, number, number] {
  const length = Math.hypot(...direction) || 1
  return [direction[0] / length, direction[1] / length, direction[2] / length]
}

export function seededCourseDirections(
  count: number,
  seed: string,
  clusterStrength = COURSE_CLUSTER_STRENGTH,
): Array<[number, number, number]> {
  const random = seededUnit(seedHash(seed))
  const pitch = (random() - 0.5) * Math.PI
  const yaw = random() * Math.PI * 2
  const roll = (random() - 0.5) * Math.PI
  const rotated = Array.from({ length: count }, (_, index) =>
    rotateDirection(fibonacciCourseDirection(index, count), pitch, yaw, roll),
  )
  if (clusterStrength <= 0) return rotated
  const clustered = rotated.map((direction) => [...direction] as [number, number, number])
  for (let index = 0; index + 1 < clustered.length; index += 2) {
    const a = clustered[index]
    const b = clustered[index + 1]
    const midpoint = normalizeDirection([a[0] + b[0], a[1] + b[1], a[2] + b[2]])
    clustered[index] = normalizeDirection([
      a[0] * (1 - clusterStrength) + midpoint[0] * clusterStrength,
      a[1] * (1 - clusterStrength) + midpoint[1] * clusterStrength,
      a[2] * (1 - clusterStrength) + midpoint[2] * clusterStrength,
    ])
    clustered[index + 1] = normalizeDirection([
      b[0] * (1 - clusterStrength) + midpoint[0] * clusterStrength,
      b[1] * (1 - clusterStrength) + midpoint[1] * clusterStrength,
      b[2] * (1 - clusterStrength) + midpoint[2] * clusterStrength,
    ])
  }
  return clustered
}

const continentLobeCache = new WeakMap<Array<UnitDirection>, Array<ContinentLobe>>()

function directionDot(a: UnitDirection, b: UnitDirection) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function continentPerturb(direction: UnitDirection, index: number) {
  const [x, y, z] = direction
  return (
    Math.sin(x * 9.7 + y * 6.9 - z * 8.3 + index * 1.91) * 0.01 +
    Math.sin(x * 19.1 - y * 13.7 + z * 4.3 + index * 0.73) * 0.004 +
    Math.sin((x + z) * 31.3 + y * 14.1 - index * 1.17) * 0.0015
  )
}

function crossDirection(a: UnitDirection, b: UnitDirection): UnitDirection {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

export interface ContinentLobe {
  group: number
  direction: UnitDirection
  threshold: number
}

export function continentLobes(courseDirections: Array<UnitDirection>) {
  const cached = continentLobeCache.get(courseDirections)
  if (cached) return cached
  const lobes: ContinentLobe[] = []
  for (let index = 0; index < courseDirections.length; index += 2) {
    const a = courseDirections[index]
    const b = courseDirections[index + 1]
    const center =
      b
        ? normalizeDirection([a[0] + b[0], a[1] + b[1], a[2] + b[2]])
        : a
    const reference: UnitDirection =
      Math.abs(center[1]) < 0.82 ? [0, 1, 0] : [1, 0, 0]
    const east = normalizeDirection(crossDirection(reference, center))
    const north = normalizeDirection(crossDirection(center, east))
    const group = Math.floor(index / 2)
    const offset = (eastOffset: number, northOffset: number) =>
      normalizeDirection([
        center[0] + east[0] * eastOffset + north[0] * northOffset,
        center[1] + east[1] * eastOffset + north[1] * northOffset,
        center[2] + east[2] * eastOffset + north[2] * northOffset,
      ])
    lobes.push(
      { group, direction: a, threshold: 0.905 },
      { group, direction: b ?? offset(0.24, 0.04), threshold: 0.92 },
      { group, direction: offset(0.27, 0.23), threshold: 0.94 },
      { group, direction: offset(-0.24, -0.31), threshold: 0.955 },
    )
  }
  continentLobeCache.set(courseDirections, lobes)
  return lobes
}

function pixelHash(x: number, y: number, salt: number) {
  let value = Math.imul(x + salt * 1013, 374761393) ^ Math.imul(y - salt * 733, 668265263)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

export function pixelGrassTone(x: number, y: number) {
  const cellX = Math.floor(x / 4)
  const cellY = Math.floor(y / 4)
  const localX = ((x % 4) + 4) % 4
  const localY = ((y % 4) + 4) % 4
  const cluster = pixelHash(cellX, cellY, 0)

  if (cluster < 0.24) {
    if ((localX === 1 && localY >= 1) || (localX === 2 && localY === 2)) return 2
    if ((localX + localY) % 3 === 0) return 1
  } else if (cluster > 0.8) {
    if ((localX + localY) % 3 === 0) return -2
    if (localX === 2 && localY >= 1) return -1
  }

  const speckle = pixelHash(x, y, 1)
  if (speckle < 0.04) return 1
  if (speckle > 0.97) return -1
  return 0
}

export interface ArchipelagoSurface {
  owner: number
  ownerDot: number
  score: number
  land: boolean
  coast: boolean
  biomeWeight: number
  elevation: number
}

export function archipelagoSurface(
  direction: UnitDirection,
  courseDirections = seededCourseDirections(CAMERA_COURSES.length, DEFAULT_GLOBE_LAYOUT_SEED),
): ArchipelagoSurface {
  const lobes = continentLobes(courseDirections)
  let score = -Infinity
  for (const lobe of lobes) {
    const candidate =
      directionDot(direction, lobe.direction) -
      lobe.threshold +
      continentPerturb(direction, lobe.group)
    if (candidate > score) {
      score = candidate
    }
  }

  let owner = 0
  let ownerDot = -Infinity
  for (let index = 0; index < courseDirections.length; index++) {
    const candidate = directionDot(direction, courseDirections[index])
    if (candidate > ownerDot) {
      owner = index
      ownerDot = candidate
    }
  }
  const districtNoise =
    Math.sin(direction[0] * 21.7 + direction[1] * 13.3 - direction[2] * 17.9 + owner) *
      0.0035 +
    Math.sin(direction[0] * 37.1 - direction[1] * 9.7 + direction[2] * 23.9) * 0.0015
  const biomeWeight = smoothUnit(ownerDot + districtNoise, 0.972, 0.996)
  const land = score >= 0
  const coast = land && score < 0.012
  if (!land) {
    return { owner, ownerDot, score, land, coast, biomeWeight: 0, elevation: 0 }
  }

  const [x, y, z] = direction
  const reliefNoise =
    Math.sin(x * 23.1 + y * 9.7 - z * 17.3 + owner) * 0.006 +
    Math.sin(x * 47.7 - y * 31.1 + z * 13.9 - owner * 0.7) * 0.003
  const brokenRidge =
    Math.max(0, Math.sin(x * 31.7 + y * 37.3 - z * 19.9 + owner * 2.3)) * 0.015
  const elevation = 0.22 + Math.max(-0.014, reliefNoise) + brokenRidge
  return { owner, ownerDot, score, land, coast, biomeWeight, elevation }
}

export function estimatedOceanShare(sampleCount = 2048) {
  const courseDirections = seededCourseDirections(
    CAMERA_COURSES.length,
    DEFAULT_GLOBE_LAYOUT_SEED,
  )
  let oceanSamples = 0
  for (let index = 0; index < sampleCount; index++) {
    const direction = fibonacciCourseDirection(index, sampleCount)
    if (!archipelagoSurface(direction, courseDirections).land) oceanSamples++
  }
  return oceanSamples / sampleCount
}

export function nearestCourseNeighbors(
  sourceIndex: number,
  directions: Array<[number, number, number]>,
  count = 3,
) {
  const source = directions[sourceIndex]
  return directions
    .map((direction, index) => ({
      index,
      dot:
        source[0] * direction[0] +
        source[1] * direction[1] +
        source[2] * direction[2],
    }))
    .filter(({ index }) => index !== sourceIndex)
    .sort((a, b) => b.dot - a.dot)
    .slice(0, count)
    .map(({ index }) => index)
}

export function spiralCourseDirection(index: number, count: number): [number, number, number] {
  const t = count <= 1 ? 0.5 : index / (count - 1)
  const y = -0.72 + t * 1.44
  const radial = Math.sqrt(Math.max(0, 1 - y * y))
  const angle = index * 0.9
  return [Math.sin(angle) * radial, y, Math.cos(angle) * radial]
}

export function cameraDistanceForSphere(
  radius: number,
  verticalFovDegrees: number,
  aspect: number,
  padding = 1.15,
) {
  const verticalFov = (verticalFovDegrees * Math.PI) / 180
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect)
  const limitingFov = Math.min(verticalFov, horizontalFov)
  return (radius * padding) / Math.tan(limitingFov / 2)
}

export function routeEdges(count: number): Array<[number, number]> {
  return Array.from({ length: Math.max(0, count - 1) }, (_, index) => [index, index + 1])
}

export function activeRouteForPosition(position: number, count: number) {
  const clamped = clampCoursePosition(position, count)
  if (clamped >= count - 1) {
    return { from: Math.max(0, count - 2), to: Math.max(0, count - 1), t: 1 }
  }
  const lower = Math.floor(clamped)
  return {
    from: lower,
    to: lower + 1,
    t: clamped - lower,
  }
}

export function routeLift(mode: PathMode, active: boolean, t: number) {
  const surface = 0.06
  const arch = Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
  if (mode === 'surface') return surface
  if (mode === 'arcs') return surface + 1.25 * arch
  return active ? surface + 1.45 * arch : surface
}

export function surfaceBandForScore(score: number): SurfaceBand {
  if (score < -0.08) return 'deep-ocean'
  if (score < 0.05) return 'shallow'
  if (score < 0.22) return 'lowland'
  if (score < 0.4) return 'highland'
  return 'snow'
}

export function terrainReliefForBand(band: SurfaceBand) {
  if (band === 'deep-ocean') return 0
  if (band === 'shallow') return 0.012
  if (band === 'lowland') return 0.14
  if (band === 'highland') return 0.32
  return 0.5
}

function smoothUnit(value: number, low: number, high: number) {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

export function oceanMaskForScores(surfaceScore: number, ownerDot: number) {
  const water = 1 - smoothUnit(surfaceScore, -0.08, 0.02)
  const courseLand = smoothUnit(ownerDot, 0.84, 0.9)
  return water * (1 - courseLand)
}

export function courseGroundBlend(dot: number) {
  const t = Math.min(1, Math.max(0, (dot - 0.84) / 0.14))
  const smooth = t * t * (3 - 2 * t)
  return smooth * 0.9
}

export function trackpadSpin(deltaX: number, deltaY: number): [number, number] {
  return [-deltaX * TRACKPAD_SPIN_SCALE, -deltaY * TRACKPAD_SPIN_SCALE]
}

export function markerState(progress: number) {
  const value = Math.min(1, Math.max(0, progress))
  if (value < 1 / 3) {
    return {
      band: 'seed' as const,
      footprintScale: 0.72,
      tiers: 1,
      landmarkCount: 1,
      pawnCount: 1,
      activity: value,
    }
  }
  if (value < 2 / 3) {
    return {
      band: 'growing' as const,
      footprintScale: 0.9,
      tiers: 2,
      landmarkCount: 2,
      pawnCount: 3,
      activity: value,
    }
  }
  return {
    band: 'thriving' as const,
    footprintScale: 1.08,
    tiers: 3,
    landmarkCount: 3,
    pawnCount: 5,
    activity: value,
  }
}
