import * as THREE from 'three'
import { hashString, makeRng } from './seed'

export type BiomeId = 'forest' | 'city' | 'ice' | 'sand' | 'meadow' | 'coast' | 'volcanic'

export interface Biome {
  id: BiomeId
  ground: string
  accent: string
  creature: string
  /** `ground_alt` from assets/biomes/catalog.json: the beach / rock band around a biome on the map */
  alt: string
}

export const BIOMES: Record<BiomeId, Biome> = {
  forest: { id: 'forest', ground: '#8fc48a', accent: '#4f8a4a', creature: '#f2a86f', alt: '#6fa86a' },
  city: { id: 'city', ground: '#d9c3d6', accent: '#b98bb0', creature: '#e88a8a', alt: '#b98bb0' },
  ice: { id: 'ice', ground: '#e6f2fb', accent: '#a9cfe8', creature: '#8fc9d8', alt: '#a9cfe8' },
  sand: { id: 'sand', ground: '#efd9a2', accent: '#d2a95e', creature: '#b9c96f', alt: '#d2a95e' },
  meadow: { id: 'meadow', ground: '#bfe0a0', accent: '#8fbf6a', creature: '#c9a2e6', alt: '#8fbf6a' },
  // the two extra families only exist on the multi-course planet (Planet 2-zoom)
  coast: { id: 'coast', ground: '#bfe1de', accent: '#3f8fa8', creature: '#f2c56b', alt: '#efe3c0' },
  volcanic: { id: 'volcanic', ground: '#8d7f88', accent: '#e0653a', creature: '#f0a35e', alt: '#8a4a3f' },
}

export interface Cluster {
  index: number
  name: string
  biome: Biome
  /** unit direction on the planet */
  dir: THREE.Vector3
  /** 2D position on the island (x, z), radius-normalised to [-1, 1] */
  pos: THREE.Vector2
}

export interface Concept {
  index: number
  name: string
  source: string
  cluster: Cluster
  dir: THREE.Vector3
  pos: THREE.Vector2
  /** thresholds along progress [0, 1] */
  sproutAt: number
  buildAt: number
}

export interface CourseWorld {
  seed: string
  course: string
  clusters: Cluster[]
  concepts: Concept[]
  psets: number
}

const COURSE_6_1210 = {
  course: '6.1210 Introduction to Algorithms',
  clusters: [
    { name: 'Sorting & recurrences', biome: 'forest' as BiomeId, concepts: ['Insertion sort', 'Merge sort', 'Master theorem', 'Heaps', 'Heapsort', 'Counting sort'] },
    { name: 'Hashing', biome: 'meadow' as BiomeId, concepts: ['Direct access arrays', 'Hash functions', 'Chaining', 'Universal hashing', 'Open addressing'] },
    { name: 'Trees & balanced search', biome: 'ice' as BiomeId, concepts: ['Binary search trees', 'Tree traversal', 'AVL rotations', 'Sequence AVL', 'Augmentation'] },
    { name: 'Graphs & shortest paths', biome: 'city' as BiomeId, concepts: ['BFS', 'DFS', 'Topological sort', 'Bellman-Ford', 'Dijkstra', 'Johnson'] },
    { name: 'Dynamic programming', biome: 'sand' as BiomeId, concepts: ['SRTBOT', 'LCS', 'Knapsack', 'Edit distance', 'Piano fingering', 'Floyd-Warshall'] },
  ],
}

export function randomUnitVector(rng: () => number) {
  const z = rng() * 2 - 1
  const t = rng() * Math.PI * 2
  const r = Math.sqrt(1 - z * z)
  return new THREE.Vector3(r * Math.cos(t), z, r * Math.sin(t))
}

function randomDisc(rng: () => number, maxR: number) {
  const a = rng() * Math.PI * 2
  const r = Math.sqrt(rng()) * maxR
  return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)
}

/** Spread cluster centres apart with a few relaxation passes so biomes do not overlap. */
export function relaxDirections(dirs: THREE.Vector3[], passes = 40) {
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < dirs.length; i++) {
      const push = new THREE.Vector3()
      for (let j = 0; j < dirs.length; j++) {
        if (i === j) continue
        const d = dirs[i].clone().sub(dirs[j])
        const len = Math.max(d.length(), 0.05)
        push.add(d.multiplyScalar(0.15 / (len * len)))
      }
      dirs[i].add(push.multiplyScalar(0.05)).normalize()
    }
  }
}

function relaxPositions(pts: THREE.Vector2[], maxR: number, passes = 40) {
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < pts.length; i++) {
      const push = new THREE.Vector2()
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue
        const d = pts[i].clone().sub(pts[j])
        const len = Math.max(d.length(), 0.05)
        push.add(d.multiplyScalar(0.12 / (len * len)))
      }
      pts[i].add(push.multiplyScalar(0.05))
      if (pts[i].length() > maxR) pts[i].setLength(maxR)
    }
  }
}

export function buildWorld(seed: string): CourseWorld {
  const rng = makeRng(hashString(seed))
  const def = COURSE_6_1210

  const dirs = def.clusters.map(() => randomUnitVector(rng))
  relaxDirections(dirs)
  const pts = def.clusters.map(() => randomDisc(rng, 0.65))
  relaxPositions(pts, 0.65)

  const clusters: Cluster[] = def.clusters.map((c, i) => ({
    index: i,
    name: c.name,
    biome: BIOMES[c.biome],
    dir: dirs[i],
    pos: pts[i],
  }))

  const concepts: Concept[] = []
  const total = def.clusters.reduce((n, c) => n + c.concepts.length, 0)
  let order = 0
  def.clusters.forEach((c, ci) => {
    const cluster = clusters[ci]
    c.concepts.forEach((name, k) => {
      const jitter = randomUnitVector(rng).multiplyScalar(0.28)
      const dir = cluster.dir.clone().add(jitter).normalize()
      const off = randomDisc(rng, 0.22)
      const pos = cluster.pos.clone().add(off)
      if (pos.length() > 0.9) pos.setLength(0.9)
      // concepts get "touched" well before they are "demonstrated", so sprouts run ahead of landmarks
      const sproutAt = (order / total) * 0.6
      const buildAt = Math.min(1, (order + 0.6) / total)
      concepts.push({
        index: order,
        name,
        source: `L${String(ci * 5 + k + 1).padStart(2, '0')} p.${1 + Math.floor(rng() * 9)}`,
        cluster,
        dir,
        pos,
        sproutAt,
        buildAt,
      })
      order++
    })
  })

  return { seed, course: def.course, clusters, concepts, psets: 10 }
}

export type ConceptState = 0 | 1 | 2

export function conceptState(c: Concept, progress: number): ConceptState {
  if (progress >= c.buildAt) return 2
  if (progress >= c.sproutAt) return 1
  return 0
}

export function nearestCluster(clusters: Cluster[], dir: THREE.Vector3): Cluster {
  let best = clusters[0]
  let bestDot = -Infinity
  for (const c of clusters) {
    const d = c.dir.dot(dir)
    if (d > bestDot) {
      bestDot = d
      best = c
    }
  }
  return best
}

export function nearestCluster2D(clusters: Cluster[], p: THREE.Vector2): Cluster {
  let best = clusters[0]
  let bestD = Infinity
  for (const c of clusters) {
    const d = c.pos.distanceToSquared(p)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}
