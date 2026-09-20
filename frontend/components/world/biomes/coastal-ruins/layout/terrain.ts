import {
  type BiomeLayout,
  type BoatRoute,
  type DistrictDef,
  type DistrictProgress,
  type Point2,
  type SkylineProfile,
  districtField,
  maxBuildings,
  pointInPolygon,
  polygonEdgeDistance,
  polygonField,
  populationFor,
  seeded,
  seededDistrictPlan,
} from './biome-layout'

function hash2(x: number, z: number): number {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function noise(x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const sx = fx * fx * (3 - 2 * fx)
  const sz = fz * fz * (3 - 2 * fz)
  const a = hash2(ix, iz)
  const b = hash2(ix + 1, iz)
  const c = hash2(ix, iz + 1)
  const d = hash2(ix + 1, iz + 1)
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz
}

export function fbm(x: number, z: number): number {
  let value = 0
  let amplitude = 0.5
  for (let octave = 0; octave < 3; octave++) {
    value += (noise(x, z) - 0.5) * amplitude
    x *= 2
    z *= 2
    amplitude *= 0.5
  }
  return value
}

export function smoothstep(a: number, b: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function landField(layout: BiomeLayout, x: number, z: number): number {
  return Math.max(polygonField(layout.coastline, x, z), polygonField(layout.headland.polygon, x, z))
}

export type GroundMaterial = 'sea' | 'shallows' | 'limestone' | 'terrace' | 'ruin-bed'

export interface Sample {
  height: number
  material: GroundMaterial
  districtId: string | null
}

function districtAt(layout: BiomeLayout, x: number, z: number): DistrictDef | null {
  return layout.districts.find((district) => districtField(district, x, z) > 0) ?? null
}

function terraceHeight(layout: BiomeLayout, district: DistrictDef | null, x: number, z: number): number {
  if (!district || (district.id !== 'cliff-village' && district.id !== 'dry-terraces')) return layout.groundHeight
  const local = district.id === 'cliff-village' ? z - district.nominalCenter[1] : x - district.nominalCenter[0]
  if (local < -8) return 4
  if (local < 8) return 3.2
  return 2.4
}

/** Skyline profile is accepted deliberately but never changes settlement terrain. */
export function sampleTerrain(layout: BiomeLayout, x: number, z: number, _profile?: SkylineProfile): Sample {
  const district = districtAt(layout, x, z)
  const headland = pointInPolygon(layout.headland.polygon, x, z)
  const field = landField(layout, x, z)

  if (field <= 0) {
    const shallow = field > -layout.shallowsWidth
    const drowned = district?.id === 'drowned-forum'
    return {
      height: shallow ? layout.seaLevel - 0.55 - smoothstep(0, layout.shallowsWidth, -field) * 0.85 : layout.seaLevel - 1.6,
      material: drowned ? 'ruin-bed' : shallow ? 'shallows' : 'sea',
      districtId: district?.id ?? null,
    }
  }

  const pad = terraceHeight(layout, district, x, z)
  const relief = district ? 0 : fbm(x * 0.035, z * 0.035) * layout.relief
  return {
    height: headland ? layout.headland.height : pad + relief,
    material: district && (district.id === 'cliff-village' || district.id === 'dry-terraces') ? 'terrace' : 'limestone',
    districtId: district?.id ?? null,
  }
}

export function fixedWorldFingerprint(layout: BiomeLayout): string {
  return JSON.stringify({
    coastline: layout.coastline,
    headland: layout.headland,
    routes: layout.boatRoutes,
    protectedOpen: layout.protectedOpen,
    fog: layout.fog,
  })
}

export function distanceToPolyline(points: Point2[], x: number, z: number): number {
  let best = Number.POSITIVE_INFINITY
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]
    const b = points[index]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const length2 = dx * dx + dz * dz || 1
    const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / length2))
    best = Math.min(best, Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z))
  }
  return best
}

export function boatRouteClearance(layout: BiomeLayout, route: BoatRoute): number {
  const interior = route.points.slice(1, -1)
  if (interior.length === 0) return 0
  return Math.min(...interior.map(([x, z]) => Math.max(0, -landField(layout, x, z))))
}

export interface Slot {
  position: [number, number, number]
  yaw: number
  districtId: string
  index: number
  overWater: boolean
}

/**
 * Fixed growth order per seed. The seed shifts a district's occupied subareas, while the
 * catchment, coast, routes, and preserves stay fixed.
 */
export function districtSlots(layout: BiomeLayout, district: DistrictDef, seed: number): Slot[] {
  const placed = seededDistrictPlan(layout, seed)[district.id]
  const rng = seeded(seed * 409 + district.band * 97)
  const count = maxBuildings(district)
  const yaw = (placed.yawDeg * Math.PI) / 180 + district.laneYaw
  const along: Point2 = [Math.sin(yaw), Math.cos(yaw)]
  const across: Point2 = [-along[1], along[0]]
  const slots: Slot[] = []

  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / 2)
    const side = index % 2 === 0 ? -1 : 1
    const spacing = district.id === 'cliff-village' || district.id === 'working-quay' ? 6.2 : 7
    const offset = 5.2 * side
    const centered = row - Math.floor((count + 1) / 4)
    let x = placed.center[0] + along[0] * centered * spacing + across[0] * offset + (rng() - 0.5) * 1.1
    let z = placed.center[1] + along[1] * centered * spacing + across[1] * offset + (rng() - 0.5) * 1.1

    if (district.id === 'drowned-forum') {
      const angle = (index / count) * Math.PI * 1.55 + 0.45
      x = placed.center[0] + Math.cos(angle) * 20
      z = placed.center[1] + Math.sin(angle) * 18
    }

    const sample = sampleTerrain(layout, x, z)
    const overWater = sample.material === 'sea' || sample.material === 'shallows' || sample.material === 'ruin-bed'
    slots.push({
      position: [x, overWater ? layout.seaLevel + 0.08 : sample.height, z],
      yaw: yaw + (rng() - 0.5) * 0.24,
      districtId: district.id,
      index,
      overWater,
    })
  }
  return slots
}

export type PropKind =
  | 'lamp'
  | 'crate'
  | 'amphora'
  | 'olive'
  | 'survey-table'
  | 'buoy'
  | 'market-stall'
  | 'boat'
  | 'mosaic'
  | 'find'

export interface Placement {
  kind: PropKind
  position: [number, number, number]
  yaw: number
  districtId: string
  minBand: number
  knockable: boolean
  index: number
}

const PROP_RECIPES: Record<DistrictDef['id'], Array<[PropKind, number, number]>> = {
  'cliff-village': [['lamp', 6, 3], ['amphora', 5, 2], ['crate', 3, 4]],
  'archaeology-ridge': [['survey-table', 4, 2], ['find', 8, 3], ['lamp', 4, 3]],
  'dry-terraces': [['olive', 12, 2], ['amphora', 4, 3], ['lamp', 4, 3]],
  'drowned-forum': [['buoy', 8, 2], ['mosaic', 4, 1], ['survey-table', 4, 4], ['lamp', 4, 3]],
  'working-quay': [['market-stall', 8, 2], ['crate', 8, 2], ['boat', 4, 3], ['lamp', 6, 3]],
}

export function propPlacements(layout: BiomeLayout, seed: number): Placement[] {
  const plan = seededDistrictPlan(layout, seed)
  const output: Placement[] = []
  for (const district of layout.districts) {
    const rng = seeded(seed * 53 + district.band * 601)
    const center = plan[district.id].center
    let index = 0
    for (const [kind, count, minBand] of PROP_RECIPES[district.id]) {
      for (let n = 0; n < count; n++) {
        const angle = rng() * Math.PI * 2
        const radius = 8 + rng() * (district.id === 'drowned-forum' ? 16 : 11)
        let x = center[0] + Math.cos(angle) * radius
        let z = center[1] + Math.sin(angle) * radius
        if (district.id === 'working-quay' && kind === 'boat') {
          x = 83 + n * 6
          z = 57 + (n % 2) * 4
        }
        const sample = sampleTerrain(layout, x, z)
        output.push({
          kind,
          position: [x, kind === 'boat' || sample.material === 'sea' || sample.material === 'shallows' || sample.material === 'ruin-bed' ? layout.seaLevel + 0.1 : sample.height, z],
          yaw: rng() * Math.PI * 2,
          districtId: district.id,
          minBand,
          knockable: kind !== 'lamp' && kind !== 'mosaic',
          index: index++,
        })
      }
    }
  }
  return output
}

export function visibleProps(placements: Placement[], layout: BiomeLayout, progress: DistrictProgress): Placement[] {
  const bands = new Map<string, number>(layout.districts.map((district) => [district.id, populationFor(district, progress[district.id] ?? 0).band]))
  return placements.filter((placement) => placement.minBand <= (bands.get(placement.districtId) ?? 0))
}

export interface LocalPath {
  districtId: string
  kind: 'lane' | 'stairs' | 'quay' | 'submerged'
  width: number
  points: Array<[number, number, number]>
}

function lifted(layout: BiomeLayout, points: Point2[], lift = 0.05): Array<[number, number, number]> {
  return points.map(([x, z]) => {
    const sample = sampleTerrain(layout, x, z)
    return [x, Math.max(layout.seaLevel, sample.height) + lift, z]
  })
}

export function localPaths(layout: BiomeLayout, seed = 7): LocalPath[] {
  const plan = seededDistrictPlan(layout, seed)
  const paths: LocalPath[] = []
  for (const district of layout.districts) {
    const [cx, cz] = plan[district.id].center
    if (district.id === 'cliff-village') {
      paths.push({ districtId: district.id, kind: 'stairs', width: 3.6, points: lifted(layout, [[cx - 15, cz - 12], [cx - 8, cz - 5], [cx - 14, cz + 2], [cx - 4, cz + 9], [cx + 8, cz + 5], [cx + 15, cz + 12]]) })
    } else if (district.id === 'archaeology-ridge') {
      paths.push({ districtId: district.id, kind: 'lane', width: 3, points: lifted(layout, [[cx - 19, cz + 9], [cx, cz + 5], [cx + 18, cz + 8]]) })
    } else if (district.id === 'dry-terraces') {
      paths.push({ districtId: district.id, kind: 'lane', width: 3.6, points: lifted(layout, [[cx - 18, cz + 12], [cx, cz + 6], [cx + 18, cz + 10]]) })
    } else if (district.id === 'drowned-forum') {
      paths.push({ districtId: district.id, kind: 'submerged', width: 2.4, points: [[cx - 22, layout.seaLevel + 0.03, cz - 10], [cx - 10, layout.seaLevel + 0.03, cz], [cx - 4, layout.seaLevel + 0.03, cz + 13]] })
    } else {
      paths.push({ districtId: district.id, kind: 'quay', width: 4, points: [[cx - 18, 1.1, cz], [cx + 12, 1.1, cz], [cx + 12, 1.1, cz + 18]] })
    }
  }
  return paths
}

export interface ResidentSeat {
  districtId: string
  center: Point2
  radius: number
  phase: number
}

export function residentSeats(layout: BiomeLayout, progress: DistrictProgress, count: number, seed: number): ResidentSeat[] {
  const active = layout.districts.filter((district) => (progress[district.id] ?? 0) > 0)
  if (!active.length) return []
  const plan = seededDistrictPlan(layout, seed)
  const rng = seeded(seed * 17 + count)
  return Array.from({ length: count }, (_, index) => {
    const district = active[index % active.length]
    return { districtId: district.id, center: plan[district.id].center, radius: 3 + rng() * 4, phase: rng() * Math.PI * 2 }
  })
}

export interface SeaStack {
  x: number
  z: number
  height: number
  radius: number
  yaw: number
}

/** Side-only islet stacks. The south/front stays open sea beneath the camera. */
export function seaStacks(): SeaStack[] {
  const groups: Array<[number, number]> = [
    [-145, -72], [-150, -10], [-145, 54],
    [145, -72], [150, -10], [145, 54],
  ]
  return groups.flatMap(([gx, gz], group) =>
    [0, 1, 2].map((index) => ({
      x: gx + Math.sign(gx) * index * 5,
      z: gz + index * 11,
      height: 8 + (2 - index) * 1.4,
      radius: 3.5 - index * 0.45,
      yaw: group * 0.61 + index,
    })),
  )
}

export function nearestProtectedOpenDistance(layout: BiomeLayout, x: number, z: number): number {
  return Math.min(...layout.protectedOpen.map((open) => {
    const dx = Math.max(0, Math.abs(x - open.center[0]) - open.size[0] / 2)
    const dz = Math.max(0, Math.abs(z - open.center[1]) - open.size[1] / 2)
    return Math.hypot(dx, dz)
  }))
}

export function coastDistance(layout: BiomeLayout, x: number, z: number): number {
  return polygonEdgeDistance(layout.coastline, x, z)
}
