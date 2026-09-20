import * as THREE from 'three'
import { hashString, makeRng } from './seed'
import {
  BIOMES,
  type Biome,
  type BiomeId,
  type Cluster,
  type Concept,
} from './world'

/**
 * One big planet, every course a biome, every topic a sub-region.
 * Pure data + sampling; no React, no geometry (see scenes/Planet2 and components/Decor).
 */

// ---------------------------------------------------------------------------
// planet size and biome radius, both derived from the number of courses (never hardcoded)

/** markers sit on a belt: azimuth i·2π/N, latitude alternating ±BELT_LAT (world bible §3.3) */
export const BELT_LAT = THREE.MathUtils.degToRad(16)
/** largest angular radius a biome may have (about 24°: chord ≈ 1/3 of the diameter) */
export const BIOME_R_MAX = 0.42
/** linear biome radius we try to keep, in world units (level-2 content stays the same size for any N) */
export const BIOME_LINEAR_R = 48
export const PLANET_R_MIN = 90

/** angle between two neighbouring belt markers for N courses */
export function beltNeighbourAngle(n: number) {
  const s = Math.sin(BELT_LAT)
  const c = Math.cos(BELT_LAT)
  return Math.acos(THREE.MathUtils.clamp(-s * s + c * c * Math.cos((2 * Math.PI) / Math.max(2, n)), -1, 1))
}
/** biome angular radius for N courses: capped so neighbours never touch (2ρ ≤ 0.84 × neighbour angle) */
export function biomeRadiusFor(n: number) {
  return Math.min(BIOME_R_MAX, 0.42 * beltNeighbourAngle(n))
}
/** planet radius for N courses: grows once the biomes would get smaller than BIOME_LINEAR_R */
export function planetRadiusFor(n: number) {
  return Math.max(PLANET_R_MIN, Math.round(BIOME_LINEAR_R / biomeRadiusFor(n)))
}

export const PLANET_SKY = '#f3e4ee'
/** roughly 2.2 world units per asset metre at the current planet size */
export const METRES_TO_UNITS = 2.2
// ---------------------------------------------------------------------------
// terrain kinds

/** How a sub-region's ground behaves relative to the sphere (heights in world units). */
export type Profile = 'peaks' | 'raised' | 'hills' | 'flat' | 'water' | 'slope' | 'crater' | 'volcano'

export type Recipe =
  | 'mountain' | 'crystal' | 'floe' | 'house' | 'tower' | 'dock' | 'lighthouse' | 'rock' | 'pine'
  | 'roundTree' | 'palm' | 'cactus' | 'pillar' | 'chimney' | 'shrub' | 'flower' | 'iceberg'
  | 'hexColumn' | 'coral' | 'lamp' | 'boat' | 'crop' | 'geyser'
  /** road furniture and shoreline pieces (layout grammar §b.7, §f) */
  | 'fence' | 'shard'

export interface TerrainKind {
  id: string
  profile: Profile
  /** ground tint (variation of the family palette) */
  tint: string
  /** secondary colour: water body, lava, rock */
  alt: string
  /** decoration recipes and counts for a reference cell (radius 0.24 rad) */
  decor: [Recipe, number][]
  /** 'water' goes to the outermost topic of the patch, 'shore' next to it */
  role?: 'water' | 'shore'
}

const K = (id: string, profile: Profile, tint: string, alt: string, decor: [Recipe, number][], role?: 'water' | 'shore'): TerrainKind => ({
  id, profile, tint, alt, decor, role,
})

export const TERRAIN_KINDS: Record<BiomeId, TerrainKind[]> = {
  ice: [
    K('mountain', 'peaks', '#dfe9f3', '#a7b7c6', [['mountain', 5], ['rock', 4]]),
    K('glacier', 'raised', '#d3e8f8', '#eef8ff', [['crystal', 12]]),
    K('frozen lake', 'water', '#dbe9f2', '#9ccbee', [['floe', 5]]),
    K('snow city', 'flat', '#eef3f7', '#c9d6e2', [['house', 9], ['lamp', 4]]),
    K('coast', 'slope', '#e2ebe9', '#a9d1e6', [['lighthouse', 1], ['dock', 1], ['rock', 5], ['boat', 1]], 'shore'),
    K('ocean', 'water', '#d3e6ef', '#7fb6dd', [['iceberg', 5], ['boat', 1]], 'water'),
    K('pine forest', 'hills', '#d8e7dc', '#c2d6c8', [['pine', 24]]),
    K('tundra', 'flat', '#e5ecdf', '#cfd8c8', [['rock', 8], ['shrub', 8]]),
  ],
  forest: [
    K('grove', 'hills', '#8fc48a', '#6fa86a', [['roundTree', 16]]),
    K('pine forest', 'hills', '#7db27e', '#5f9660', [['pine', 22]]),
    K('clearing', 'flat', '#a9d69a', '#8fc48a', [['flower', 14], ['shrub', 4]]),
    K('hills', 'hills', '#98c98d', '#8b7a70', [['roundTree', 5], ['rock', 4]]),
    K('lake', 'water', '#9ccf92', '#5fa8c9', [['boat', 1]], 'water'),
    K('swamp', 'water', '#7fa877', '#587f5f', [['shrub', 8]]),
    K('orchard', 'flat', '#a5cf8f', '#8fc48a', [['roundTree', 14]]),
    K('cliffs', 'peaks', '#88b083', '#8b7a70', [['mountain', 4], ['pine', 6]]),
    K('shore', 'slope', '#a8cf96', '#5fa8c9', [['dock', 1], ['rock', 4]], 'shore'),
  ],
  city: [
    K('downtown', 'flat', '#dcc3d9', '#b98bb0', [['tower', 9], ['lamp', 3]]),
    K('suburb', 'flat', '#e4d0e2', '#b98bb0', [['house', 10], ['roundTree', 3]]),
    K('park', 'flat', '#c3d8b8', '#8fc48a', [['roundTree', 10], ['flower', 6], ['lamp', 2]]),
    K('harbour', 'slope', '#d3c4d1', '#6fa9cf', [['dock', 2], ['boat', 2], ['lighthouse', 1]], 'shore'),
    K('plaza', 'flat', '#ead8e6', '#b98bb0', [['pillar', 6], ['lamp', 4]]),
    K('industrial', 'flat', '#cdb6c9', '#8f7f8c', [['chimney', 5], ['tower', 3]]),
    K('hills', 'hills', '#d5c2d6', '#8b7a70', [['house', 4], ['roundTree', 4]]),
    K('bay', 'water', '#dac9d8', '#6fa9cf', [['boat', 2]], 'water'),
  ],
  sand: [
    K('dunes', 'raised', '#efd9a2', '#d2a95e', [['shrub', 3]]),
    K('oasis', 'water', '#e9d4a0', '#4fb0b8', [['palm', 6]], 'water'),
    K('mesa', 'raised', '#e2b98a', '#c98a5a', [['rock', 5]]),
    K('canyon', 'crater', '#dfb387', '#b87a50', [['rock', 6]]),
    K('salt flat', 'flat', '#f6ecd6', '#e6dcc4', [['rock', 3]]),
    K('cactus field', 'flat', '#ead9a8', '#d2a95e', [['cactus', 12], ['rock', 3]]),
    K('ruins', 'flat', '#e8d3a4', '#d2a95e', [['pillar', 7]]),
    K('shore', 'slope', '#efdfb0', '#4fb0b8', [['dock', 1], ['palm', 3], ['boat', 1]], 'shore'),
  ],
  meadow: [
    K('flower field', 'flat', '#c9e6a6', '#8fbf6a', [['flower', 22]]),
    K('hills', 'hills', '#b8dc98', '#8b7a70', [['roundTree', 4], ['shrub', 5]]),
    K('pond', 'water', '#bfe0a0', '#6cb6d3', [['flower', 5]], 'water'),
    K('farm', 'flat', '#cfe0a0', '#8fbf6a', [['crop', 8], ['house', 2]]),
    K('orchard', 'flat', '#b5d896', '#8fbf6a', [['roundTree', 12]]),
    K('village', 'flat', '#c8dfa8', '#8fbf6a', [['house', 7], ['lamp', 2]]),
    K('creek', 'slope', '#bfe0a0', '#6cb6d3', [['dock', 1], ['shrub', 5]], 'shore'),
    K('woods', 'hills', '#a6cf8c', '#6fa86a', [['roundTree', 10], ['pine', 6]]),
  ],
  coast: [
    K('ocean', 'water', '#c9e6e4', '#5aa9c9', [['boat', 2]], 'water'),
    K('beach', 'slope', '#efe3c0', '#5aa9c9', [['palm', 4], ['rock', 3]], 'shore'),
    K('reef', 'water', '#c4e4dc', '#7fd1d6', [['coral', 12]]),
    K('harbour', 'flat', '#cfe3dd', '#3f8fa8', [['lighthouse', 1], ['dock', 2], ['boat', 2], ['house', 3]]),
    K('cliffs', 'peaks', '#b7d5cf', '#7f8f8c', [['mountain', 3], ['shrub', 4]]),
    K('islands', 'hills', '#bfe1d8', '#9fb3a8', [['palm', 6], ['rock', 4]]),
    K('lagoon', 'water', '#cfe8e0', '#6fc9c9', [['rock', 3]]),
    K('dunes', 'raised', '#e9dcb8', '#d2b98a', [['shrub', 4]]),
  ],
  volcanic: [
    K('volcano', 'volcano', '#6a5c66', '#ff7a3a', [['rock', 5]]),
    K('lava lake', 'water', '#5a4d56', '#ff6a2a', [['hexColumn', 4]], 'water'),
    K('ash plain', 'flat', '#7a6d76', '#5f5560', [['rock', 6]]),
    K('basalt columns', 'hills', '#655a62', '#4a4048', [['hexColumn', 14]]),
    K('obsidian field', 'flat', '#4a4048', '#3a3038', [['rock', 10]]),
    K('hot springs', 'flat', '#857479', '#8fd0d8', [['geyser', 5]]),
    K('crater', 'crater', '#70636b', '#3a3038', [['rock', 4]]),
    K('ridge', 'peaks', '#665a62', '#5a4f57', [['mountain', 4]], 'shore'),
  ],
}

// ---------------------------------------------------------------------------
// courses

interface TopicDef {
  name: string
  concepts?: string[]
}

interface CourseDef {
  code: string
  name: string
  family: BiomeId
  psets: number
  topics: TopicDef[]
}

const CONCEPT_TEMPLATES = ['definition', 'key example', 'core theorem', 'worked pset', 'edge cases', 'application']

const COURSES: CourseDef[] = [
  {
    code: '6.1210',
    name: 'Introduction to Algorithms',
    family: 'ice',
    psets: 10,
    topics: [
      { name: 'Sorting & recurrences', concepts: ['Insertion sort', 'Merge sort', 'Master theorem', 'Heaps', 'Heapsort', 'Counting sort'] },
      { name: 'Hashing', concepts: ['Direct access arrays', 'Hash functions', 'Chaining', 'Universal hashing', 'Open addressing'] },
      { name: 'Trees & balanced search', concepts: ['Binary search trees', 'Tree traversal', 'AVL rotations', 'Sequence AVL', 'Augmentation'] },
      { name: 'Graphs & shortest paths', concepts: ['BFS', 'DFS', 'Topological sort', 'Bellman-Ford', 'Dijkstra', 'Johnson'] },
      { name: 'Dynamic programming', concepts: ['SRTBOT', 'LCS', 'Knapsack', 'Edit distance', 'Piano fingering', 'Floyd-Warshall'] },
      { name: 'Priority queues', concepts: ['Binary heaps', 'Build-heap', 'Decrease-key', 'Heap sort revisited'] },
      { name: 'Sequence data structures', concepts: ['Arrays', 'Linked lists', 'Dynamic arrays', 'Amortisation', 'Sequence interface'] },
      { name: 'Complexity & lower bounds', concepts: ['Asymptotics', 'Decision trees', 'Comparison lower bound', 'Reductions'] },
    ],
  },
  {
    code: '18.06',
    name: 'Linear Algebra',
    family: 'city',
    psets: 9,
    topics: ['Vectors', 'Matrices', 'Elimination', 'Subspaces', 'Projections', 'Determinants', 'Eigenvalues', 'SVD'].map((name) => ({ name })),
  },
  {
    code: '18.03',
    name: 'Differential Equations',
    family: 'meadow',
    psets: 8,
    topics: ['First-order ODEs', 'Second-order ODEs', 'Laplace transforms', 'Linear systems', 'Phase portraits', 'Fourier series', 'Nonlinear systems'].map((name) => ({ name })),
  },
  {
    code: '6.1400',
    name: 'Computability & Complexity',
    family: 'forest',
    psets: 8,
    topics: ['Finite automata', 'Regular languages', 'Context-free grammars', 'Turing machines', 'Decidability', 'Reductions', 'P vs NP', 'NP-completeness', 'Space complexity'].map((name) => ({ name })),
  },
  {
    code: '8.022',
    name: 'Electricity & Magnetism',
    family: 'volcanic',
    psets: 9,
    topics: ['Electrostatics', "Gauss's law", 'Potential', 'Capacitance', 'Circuits', 'Magnetostatics', 'Induction', "Maxwell's equations", 'EM waves'].map((name) => ({ name })),
  },
  {
    code: '8.223',
    name: 'Classical Mechanics II',
    family: 'sand',
    psets: 7,
    topics: ['Lagrangians', 'Variational principles', 'Central forces', 'Rigid bodies', 'Small oscillations', 'Hamiltonians', 'Canonical transforms'].map((name) => ({ name })),
  },
  {
    code: '16.C20',
    name: 'Computational Thinking',
    family: 'coast',
    psets: 6,
    topics: ['Abstraction', 'Decomposition', 'Algorithms & data', 'Simulation', 'Optimisation', 'Data & visualisation'].map((name) => ({ name })),
  },
]

export const COURSE_COUNT = COURSES.length
/** biome angular radius (rad) and planet radius (world units) for the current course count */
export const BIOME_RADIUS = biomeRadiusFor(COURSE_COUNT)
export const PLANET_R = planetRadiusFor(COURSE_COUNT)
/** landmarks and creatures are scaled up so they read on the big planet */
export const PROP_SCALE = METRES_TO_UNITS

// ---------------------------------------------------------------------------
// types

/** one road edge on the sphere: great-circle segment between two unit directions */
export interface RoadEdge {
  a: THREE.Vector3
  b: THREE.Vector3
  /** main roads are wider and carry lamps */
  main: boolean
}

export interface Course {
  index: number
  code: string
  name: string
  family: BiomeId
  biome: Biome
  /** patch centre on the unit sphere */
  dir: THREE.Vector3
  /** tangent frame at the patch centre (east / north), used to unroll the patch into a flat diorama */
  east: THREE.Vector3
  north: THREE.Vector3
  /** angular radius estimate of the patch (rad) */
  radius: number
  /** angular radius of the flat diorama that contains all topics (rad) */
  extent: number
  topics: Topic[]
  psets: number
  /** inter-topic roads (ring through the plazas + spanning tree), all `main` */
  roads: RoadEdge[]
  /** the topic nearest the course centre carries the hub plaza */
  hub: Topic | null
}

/** A topic is a Cluster (so ConceptSpot / Blob / the provenance card work unchanged) plus terrain. */
export interface Topic extends Cluster {
  course: Course
  kind: TerrainKind
  /** angular radius of the sub-region (rad) */
  radius: number
  spots: Concept[]
  decor: DecorItem[]
  /** lightness offset (−0.07 / 0 / +0.07) chosen so adjacent sub-regions differ */
  shade: number
  /** roads from the plaza to every concept spot (spanning tree + a few loop edges) */
  roads: RoadEdge[]
  /** cluster members share a centre; buildings and lamps carry the road they belong to */
  hub: boolean
  /** future game state: the catastrophe kind currently affecting the topic (see assets/biomes/catalog.json) */
  catastrophe?: string
}

export interface DecorItem {
  recipe: Recipe
  dir: THREE.Vector3
  /** flat diorama coords (world units, x east, z south) */
  pos: THREE.Vector2
  yaw: number
  scale: number
  seed: number
  topic: Topic
  /** which layout rule placed it (world bible §1: every object has a parent) */
  parent: 'cluster' | 'road' | 'plaza' | 'shore'
}

/** recipes that live in prop clusters (layout grammar §d); everything else is a building or furniture */
export const CLUSTER_RECIPES = new Set<Recipe>(['pine', 'roundTree', 'rock', 'crystal', 'shrub', 'flower', 'cactus', 'palm', 'hexColumn', 'coral', 'iceberg', 'floe', 'geyser', 'mountain'])
/** tall recipes form the backdrop ring on the outer third of the biome (stage composition) */
export const TALL_RECIPES = new Set<Recipe>(['mountain', 'pine', 'roundTree', 'palm', 'hexColumn', 'crystal', 'iceberg', 'tower', 'chimney'])
const BUILDING_RECIPES = new Set<Recipe>(['house', 'tower', 'chimney', 'pillar', 'crop'])

export interface Planet {
  seed: string
  courses: Course[]
  topics: Topic[]
  spots: Concept[]
  decor: DecorItem[]
  noiseSeed: number
  /** per-course relief multiplier (growth), set by the scene from progress before placements are computed */
  relief: number[]
}

export function isTopic(c: Cluster): c is Topic {
  return 'course' in c
}

// ---------------------------------------------------------------------------
// helpers

export function angleBetween(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
}

/** orthonormal tangent basis at n: east = north x n, north = projection of +Y */
function tangentFrame(n: THREE.Vector3) {
  const north = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y)
  if (north.lengthSq() < 0.05) north.set(1, 0, 0).addScaledVector(n, -n.x)
  north.normalize()
  const east = new THREE.Vector3().crossVectors(north, n).normalize()
  return { east, north }
}

/** uniform sample in the spherical cap of angular radius `maxAng` around n */
function randomInCap(rng: () => number, n: THREE.Vector3, maxAng: number, frame: { east: THREE.Vector3; north: THREE.Vector3 }) {
  const a = rng() * Math.PI * 2
  const ang = Math.sqrt(rng()) * maxAng
  return new THREE.Vector3()
    .copy(n)
    .multiplyScalar(Math.cos(ang))
    .addScaledVector(frame.east, Math.sin(ang) * Math.cos(a))
    .addScaledVector(frame.north, Math.sin(ang) * Math.sin(a))
    .normalize()
}

/** Mitchell's best-candidate: pick the candidate farthest from everything already placed. */
function bestCandidate(
  tries: number,
  sample: () => THREE.Vector3 | null,
  score: (d: THREE.Vector3) => number,
): { dir: THREE.Vector3; score: number } | null {
  let best: THREE.Vector3 | null = null
  let bestScore = -Infinity
  for (let i = 0; i < tries; i++) {
    const d = sample()
    if (!d) continue
    const s = score(d)
    if (s > bestScore) {
      bestScore = s
      best = d
    }
  }
  return best ? { dir: best, score: bestScore } : null
}

export function nearestCourse(courses: Course[], dir: THREE.Vector3): Course {
  let best = courses[0]
  let bestDot = -Infinity
  for (const c of courses) {
    const d = c.dir.dot(dir)
    if (d > bestDot) {
      bestDot = d
      best = c
    }
  }
  return best
}

export function nearestTopic(topics: Topic[], dir: THREE.Vector3): Topic {
  let best = topics[0]
  let bestDot = -Infinity
  for (const t of topics) {
    const d = t.dir.dot(dir)
    if (d > bestDot) {
      bestDot = d
      best = t
    }
  }
  return best
}

/** flat diorama coords of a sphere direction, relative to the course patch centre */
export function projectToPatch(course: Course, dir: THREE.Vector3, out = new THREE.Vector2()) {
  return out.set(PLANET_R * dir.dot(course.east), -PLANET_R * dir.dot(course.north))
}

/** inverse of projectToPatch (orthographic) */
export function unprojectFromPatch(course: Course, x: number, z: number, out = new THREE.Vector3()) {
  const tx = x / PLANET_R
  const tz = -z / PLANET_R
  const l2 = tx * tx + tz * tz
  out.copy(course.dir).multiplyScalar(Math.sqrt(Math.max(0, 1 - l2)))
  out.addScaledVector(course.east, tx).addScaledVector(course.north, tz)
  return out.normalize()
}

// ---------------------------------------------------------------------------
// noise

function hash3(ix: number, iy: number, iz: number, seed: number) {
  let h = Math.imul(ix, 0x8da6b343) ^ Math.imul(iy, 0xd8163841) ^ Math.imul(iz, 0xcb1ab31f) ^ seed
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

function vnoise(x: number, y: number, z: number, seed: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  let fx = x - ix
  let fy = y - iy
  let fz = z - iz
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  fz = fz * fz * (3 - 2 * fz)
  const c000 = hash3(ix, iy, iz, seed)
  const c100 = hash3(ix + 1, iy, iz, seed)
  const c010 = hash3(ix, iy + 1, iz, seed)
  const c110 = hash3(ix + 1, iy + 1, iz, seed)
  const c001 = hash3(ix, iy, iz + 1, seed)
  const c101 = hash3(ix + 1, iy, iz + 1, seed)
  const c011 = hash3(ix, iy + 1, iz + 1, seed)
  const c111 = hash3(ix + 1, iy + 1, iz + 1, seed)
  const x00 = c000 + (c100 - c000) * fx
  const x10 = c010 + (c110 - c010) * fx
  const x01 = c001 + (c101 - c001) * fx
  const x11 = c011 + (c111 - c011) * fx
  const y0 = x00 + (x10 - x00) * fy
  const y1 = x01 + (x11 - x01) * fy
  return y0 + (y1 - y0) * fz
}

/** fractal value noise in roughly [-1, 1] */
export function fbm(x: number, y: number, z: number, seed: number, octaves: number) {
  let sum = 0
  let amp = 1
  let norm = 0
  let f = 1
  for (let o = 0; o < octaves; o++) {
    sum += (vnoise(x * f, y * f, z * f, seed + o * 7919) * 2 - 1) * amp
    norm += amp
    amp *= 0.5
    f *= 2.1
  }
  return sum / norm
}

// ---------------------------------------------------------------------------
// sampling: per-direction ground height and tint

export interface Sample {
  h: number
  r: number
  g: number
  b: number
}

const SOFT_TOPIC = 0.055 // rad: half-width of the blend between neighbouring sub-regions

const _col = new THREE.Color()
const WHITE = new THREE.Color('#ffffff')
const DARK_ROCK = new THREE.Color('#4a3f47')
const tintCache = new Map<string, THREE.Color>()
function tint(s: string) {
  let c = tintCache.get(s)
  if (!c) {
    c = new THREE.Color(s)
    tintCache.set(s, c)
  }
  return c
}

function smoothstep(a: number, b: number, x: number) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** bowl profile used by water-ish kinds: 1 in the middle, 0 at the rim */
export function waterBowl(u: number) {
  return 1 - smoothstep(0.42, 0.88, u)
}

/** height (world units) and colour of one terrain kind at angular distance `ang` from the topic centre */
function kindSample(topic: Topic, dir: THREE.Vector3, ang: number, noiseSeed: number, out: Sample) {
  const kind = topic.kind
  const u = ang / topic.radius
  const px = dir.x * PLANET_R
  const py = dir.y * PLANET_R
  const pz = dir.z * PLANET_R
  // two noise bands: n1 ~ 11-unit features, n2 ~ 4-unit features
  const n1 = fbm(px * 0.09, py * 0.09, pz * 0.09, noiseSeed, 3)
  const n2 = fbm(px * 0.23 + 31.7, py * 0.23, pz * 0.23 - 11.3, noiseSeed + 101, 2)
  _col.copy(tint(kind.tint))
  // sub-region contrast (layout grammar §g + the ≥ 0.12 L rule): per-topic shade, slow patches, grain
  _col.offsetHSL(0.008 * n1, 0, topic.shade + 0.05 * n1 + 0.02 * n2)
  let h = 0
  switch (kind.profile) {
    case 'peaks': {
      const ridge = 1 - Math.abs(n1)
      h = 0.9 + 2.6 * ridge * ridge + 0.5 * n2
      _col.lerp(tint(kind.alt), THREE.MathUtils.clamp((h - 1.1) / 1.8, 0, 0.85))
      // snowy caps except where snow makes no sense
      const family = topic.course.family
      const cap = family === 'volcanic' ? DARK_ROCK : family === 'sand' ? tint('#f4e6c8') : WHITE
      _col.lerp(cap, smoothstep(2.5, 3.3, h))
      break
    }
    case 'raised':
      h = 0.85 + 0.35 * n1 + 0.06 * n2
      _col.lerp(tint(kind.alt), THREE.MathUtils.clamp(0.1 + n1 * 0.12, 0, 0.25))
      break
    case 'hills':
      h = Math.max(-0.1, 0.35 + 0.9 * n1 + 0.15 * n2)
      _col.lerp(tint(kind.alt), THREE.MathUtils.clamp((h - 0.8) * 0.3, 0, 0.25))
      break
    case 'flat':
      h = 0.08 + 0.09 * n2 + 0.05 * n1
      _col.offsetHSL(0, 0, n2 * 0.025)
      break
    case 'water': {
      const b = waterBowl(u)
      h = -0.62 * b + 0.05 * n2 * (1 - b)
      // shoreline (layout grammar §f): wet band on land just outside the bowl, shallows just inside
      const wet = smoothstep(0.12, 0.3, b) * (1 - smoothstep(0.3, 0.5, b))
      _col.offsetHSL(0, 0, 0.08 * wet)
      _col.lerp(tint(kind.alt), smoothstep(0.2, 0.7, b) * 0.65 + 0.35 * smoothstep(0.45, 0.9, b))
      break
    }
    case 'slope':
      h = THREE.MathUtils.clamp(0.45 - 0.95 * u, -0.5, 0.45) + 0.08 * n2
      _col.copy(tint(kind.alt)).lerp(tint(kind.tint), smoothstep(-0.3, 0.05, h))
      break
    case 'crater': {
      const rim = Math.exp(-((u - 0.6) * (u - 0.6)) / 0.03)
      const bowl = 1 - smoothstep(0.15, 0.5, u)
      h = 0.9 * rim - 0.7 * bowl + 0.1 * n2
      _col.lerp(tint(kind.alt), bowl * 0.8)
      break
    }
    case 'volcano': {
      const cone = Math.pow(Math.max(0, 1 - u / 0.75), 1.3)
      h = 3.8 * cone - 1.4 * Math.max(0, 1 - u / 0.16) + 0.25 * n2
      _col.lerp(DARK_ROCK, cone * 0.8)
      _col.lerp(tint(kind.alt), 1 - smoothstep(0.08, 0.15, u))
      break
    }
  }
  out.h = h
  out.r = _col.r
  out.g = _col.g
  out.b = _col.b
}

function blendWeight(a1: number, a2: number, soft: number) {
  // 0.5 on the boundary (a1 == a2), 0 once a2 is more than 2*soft further away
  return THREE.MathUtils.clamp(0.5 - (a2 - a1) / (4 * soft), 0, 0.5)
}

const _s1: Sample = { h: 0, r: 0, g: 0, b: 0 }
const _s2: Sample = { h: 0, r: 0, g: 0, b: 0 }
const _s3: Sample = { h: 0, r: 0, g: 0, b: 0 }

function mix(a: Sample, b: Sample, w: number, out: Sample) {
  out.h = a.h + (b.h - a.h) * w
  out.r = a.r + (b.r - a.r) * w
  out.g = a.g + (b.g - a.g) * w
  out.b = a.b + (b.b - a.b) * w
}

/** two nearest topics of a course by angle */
function nearestTwo(topics: Topic[], dir: THREE.Vector3) {
  let t1 = topics[0]
  let t2 = topics[0]
  let d1 = -Infinity
  let d2 = -Infinity
  for (const t of topics) {
    const d = t.dir.dot(dir)
    if (d > d1) {
      d2 = d1
      t2 = t1
      d1 = d
      t1 = t
    } else if (d > d2) {
      d2 = d
      t2 = t
    }
  }
  return { t1, t2, a1: Math.acos(THREE.MathUtils.clamp(d1, -1, 1)), a2: Math.acos(THREE.MathUtils.clamp(d2, -1, 1)) }
}

/** half-width (rad) of the lighter band drawn where two sub-regions meet */
const TOPIC_BAND = 0.012
/** half-width (rad) of the blend between a biome and the wilderness */
const BIOME_EDGE = 0.02

const WILD_GRASS = new THREE.Color('#c6d9a9')
const WILD_ROCK = new THREE.Color('#cbbfb1')
const WILD_SEA = new THREE.Color('#9fcfdd')
const WILD_SHORE = new THREE.Color('#e6dcc4')

/** neutral ground between biomes: pale grass in the north, pale rock in the south, shallow seas from slow noise */
function wildSample(planet: Planet, dir: THREE.Vector3, out: Sample) {
  const px = dir.x * PLANET_R
  const py = dir.y * PLANET_R
  const pz = dir.z * PLANET_R
  const n1 = fbm(px * 0.05, py * 0.05, pz * 0.05, planet.noiseSeed + 7, 3)
  const n2 = fbm(px * 0.16 + 5.1, py * 0.16, pz * 0.16 + 2.2, planet.noiseSeed + 19, 2)
  const sea = fbm(px * 0.018 + 91, py * 0.018, pz * 0.018 - 40, planet.noiseSeed + 31, 2)
  _col.copy(WILD_GRASS).lerp(WILD_ROCK, smoothstep(0.25, -0.25, dir.y))
  _col.offsetHSL(0, 0, 0.03 * n1 + 0.012 * n2)
  let h = 0.5 * n1 + 0.12 * n2
  // shallow seas where the slow noise dips; a pale shore band around them
  const seaK = smoothstep(-0.16, -0.26, sea)
  const shoreK = smoothstep(-0.08, -0.16, sea) * (1 - seaK)
  _col.lerp(WILD_SHORE, shoreK)
  _col.lerp(WILD_SEA, seaK)
  h = h * (1 - seaK) - 0.55 * seaK
  out.h = h
  out.r = _col.r
  out.g = _col.g
  out.b = _col.b
}

const MAP_SEA = new THREE.Color('#9fd3e0')
const MAP_GRASS = new THREE.Color('#cfe0b5')
const MAP_OUTLINE = new THREE.Color('#5a5f6b')
/** rim bands of a biome on the level-1 map (rad): beach / rock band, then a dark outline */
const MAP_BAND_ALT = 0.024
const MAP_BAND_OUTLINE = 0.0105

/**
 * Level-1 MAP colour at a direction: three or four flat tones, board-game crisp. Inside a biome cap
 * one flat family ground colour, then the `ground_alt` band, then a dark outline; between biomes a
 * flat shallow sea with a few large flat pale-grass islands. Writes r/g/b only.
 */
export function sampleMapColor(planet: Planet, dir: THREE.Vector3, out: Sample) {
  let c1 = planet.courses[0]
  let d1 = -Infinity
  for (const c of planet.courses) {
    const d = c.dir.dot(dir)
    if (d > d1) {
      d1 = d
      c1 = c
    }
  }
  const ac1 = Math.acos(THREE.MathUtils.clamp(d1, -1, 1))
  const rho = c1.radius
  if (ac1 <= rho - MAP_BAND_ALT - MAP_BAND_OUTLINE) _col.copy(tint(c1.biome.ground))
  else if (ac1 <= rho - MAP_BAND_OUTLINE) _col.copy(tint(c1.biome.alt))
  else if (ac1 <= rho) _col.copy(MAP_OUTLINE)
  else {
    const px = dir.x * PLANET_R
    const py = dir.y * PLANET_R
    const pz = dir.z * PLANET_R
    const island = fbm(px * 0.014 + 91, py * 0.014, pz * 0.014 - 40, planet.noiseSeed + 31, 2)
    _col.copy(island > 0.16 ? MAP_GRASS : MAP_SEA)
  }
  out.r = _col.r
  out.g = _col.g
  out.b = _col.b
}

/**
 * Base ground sample (no progress-driven bumps) at a unit direction.
 * Inside a biome cap: nearest two topics, soft blend, lighter band on their border.
 * Outside every cap: wilderness. `only` restricts sampling to one course (the flat diorama).
 */
export function sampleBase(planet: Planet, dir: THREE.Vector3, out: Sample, only?: Course): Course {
  let c1 = only ?? planet.courses[0]
  let d1 = only ? 1 : -Infinity
  if (!only) {
    for (const c of planet.courses) {
      const d = c.dir.dot(dir)
      if (d > d1) {
        d1 = d
        c1 = c
      }
    }
  }
  const ac1 = only ? 0 : Math.acos(THREE.MathUtils.clamp(d1, -1, 1))
  if (!only && ac1 > c1.radius + BIOME_EDGE) {
    wildSample(planet, dir, out)
    return c1
  }
  const n = nearestTwo(c1.topics, dir)
  kindSample(n.t1, dir, n.a1, planet.noiseSeed, _s1)
  const w = blendWeight(n.a1, n.a2, SOFT_TOPIC)
  if (w > 0.001) {
    kindSample(n.t2, dir, n.a2, planet.noiseSeed, _s2)
    mix(_s1, _s2, w, out)
  } else {
    out.h = _s1.h
    out.r = _s1.r
    out.g = _s1.g
    out.b = _s1.b
  }
  // thin lighter band where two sub-regions meet, so every topic reads as its own tile from above
  const gap = n.a2 - n.a1
  if (gap < TOPIC_BAND) {
    const k = 1 - gap / TOPIC_BAND
    out.r += (1 - out.r) * 0.35 * k
    out.g += (1 - out.g) * 0.35 * k
    out.b += (1 - out.b) * 0.35 * k
  }
  if (only) return c1
  // biome rim: blend into the wilderness across BIOME_EDGE, with a boundary band in the course accent
  if (ac1 > c1.radius - BIOME_EDGE) {
    wildSample(planet, dir, _s3)
    const k = smoothstep(c1.radius - BIOME_EDGE, c1.radius + BIOME_EDGE, ac1)
    const rim = 1 - Math.abs(k - 0.5) * 2
    const acc = tint(c1.biome.accent)
    out.r += (acc.r - out.r) * 0.55 * rim
    out.g += (acc.g - out.g) * 0.55 * rim
    out.b += (acc.b - out.b) * 0.55 * rim
    mix(out, _s3, k, out)
  }
  return c1
}

/** Gaussian mounds under demonstrated concepts ("ground rises"). */
export const BUMP_SIGMA = 2.6 / PLANET_R
export const BUMP_HEIGHT = 1.4

export function bumpsAt(built: Concept[], dir: THREE.Vector3) {
  let bump = 0
  const s2 = BUMP_SIGMA * BUMP_SIGMA
  for (const c of built) {
    const d = c.dir.dot(dir)
    if (d < 0.99) continue // > ~8 degrees away: negligible
    const ang = Math.acos(Math.min(1, d))
    bump += BUMP_HEIGHT * Math.exp(-(ang * ang) / s2)
  }
  return Math.min(bump, 2.4)
}

const _sample: Sample = { h: 0, r: 0, g: 0, b: 0 }

/** growth: positive relief (hills, mountains) scales with the course's progress band; water bowls stay put */
export function applyRelief(planet: Planet, courseIndex: number, h: number) {
  return h > 0 ? h * (planet.relief[courseIndex] ?? 1) : h
}

/** relief multiplier for a demonstrated fraction (growth catalogue bands: 0.6 → 1.3) */
export function reliefFor(fraction: number) {
  return 0.6 + 0.7 * THREE.MathUtils.clamp(fraction, 0, 1)
}

/** full ground height (base + progress bumps) at a direction; `builtByCourse[courseIndex]` lists demonstrated concepts */
export function groundHeight(planet: Planet, dir: THREE.Vector3, builtByCourse: Concept[][], only?: Course) {
  const course = sampleBase(planet, dir, _sample, only)
  return applyRelief(planet, course.index, _sample.h) + bumpsAt(builtByCourse[course.index], dir)
}

/** base height only (used for static decoration) */
export function baseHeight(planet: Planet, dir: THREE.Vector3, only?: Course) {
  const course = sampleBase(planet, dir, _sample, only)
  return applyRelief(planet, course.index, _sample.h)
}

/** water surface offset (below the local base of 0) for water kinds */
export const WATER_LEVEL = -0.22

// ---------------------------------------------------------------------------
// build

export function buildPlanet(seed: string): Planet {
  const rng = makeRng(hashString(seed + ':planet'))
  const noiseSeed = hashString(seed + ':noise') | 0

  // belt placement (world bible §3.3): azimuth i·2π/N, latitude alternating ±16°; tour order = index order
  const N = COURSES.length
  const dirs = COURSES.map((_, i) => {
    const az = (i / N) * Math.PI * 2
    const lat = i % 2 === 0 ? BELT_LAT : -BELT_LAT
    return new THREE.Vector3(Math.sin(az) * Math.cos(lat), Math.sin(lat), Math.cos(az) * Math.cos(lat))
  })

  const courses: Course[] = COURSES.map((def, i) => {
    const frame = tangentFrame(dirs[i])
    return {
      index: i,
      code: def.code,
      name: def.name,
      family: def.family,
      biome: BIOMES[def.family],
      dir: dirs[i],
      east: frame.east,
      north: frame.north,
      radius: 0,
      extent: 0,
      topics: [],
      psets: def.psets,
      roads: [],
      hub: null,
    }
  })
  // bounded biome: BIOME_RADIUS, and never more than 0.42 × the angle to the nearest neighbour (they never touch)
  for (const c of courses) {
    let minAng = Math.PI
    for (const o of courses) if (o !== c) minAng = Math.min(minAng, angleBetween(c.dir, o.dir))
    c.radius = Math.min(BIOME_RADIUS, minAng * 0.42)
  }

  const planet: Planet = { seed, courses, topics: [], spots: [], decor: [], noiseSeed, relief: courses.map(() => 1) }

  let topicIndex = 0
  let conceptIndex = 0
  courses.forEach((course, ci) => {
    const def = COURSES[ci]
    const frame = { east: course.east, north: course.north }
    const rho = course.radius * 0.8
    const inside = (d: THREE.Vector3) => nearestCourse(courses, d) === course && angleBetween(d, course.dir) <= rho

    // --- topic sub-centres: best-candidate sampling inside the patch
    const tdirs: THREE.Vector3[] = []
    for (let k = 0; k < def.topics.length; k++) {
      const pick = bestCandidate(
        18,
        () => {
          const d = randomInCap(rng, course.dir, rho, frame)
          return inside(d) ? d : null
        },
        (d) => {
          let s = (rho - angleBetween(d, course.dir)) * 1.4 + 0.08
          for (const o of tdirs) s = Math.min(s, angleBetween(d, o))
          return s
        },
      )
      tdirs.push(pick ? pick.dir : randomInCap(rng, course.dir, rho * 0.5, frame))
    }

    // --- terrain kinds: the outermost topic is the water body, its neighbour the shore
    const kinds = TERRAIN_KINDS[def.family]
    const water = kinds.find((k) => k.role === 'water')!
    const shore = kinds.find((k) => k.role === 'shore')!
    const others = kinds.filter((k) => k !== water && k !== shore)
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[others[i], others[j]] = [others[j], others[i]]
    }
    const assigned: TerrainKind[] = new Array(tdirs.length)
    let outer = 0
    tdirs.forEach((d, i) => {
      if (angleBetween(d, course.dir) > angleBetween(tdirs[outer], course.dir)) outer = i
    })
    assigned[outer] = water
    let near = -1
    tdirs.forEach((d, i) => {
      if (i !== outer && (near < 0 || angleBetween(d, tdirs[outer]) < angleBetween(tdirs[near], tdirs[outer]))) near = i
    })
    if (near >= 0) assigned[near] = shore
    let oi = 0
    for (let i = 0; i < tdirs.length; i++) {
      if (!assigned[i]) assigned[i] = others[oi++ % others.length]
    }

    const topics: Topic[] = tdirs.map((d, k) => {
      const kind = assigned[k]
      const biome: Biome = { id: def.family, ground: kind.tint, accent: course.biome.accent, creature: course.biome.creature, alt: course.biome.alt }
      const topic: Topic = {
        index: topicIndex++,
        name: def.topics[k].name,
        biome,
        dir: d,
        pos: projectToPatch(course, d),
        course,
        kind,
        radius: 0.2,
        spots: [],
        decor: [],
        shade: 0,
        roads: [],
        hub: false,
      }
      return topic
    })
    for (const t of topics) {
      let minAng = Math.PI
      for (const o of topics) if (o !== t) minAng = Math.min(minAng, angleBetween(t.dir, o.dir))
      // a bit more than the inscribed radius: the Voronoi cell is larger than the half-way disc
      t.radius = THREE.MathUtils.clamp(minAng * 0.62, 0.07, course.radius * 0.6)
    }
    course.topics = topics
    // hub = the topic nearest the course centre (layout grammar §a)
    const hub = topics.reduce((best, t) => (angleBetween(t.dir, course.dir) < angleBetween(best.dir, course.dir) ? t : best), topics[0])
    hub.hub = true
    course.hub = hub
    // sub-region shades: greedy 3-colouring of the adjacency graph so neighbours differ by ≥ 0.07 L
    const SHADES = [0, 0.12, -0.12]
    const adjacent = (a: Topic, b: Topic) => angleBetween(a.dir, b.dir) < (a.radius + b.radius) * 1.1
    const shadeIdx: number[] = new Array(topics.length).fill(-1)
    topics.forEach((t, i) => {
      const used = new Set<number>()
      topics.forEach((o, j) => {
        if (j !== i && shadeIdx[j] >= 0 && adjacent(t, o)) used.add(shadeIdx[j])
      })
      let pick = SHADES.findIndex((_, k) => !used.has(k))
      if (pick < 0) pick = i % SHADES.length
      shadeIdx[i] = pick
      t.shade = SHADES[pick]
    })
    course.extent = THREE.MathUtils.clamp(
      Math.max(...topics.map((t) => angleBetween(t.dir, course.dir) + t.radius * 1.15)),
      0.4,
      0.78,
    )

    // --- concept spots: 4-6 per topic, sprouting ahead of landmarks like buildWorld
    const spotDefs = topics.map((t, k) => {
      const names = def.topics[k].concepts ?? CONCEPT_TEMPLATES.map((c) => `${t.name}: ${c}`)
      const count = Math.min(names.length, 4 + Math.floor(rng() * 3))
      return names.slice(0, count)
    })
    const total = spotDefs.reduce((n, s) => n + s.length, 0)
    let order = 0
    topics.forEach((topic, k) => {
      spotDefs[k].forEach((name, j) => {
        const pick = bestCandidate(
          10,
          () => {
            const d = randomInCap(rng, topic.dir, topic.radius * 0.8, frame)
            return nearestTopic(topics, d) === topic ? d : null
          },
          (d) => {
            let s = 1
            for (const o of topic.spots) s = Math.min(s, angleBetween(d, o.dir))
            return s
          },
        )
        const dir = pick ? pick.dir : topic.dir.clone()
        const concept: Concept = {
          index: conceptIndex++,
          name,
          source: `${def.code} L${String(k * 3 + j + 1).padStart(2, '0')} p.${1 + Math.floor(rng() * 9)}`,
          cluster: topic,
          dir,
          pos: projectToPatch(course, dir),
          sproutAt: (order / total) * 0.6,
          buildAt: Math.min(1, (order + 0.6) / total),
        }
        order++
        topic.spots.push(concept)
        planet.spots.push(concept)
      })
    })

    // --- roads (layout grammar §b): per topic a spanning tree from the plaza to every spot + loop edges;
    //     per course a ring through the plazas in angular order + a spanning tree over the plazas
    const meanEdge = (edges: RoadEdge[]) => (edges.length ? edges.reduce((s, e) => s + angleBetween(e.a, e.b), 0) / edges.length : 0)
    topics.forEach((topic) => {
      const nodes = [topic.dir, ...topic.spots.map((s) => s.dir)]
      const inTree = [true, ...topic.spots.map(() => false)]
      const parentOf: number[] = nodes.map(() => -1)
      const tree: RoadEdge[] = []
      for (let step = 1; step < nodes.length; step++) {
        let bi = -1
        let bj = -1
        let bw = Infinity
        for (let i = 0; i < nodes.length; i++) {
          if (!inTree[i]) continue
          for (let j = 0; j < nodes.length; j++) {
            if (inTree[j]) continue
            const w = angleBetween(nodes[i], nodes[j])
            if (w < bw) {
              bw = w
              bi = i
              bj = j
            }
          }
        }
        if (bj < 0) break
        inTree[bj] = true
        parentOf[bj] = bi
        tree.push({ a: nodes[bi], b: nodes[bj], main: bi === 0 })
      }
      // loop edges: leaves connect to their nearest non-parent node when the edge is short enough
      const degree = nodes.map(() => 0)
      for (const e of tree) {
        degree[nodes.indexOf(e.a)]++
        degree[nodes.indexOf(e.b)]++
      }
      const limit = 1.5 * meanEdge(tree)
      let loops = 0
      const maxLoops = Math.ceil(topic.spots.length / 3)
      for (let j = 1; j < nodes.length && loops < maxLoops; j++) {
        if (degree[j] !== 1) continue
        let best = -1
        let bw = Infinity
        for (let i = 0; i < nodes.length; i++) {
          if (i === j || i === parentOf[j] || parentOf[i] === j) continue
          const w = angleBetween(nodes[i], nodes[j])
          if (w < bw) {
            bw = w
            best = i
          }
        }
        if (best >= 0 && bw < limit) {
          tree.push({ a: nodes[j], b: nodes[best], main: false })
          loops++
        }
      }
      topic.roads = tree
    })
    {
      const order = [...topics].sort((a, b) => Math.atan2(a.pos.y, a.pos.x) - Math.atan2(b.pos.y, b.pos.x))
      const ring: RoadEdge[] = []
      const maxRing = (30 * METRES_TO_UNITS) / PLANET_R
      for (let i = 0; i < order.length; i++) {
        const a = order[i].dir
        const b = order[(i + 1) % order.length].dir
        if (order.length > 2 && angleBetween(a, b) <= maxRing) ring.push({ a, b, main: true })
      }
      // Prim over the plazas, skipping edges the ring already has
      const has = (a: THREE.Vector3, b: THREE.Vector3) => ring.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))
      const inTree = topics.map((_, i) => i === 0)
      for (let step = 1; step < topics.length; step++) {
        let bi = -1
        let bj = -1
        let bw = Infinity
        for (let i = 0; i < topics.length; i++) {
          if (!inTree[i]) continue
          for (let j = 0; j < topics.length; j++) {
            if (inTree[j]) continue
            const w = angleBetween(topics[i].dir, topics[j].dir)
            if (w < bw) {
              bw = w
              bi = i
              bj = j
            }
          }
        }
        if (bj < 0) break
        inTree[bj] = true
        if (!has(topics[bi].dir, topics[bj].dir)) ring.push({ a: topics[bi].dir, b: topics[bj].dir, main: true })
      }
      course.roads = ring
    }

    // --- static decoration (layout grammar §c, §d): prop clusters off the roads, buildings and lamps on them
    const allRoads = [...course.roads, ...topics.flatMap((t) => t.roads)]
    const roadClear = (d: THREE.Vector3, minAng: number) => {
      for (const e of allRoads) if (distToArc(d, e.a, e.b) < minAng) return false
      return true
    }
    const spotMin = (1.6 * METRES_TO_UNITS) / PLANET_R
    const m = (metres: number) => (metres * METRES_TO_UNITS) / PLANET_R
    const addItem = (recipe: Recipe, dir: THREE.Vector3, yaw: number, scale: number, topic: Topic, parent: DecorItem['parent']) => {
      const item: DecorItem = { recipe, dir, pos: projectToPatch(course, dir), yaw, scale, seed: Math.floor(rng() * 1e9), topic, parent }
      topic.decor.push(item)
      planet.decor.push(item)
      return item
    }
    // stage composition: tall things on the outer third of the biome (backdrop ring with 2–3 gaps), low things inside
    const gaps = Array.from({ length: 2 + Math.floor(rng() * 2) }, () => rng() * Math.PI * 2)
    const inGap = (d: THREE.Vector3) => {
      const az = Math.atan2(d.dot(course.east), d.dot(course.north))
      return gaps.some((g) => Math.abs(Math.atan2(Math.sin(az - g), Math.cos(az - g))) < 0.32)
    }
    const rimBand = (d: THREE.Vector3) => {
      const a = angleBetween(d, course.dir) / course.radius
      return a > 0.62 && a < 0.94
    }
    const family = course.family
    topics.forEach((topic) => {
      const decor = topic.kind.decor
      const clusterRecipes = decor.filter(([r]) => CLUSTER_RECIPES.has(r))
      const buildingRecipes = decor.filter(([r]) => BUILDING_RECIPES.has(r))
      const inTopic = (d: THREE.Vector3) => nearestTopic(topics, d) === topic && angleBetween(d, course.dir) < course.radius - m(1)
      const plazaR = m(topic.hub ? 4 : topic.kind.id === 'plaza' ? 3 : 2.2)
      const water = topic.kind.profile === 'water'
      // the water body ends where the bowl profile crosses the water level: ~0.72 of the topic radius
      const shoreR = topic.radius * 0.72

      // clusters: 3–5 centres by best-candidate, ≥ 2.5 m apart, off roads, pads and the plaza;
      // tall recipes only on the rim band (outside the gaps), low ones inside it
      if (clusterRecipes.length) {
        const total = clusterRecipes.reduce((s, [, c]) => s + c, 0)
        const centres: THREE.Vector3[] = []
        const nClusters = 3 + Math.floor(rng() * 3)
        for (let c = 0; c < nClusters; c++) {
          let r = rng() * total
          let recipe: Recipe = clusterRecipes[0][0]
          for (const [rec, cnt] of clusterRecipes) {
            r -= cnt
            recipe = rec
            if (r <= 0) break
          }
          const tall = TALL_RECIPES.has(recipe)
          const pick = bestCandidate(
            14,
            () => {
              const d = randomInCap(rng, topic.dir, topic.radius * 1.3, frame)
              if (!inTopic(d)) return null
              if (tall !== rimBand(d)) return null
              if (tall && inGap(d)) return null
              if (angleBetween(d, topic.dir) < plazaR + m(1.2)) return null
              if (water && angleBetween(d, topic.dir) < shoreR + m(0.6)) return null
              for (const s of topic.spots) if (angleBetween(d, s.dir) < spotMin) return null
              if (!roadClear(d, m(1.0))) return null
              return d
            },
            (d) => {
              let s = angleBetween(d, topic.dir) * 0.3
              for (const o of centres) s = Math.min(s, angleBetween(d, o))
              return s
            },
          )
          if (!pick || pick.score < m(2.5) * 0.6) continue
          centres.push(pick.dir)
          const members = 3 + (rng() < 0.25 ? 1 : 0)
          const base = rng() * Math.PI * 2
          const scales = recipe === 'mountain' ? [1.0, 0.75, 0.6, 0.5] : [1.0, 0.8, 0.65, 0.55]
          const spread = m(recipe === 'mountain' ? 2.4 : 0.35 + rng() * 0.35)
          for (let k = 0; k < members; k++) {
            const a = base + (k / members) * Math.PI * 2 + (rng() - 0.5) * 0.9
            const rr = spread * (0.6 + rng() * 0.8)
            const d = pick.dir
              .clone()
              .addScaledVector(frame.east, Math.cos(a) * rr)
              .addScaledVector(frame.north, Math.sin(a) * rr)
              .normalize()
            addItem(recipe, d, rng() * Math.PI * 2, scales[k] * (0.9 + rng() * 0.2), topic, 'cluster')
          }
        }
      }

      // buildings: slots along both edges of the topic's (wound) roads, facing the road, ×1.4 (layout grammar §c)
      const roadPts = topic.roads.map((e) => ({ e, pts: roadCurve(e, family, Math.max(4, Math.ceil((angleBetween(e.a, e.b) * PLANET_R) / (0.8 * METRES_TO_UNITS)))) }))
      if (buildingRecipes.length) {
        const want = Math.min(12, buildingRecipes.reduce((s, [, c]) => s + c, 0))
        const slots: { dir: THREE.Vector3; yaw: number }[] = []
        const step = m(family === 'city' ? 1.9 : 2.6)
        for (const { e, pts } of roadPts) {
          let side = 1
          let acc = m(1.5)
          for (let i = 1; i < pts.length; i++) {
            acc += angleBetween(pts[i - 1], pts[i])
            if (acc < step) continue
            acc = 0
            const { across } = roadFrame(pts, i)
            const off = m(0.35 + 0.6) + (e.main ? m(0.6) : m(0.45))
            const d = pts[i].clone().addScaledVector(across, side * off).normalize()
            side = -side
            if (!inTopic(d)) continue
            if (angleBetween(d, topic.dir) < plazaR + m(0.5)) continue
            let ok = true
            for (const s of topic.spots) if (angleBetween(d, s.dir) < m(1.2)) ok = false
            for (const o of slots) if (angleBetween(d, o.dir) < m(1.6)) ok = false
            if (!ok) continue
            const toRoad = across.clone().multiplyScalar(-side)
            const yaw = Math.atan2(toRoad.dot(frame.east), toRoad.dot(frame.north))
            slots.push({ dir: d, yaw })
          }
        }
        let bi = 0
        for (let i = 0; i < Math.min(want, slots.length); i++) {
          const [recipe] = buildingRecipes[bi++ % buildingRecipes.length]
          addItem(recipe, slots[i].dir, slots[i].yaw + (rng() - 0.5) * 0.14, 1.4 * (0.9 + rng() * 0.25), topic, 'road')
        }
      }

      // lamps every 6 m on main roads, alternating sides (≤ 8 per topic); fences on the water side of shore roads
      let lamps = 0
      for (const { e, pts } of roadPts) {
        let side = 1
        let acc = m(3)
        let fenceAcc = 0
        for (let i = 1; i < pts.length; i++) {
          const seg = angleBetween(pts[i - 1], pts[i])
          acc += seg
          fenceAcc += seg
          const { t, across } = roadFrame(pts, i)
          if (e.main && acc >= m(6) && lamps < 8) {
            acc = 0
            const d = pts[i].clone().addScaledVector(across, side * m(0.95)).normalize()
            side = -side
            if (inTopic(d)) {
              addItem('lamp', d, 0, 1.3, topic, 'road')
              lamps++
            }
          }
          if (water && fenceAcc >= m(1.0) && angleBetween(pts[i], topic.dir) < shoreR + m(2.5)) {
            fenceAcc = 0
            // fence on the side facing the water body
            const toWater = topic.dir.clone().sub(pts[i])
            const sgn = toWater.dot(across) > 0 ? 1 : -1
            const d = pts[i].clone().addScaledVector(across, sgn * m(0.9)).normalize()
            if (inTopic(d)) addItem('fence', d, Math.atan2(t.dot(frame.east), t.dot(frame.north)), 1.2, topic, 'road')
          }
        }
      }

      // shoreline shard / foam row on the waterline (layout grammar §f)
      if (water) {
        const stepM = family === 'ice' ? 1.4 : 0.7
        const n = Math.max(8, Math.round((shoreR * PLANET_R * 2 * Math.PI) / (stepM * METRES_TO_UNITS)))
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2
          const rr = shoreR + m(0.15) + (rng() - 0.5) * m(0.4)
          const d = topic.dir
            .clone()
            .addScaledVector(frame.east, Math.cos(a) * Math.tan(rr))
            .addScaledVector(frame.north, Math.sin(a) * Math.tan(rr))
            .normalize()
          if (!inTopic(d)) continue
          addItem('shard', d, rng() * Math.PI * 2, 0.5 + rng() * 0.4, topic, 'shore')
        }
      }
    })

    planet.topics.push(...topics)
  })

  return planet
}

/** angular distance from a direction to a road edge (sampled along its wound curve) */
function distToArc(d: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  let best = Infinity
  for (const p of roadCurve({ a, b, main: false }, 'ice', 10)) best = Math.min(best, angleBetween(d, p))
  return best
}

/** road winding jitter per family (layout grammar §b.4), as a fraction of the edge length */
const ROAD_JITTER: Record<BiomeId, number> = { city: 0.25, ice: 0.12, forest: 0.18, sand: 0.18, meadow: 0.18, coast: 0.18, volcanic: 0.18 }

const _cr = new THREE.CatmullRomCurve3()
/**
 * The wound centre line of a road edge as unit directions: Catmull-Rom through the ends and
 * `ceil(len / 6 m)` interior points offset perpendicular by ±jitter × len, alternating, seeded by
 * the endpoints. Shared by rendering, lamp / building slots and clearance tests, so they agree.
 */
export function roadCurve(e: RoadEdge, family: BiomeId, samples: number): THREE.Vector3[] {
  const len = angleBetween(e.a, e.b)
  const rng = makeRng((hashString(e.a.x.toFixed(4) + e.a.y.toFixed(4) + e.b.x.toFixed(4) + e.b.z.toFixed(4)) | 0) >>> 0)
  const k = Math.max(1, Math.ceil((len * PLANET_R) / (6 * METRES_TO_UNITS)))
  const q = new THREE.Quaternion().setFromUnitVectors(e.a, e.b)
  const qi = new THREE.Quaternion()
  const pts: THREE.Vector3[] = [e.a.clone()]
  let sign = rng() < 0.5 ? 1 : -1
  for (let i = 1; i <= k; i++) {
    qi.identity().slerp(q, i / (k + 1))
    const p = e.a.clone().applyQuaternion(qi).normalize()
    const t = e.b.clone().sub(e.a).addScaledVector(p, -e.b.clone().sub(e.a).dot(p)).normalize()
    const across = new THREE.Vector3().crossVectors(p, t).normalize()
    p.addScaledVector(across, sign * ROAD_JITTER[family] * len * (0.6 + 0.4 * rng())).normalize()
    pts.push(p)
    sign = -sign
  }
  pts.push(e.b.clone())
  _cr.points = pts
  _cr.curveType = 'catmullrom'
  _cr.tension = 0.5
  const out: THREE.Vector3[] = []
  for (let i = 0; i <= samples; i++) out.push(_cr.getPoint(i / samples).normalize())
  return out
}

/** tangent frame along a sampled road: point, forward tangent and the left-hand across vector */
export function roadFrame(pts: THREE.Vector3[], i: number) {
  const p = pts[i]
  const prev = pts[Math.max(0, i - 1)]
  const next = pts[Math.min(pts.length - 1, i + 1)]
  const t = next.clone().sub(prev).addScaledVector(p, -next.clone().sub(prev).dot(p)).normalize()
  const across = new THREE.Vector3().crossVectors(p, t).normalize()
  return { p, t, across }
}

/** demonstrated concepts grouped by course, for the bump term */
export function builtByCourse(planet: Planet, progress: number): Concept[][] {
  return planet.courses.map((c) => c.topics.flatMap((t) => t.spots.filter((s) => progress >= s.buildAt)))
}

/** angular radius of the water body for water kinds (rad) */
export function waterRadius(topic: Topic) {
  return topic.kind.role === 'water' ? topic.radius * 0.8 : topic.radius * 0.66
}

export function creatureCount(course: Course, progress: number) {
  return Math.floor(progress * course.psets + 1e-6)
}

/** for the tangent frame of anything standing on the planet */
export const UP = new THREE.Vector3(0, 1, 0)
const _q = new THREE.Quaternion()
export function orientOnSphere(dir: THREE.Vector3, yaw = 0, out = new THREE.Quaternion()) {
  out.setFromUnitVectors(UP, dir)
  if (yaw !== 0) out.multiply(_q.setFromAxisAngle(UP, yaw))
  return out
}
