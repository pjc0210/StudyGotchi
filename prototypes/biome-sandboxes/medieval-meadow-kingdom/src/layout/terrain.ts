import {
  type DistrictDef,
  type DistrictProgress,
  type GeneratedKingdom,
  type Point2,
  maxBuildings,
  pointInPolygon,
  seeded,
} from './biome-layout'

export type GroundMaterial = 'meadow' | 'meadow-light' | 'bank' | 'water' | 'court' | 'headland'

export interface TerrainSample {
  height: number
  material: GroundMaterial
  districtId: string | null
}

export interface Slot {
  districtId: string
  index: number
  position: [number, number, number]
  yaw: number
  variant: number
}

export interface TreePlacement {
  position: [number, number, number]
  scale: number
  yaw: number
  crown: 'round' | 'oak'
}

export interface AmbientPlacement {
  kind: 'flowers' | 'rocks' | 'hay' | 'reeds'
  position: [number, number, number]
  scale: number
  yaw: number
}

export interface ResidentSeat {
  districtId: string
  center: Point2
  radius: number
  phase: number
}

export interface DistrictDetail {
  kind: string
  position: [number, number, number]
  yaw: number
}

export interface AnimalPlacement {
  kind: 'sheep' | 'cow' | 'chicken'
  position: [number, number, number]
  yaw: number
  scale: number
}

function segmentDistance(a: Point2, b: Point2, x: number, z: number): { dist: number; t: number } {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const length2 = dx * dx + dz * dz || 1
  const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / length2))
  return { dist: Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z), t }
}

export function distToPolyline(points: Point2[], x: number, z: number): { dist: number; t: number } {
  let best = Number.POSITIVE_INFINITY
  let progress = 0
  for (let i = 1; i < points.length; i++) {
    const hit = segmentDistance(points[i - 1], points[i], x, z)
    if (hit.dist < best) {
      best = hit.dist
      progress = (i - 1 + hit.t) / (points.length - 1)
    }
  }
  return { dist: best, t: progress }
}

function terrainNoise(x: number, z: number): number {
  return Math.sin(x * 0.071 + z * 0.039) * 0.12 + Math.sin(x * 0.027 - z * 0.083) * 0.08
}

export function districtAt(layout: GeneratedKingdom, x: number, z: number): DistrictDef | null {
  return layout.districts.find((district) => pointInPolygon(district.polygon, x, z)) ?? null
}

export function sampleTerrain(layout: GeneratedKingdom, x: number, z: number): TerrainSample {
  const district = districtAt(layout, x, z)
  const river = distToPolyline(layout.river, x, z).dist
  const tributary = distToPolyline(layout.tributary, x, z).dist
  const channelDistance = Math.min(river - layout.riverWidth / 2, tributary - 3.5)
  if (channelDistance < 0) return { height: layout.waterHeight, material: 'water', districtId: district?.id ?? null }
  if (channelDistance < 5) return { height: -0.15 + terrainNoise(x, z) * 0.25, material: 'bank', districtId: district?.id ?? null }

  let height = layout.groundHeight + terrainNoise(x, z)
  let material: GroundMaterial = 'meadow'
  if (district) {
    material = district.id === 'castle-court' || district.id === 'bridge-market' ? 'court' : 'meadow-light'
    height = district.id === 'castle-court' ? 2.2 : 0.12
  }
  if (Math.hypot(x - layout.landmark.position[0], z - layout.landmark.position[1]) < 18) {
    height = Math.max(height, 2.2 + Math.max(0, 1 - Math.hypot(x - layout.landmark.position[0], z - layout.landmark.position[1]) / 18) * 1.8)
    material = district?.id === 'castle-court' ? 'court' : 'headland'
  }
  return { height, material, districtId: district?.id ?? null }
}

function worldFromLocal(district: DistrictDef, x: number, z: number): Point2 {
  const c = Math.cos(district.yaw)
  const s = Math.sin(district.yaw)
  return [district.centre[0] + x * c - z * s, district.centre[1] + x * s + z * c]
}

const AUTHORED_SLOTS: Record<DistrictDef['id'], Array<[number, number, number]>> = {
  'forest-hamlet': [[-11, 6, -0.28], [-3, 9, 0.18], [8, 7, -0.12], [13, -1, 0.31], [2, -8, -0.34], [-10, -6, 0.12]],
  'river-village': [[-12, -6, 0.2], [-5, -10, -0.24], [4, -8, 0.12], [-10, 5, -0.35], [0, 7, 0.28], [9, 4, -0.12]],
  'bridge-market': [[-10, -7, 0.2], [-2, -9, -0.16], [8, -6, 0.3], [-11, 5, -0.28], [-3, 8, 0.12], [7, 7, -0.2], [13, 1, 0.18]],
  'farm-common': [[-15, -8, -0.32], [-5, -12, 0.18], [8, -10, -0.16], [-12, 9, 0.25], [2, 11, -0.28]],
  'castle-court': [],
}

function candidateSlots(district: DistrictDef): Array<{ x: number; z: number; yaw: number }> {
  return AUTHORED_SLOTS[district.id].map(([x, z, yaw]) => {
    const position = worldFromLocal(district, x, z)
    return { x: position[0], z: position[1], yaw: district.yaw + yaw }
  })
}

export function buildingSlots(layout: GeneratedKingdom, district: DistrictDef): Slot[] {
  const out: Slot[] = []
  const candidates = candidateSlots(district)
  for (const candidate of candidates) {
    if (out.length >= maxBuildings(district)) break
    if (!pointInPolygon(district.polygon, candidate.x, candidate.z)) continue
    const sample = sampleTerrain(layout, candidate.x, candidate.z)
    if (sample.material === 'water') continue
    if (district.id === 'castle-court' && Math.hypot(candidate.x - layout.landmark.position[0], candidate.z - layout.landmark.position[1]) < 8) continue
    out.push({
      districtId: district.id,
      index: out.length,
      position: [candidate.x, sample.height, candidate.z],
      yaw: candidate.yaw,
      variant: (out.length + district.band) % 4,
    })
  }
  return out
}

export function districtAnchor(layout: GeneratedKingdom, district: DistrictDef): [number, number, number] {
  const site = layout.sites.find((candidate) => candidate.districtId === district.id)!
  const sample = sampleTerrain(layout, site.position[0], site.position[1])
  return [site.position[0], sample.height, site.position[1]]
}

const DETAIL_OFFSETS: Record<DistrictDef['id'], Array<[string, number, number, number]>> = {
  'forest-hamlet': [
    ['sawyard', 10, 2, 0.35],
    ['log-stacks', 13, -7, -0.1],
    ['coppice', -13, -7, 0],
  ],
  'river-village': [
    ['landing', 14, 4, -0.45],
    ['kitchen-gardens', -10, 9, 0.2],
    ['millrace', 12, -4, -0.45],
  ],
  'bridge-market': [
    ['guild-hall', 12, -5, -0.15],
    ['market-stalls', -4, 1, 0.12],
    ['fountain', 5, 7, 0],
  ],
  'farm-common': [
    ['l-barn', -12, 5, 0.25],
    ['orchard', 12, -8, -0.15],
    ['crop-strips', 10, 10, 0.22],
    ['hedges', -1, -12, -0.1],
  ],
  'castle-court': [
    ['forecourt', 0, 8, 0],
    ['hedge-rooms', -10, 6, 0],
    ['kitchen-orchard', 11, 6, 0],
  ],
}

export function authoredDistrictDetails(district: DistrictDef): DistrictDetail[] {
  return DETAIL_OFFSETS[district.id].map(([kind, x, z, yaw]) => {
    const [worldX, worldZ] = worldFromLocal(district, x, z)
    return { kind, position: [worldX, district.id === 'castle-court' ? 2.24 : 0.14, worldZ], yaw: district.yaw + yaw }
  })
}

export function localLaneSegments(layout: GeneratedKingdom): GeneratedKingdom['roads'] {
  const localPoints: Record<DistrictDef['id'], Point2[]> = {
    'forest-hamlet': [[-15, 8], [-8, 4], [0, 1], [9, -3]],
    'river-village': [[-13, 7], [-7, 3], [0, 0], [10, -3]],
    'bridge-market': [[-14, 4], [-6, 1], [2, 0], [12, -2]],
    'farm-common': [[-17, 6], [-9, 2], [0, -1], [11, -5]],
    'castle-court': [[-12, 8], [-5, 5], [2, 2], [10, -1]],
  }
  return layout.districts.map((district) => ({
    id: `${district.id}-local`,
    width: district.id === 'bridge-market' || district.id === 'castle-court' ? 3.4 : 2.4,
    points: localPoints[district.id].map(([x, z]) => worldFromLocal(district, x, z)),
  }))
}

export function animalPlacements(layout: GeneratedKingdom, seed: number): AnimalPlacement[] {
  const farm = layout.districts.find((district) => district.id === 'farm-common')!
  const forest = layout.districts.find((district) => district.id === 'forest-hamlet')!
  const rng = seeded(seed * 67 + 29)
  const candidates: Array<{ district: DistrictDef; kind: AnimalPlacement['kind']; x: number; z: number }> = [
    { district: farm, kind: 'sheep', x: -18, z: -3 },
    { district: farm, kind: 'sheep', x: -14, z: 0 },
    { district: farm, kind: 'sheep', x: -18, z: 5 },
    { district: farm, kind: 'sheep', x: -10, z: -4 },
    { district: farm, kind: 'cow', x: 3, z: 4 },
    { district: farm, kind: 'cow', x: 7, z: 7 },
    { district: farm, kind: 'chicken', x: -5, z: 9 },
    { district: farm, kind: 'chicken', x: -2, z: 11 },
    { district: forest, kind: 'chicken', x: 7, z: 8 },
    { district: forest, kind: 'chicken', x: 10, z: 6 },
  ]
  return candidates.flatMap(({ district, kind, x, z }) => {
    const [worldX, worldZ] = worldFromLocal(district, x, z)
    const sample = sampleTerrain(layout, worldX, worldZ)
    if (sample.material === 'water') return []
    return [{
      kind,
      position: [worldX, sample.height, worldZ] as [number, number, number],
      yaw: district.yaw + rng() * Math.PI * 2,
      scale: 0.9 + rng() * 0.22,
    }]
  })
}

/** Ragged woodland around the forest district, plus sparse tree punctuation elsewhere. */
export function treePlacements(layout: GeneratedKingdom, seed: number): TreePlacement[] {
  const rng = seeded(seed * 43 + 9)
  const out: TreePlacement[] = []
  const forest = layout.districts.find((district) => district.id === 'forest-hamlet')!
  const bands: Array<{ count: number; minX: number; maxX: number; minZ: number; maxZ: number }> = [
    { count: 42, minX: -110, maxX: -55, minZ: -91, maxZ: -75 },
    { count: 22, minX: -113, maxX: -99, minZ: -78, maxZ: -48 },
    { count: 20, minX: -62, maxX: -51, minZ: -78, maxZ: -50 },
    { count: 10, minX: -101, maxX: -66, minZ: -77, maxZ: -70 },
  ]
  let index = 0
  for (const band of bands) {
    for (let i = 0; i < band.count; i++) {
      const x = band.minX + rng() * (band.maxX - band.minX)
      const z = band.minZ + rng() * (band.maxZ - band.minZ)
      if (pointInPolygon(forest.polygon, x, z) && z > forest.centre[1] - 6) continue
      if (distToPolyline(layout.river, x, z).dist < layout.riverWidth / 2 + 4) continue
      if (layout.preserves.some((preserve) => Math.abs(x - preserve.center[0]) < preserve.size[0] / 2 && Math.abs(z - preserve.center[1]) < preserve.size[1] / 2)) continue
      if (out.some((tree) => Math.hypot(tree.position[0] - x, tree.position[2] - z) < 2.5)) continue
      const sample = sampleTerrain(layout, x, z)
      if (sample.material === 'water') continue
      out.push({ position: [x, sample.height, z], scale: 0.75 + rng() * 0.8, yaw: rng() * Math.PI * 2, crown: index++ % 13 === 0 ? 'oak' : 'round' })
    }
  }
  return out
}

export function ambientPlacements(layout: GeneratedKingdom, seed: number): AmbientPlacement[] {
  const rng = seeded(seed * 13 + 71)
  const out: AmbientPlacement[] = []
  for (const preserve of layout.preserves) {
    for (let i = 0; i < 5; i++) {
      const x = preserve.center[0] + (rng() - 0.5) * preserve.size[0] * 0.7
      const z = preserve.center[1] + (rng() - 0.5) * preserve.size[1] * 0.7
      const sample = sampleTerrain(layout, x, z)
      if (sample.material === 'water') continue
      out.push({ kind: i === 0 ? 'rocks' : 'flowers', position: [x, sample.height, z], scale: 0.9 + rng() * 0.8, yaw: rng() * Math.PI * 2 })
    }
  }
  for (let i = 0; i < 12; i++) {
    const along = (i + 0.5) / 12
    const x = -23 + along * 55 + (rng() - 0.5) * 8
    const z = -116 + along * 230 + (rng() - 0.5) * 10
    const sample = sampleTerrain(layout, x, z)
    if (sample.material === 'water') continue
    out.push({ kind: 'reeds', position: [x, sample.height, z], scale: 0.8 + rng() * 0.6, yaw: rng() * Math.PI * 2 })
  }
  for (const [x, z] of [[-92, 62], [-84, 67], [-58, 58]] as Point2[]) {
    const sample = sampleTerrain(layout, x, z)
    out.push({ kind: 'hay', position: [x, sample.height, z], scale: 1.1 + rng() * 0.4, yaw: rng() * Math.PI })
  }
  return out
}

export function residentSeats(layout: GeneratedKingdom, progress: DistrictProgress, count: number, seed: number): ResidentSeat[] {
  const active = layout.districts.filter((district) => (progress[district.id] ?? 0) > 0)
  if (active.length === 0) return []
  const rng = seeded(seed * 17 + 3)
  return Array.from({ length: count }, (_, index) => {
    const district = active[index % active.length]
    return {
      districtId: district.id,
      center: [district.centre[0] + (rng() - 0.5) * 8, district.centre[1] + (rng() - 0.5) * 8],
      radius: 1.5 + rng() * 2,
      phase: rng() * Math.PI * 2,
    }
  })
}
