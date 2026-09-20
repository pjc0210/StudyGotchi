/**
 * Generic world terrain for layouts loaded from JSON (`layout.world`): one landmass polygon that
 * continues past its back edge into fog, water bodies of several kinds cut into it, a solitary
 * island, the landmark plinth, ground-colour patches, and the district slot grid. Pure functions,
 * no three.js. Ice / Chilly Town keeps its own terrain in `layout/terrain.ts`.
 */
import {
  type BiomeLayout,
  type DistrictDef,
  type TransitLine,
  type WaterBody,
  type WorldSpec,
  districtBounds,
  districtCentre,
  districtCentreline,
  districtField,
  districtRadius,
  maxBuildings,
  pointInPolygon,
  polygonEdgeDistance,
  seeded,
} from '../layout/biome-layout'
import { type Pt, distToPolyline, fbm, pointAlong, polylineLength, smoothstep } from '../layout/geometry'
import type { GroundMaterial, Sample, Slot } from '../layout/terrain'

/* ---------- fields (metres, positive inside) ---------- */

export function polygonField(poly: Pt[], x: number, z: number): number {
  const d = polygonEdgeDistance(poly, x, z)
  return pointInPolygon(poly, x, z) ? d : -d
}

/** Mainland polygon unioned with the back band (land for z < backZ within the back edge's x-range). */
export function mainlandField(world: WorldSpec, x: number, z: number): number {
  const poly = world.mainland
  let f = polygonField(poly, x, z)
  const backXs = poly.filter(([, pz]) => pz <= world.backZ + 0.5).map(([px]) => px)
  if (backXs.length >= 2) {
    const minX = Math.min(...backXs) - 12
    const maxX = Math.max(...backXs) + 12
    const back = Math.min(world.backZ + 1.5 - z, x - minX, maxX - x)
    f = Math.max(f, back)
  }
  if (world.coastWobble > 0) f += fbm(x * 0.05 + 1.3, z * 0.05) * world.coastWobble * 2 + fbm(x * 0.2, z * 0.2, 2) * world.coastWobble * 0.5
  return f
}

export function soloIslandField(world: WorldSpec, x: number, z: number): number {
  if (!world.soloIsland) return -1e6
  let f = polygonField(world.soloIsland.polygon, x, z)
  if (world.coastWobble > 0) f += fbm(x * 0.09, z * 0.09) * world.coastWobble * 1.6
  return f
}

export function plinthField(world: WorldSpec, x: number, z: number): number {
  const lm = world.landmark
  let f = lm.plinthPolygon ? polygonField(lm.plinthPolygon, x, z) : lm.plinthRadius - Math.hypot(x - lm.position[0], z - lm.position[1])
  if (lm.causeway && lm.causeway.length >= 3) f = Math.max(f, polygonField(lm.causeway, x, z))
  return f
}

/** Any land at all: mainland, the solitary island, the landmark plinth / slab. */
export function worldLandField(world: WorldSpec, x: number, z: number): number {
  return Math.max(mainlandField(world, x, z), soloIslandField(world, x, z), plinthField(world, x, z))
}

/** Positive inside a water body. */
export function waterField(body: WaterBody, x: number, z: number): number {
  if (body.polygon) {
    const f = polygonField(body.polygon, x, z)
    return body.innerRadius ? f : f
  }
  if (body.centreline && body.width) {
    let f = body.width / 2 - distToPolyline(body.centreline, x, z).dist
    if (body.innerRadius) {
      // A ring pool: a disc with a dry inner disc (centreline[0] is the centre, width is the diameter).
      const d = Math.hypot(x - body.centreline[0][0], z - body.centreline[0][1])
      f = Math.min(body.width / 2 - d, d - body.innerRadius)
    }
    return f
  }
  return -1e6
}

/** Deepest inland water field at a point (positive inside any inland body). */
export function inlandWaterField(world: WorldSpec, x: number, z: number): number {
  let best = -1e6
  for (const w of world.water) if (w.inland) best = Math.max(best, waterField(w, x, z))
  return best
}

/** Positive where a point is wet: inland water or off the land. */
export function wetField(world: WorldSpec, x: number, z: number): number {
  return Math.max(inlandWaterField(world, x, z), -worldLandField(world, x, z))
}

/** Unit vector from the land toward the nearest water. */
export function toWaterDir(world: WorldSpec, x: number, z: number): Pt {
  const e = 0.75
  const gx = wetField(world, x + e, z) - wetField(world, x - e, z)
  const gz = wetField(world, x, z + e) - wetField(world, x, z - e)
  const len = Math.hypot(gx, gz) || 1
  return [gx / len, gz / len]
}

/* ---------- terrain sample ---------- */

const SEA_FLOOR_DROP = 0.7
const WATER_BED = 0.45
const BANK = 1.6

const GROUND_KEYS: Record<string, GroundMaterial> = {
  ground: 'ground',
  groundAlt: 'groundAlt',
  quayPaving: 'paving',
  paving: 'paving',
  plaza: 'paving',
  lawn: 'lawn',
  tile: 'ground',
  cliff: 'groundAlt',
  slag: 'shore',
  sand: 'groundAlt',
  frosting: 'groundAlt',
  sugar: 'ground',
  mint: 'lawn',
}

/** District ground colour: only ground-like material names repaint the ground; building materials do not. */
export function districtGroundMaterial(district: DistrictDef): GroundMaterial | null {
  return GROUND_KEYS[district.material] ?? null
}

export function sampleWorldTerrain(layout: BiomeLayout, world: WorldSpec, x: number, z: number): Sample {
  const land = worldLandField(world, x, z)
  const seaBed = layout.seaLevel - SEA_FLOOR_DROP
  const sea: Sample = { height: seaBed, material: 'sea', peakFrac: 0, mountainRow: 0, districtId: null }
  const blend = world.coast === 'plush' ? 5 : world.coast === 'cliff' ? 1.6 : 0.9
  if (land < -blend) return sea

  let flat = 0
  let districtId: string | null = null
  let material: GroundMaterial = 'ground'
  for (const d of layout.districts) {
    const f = districtField(d, x, z)
    const k = smoothstep(-3, 3, f)
    if (k > flat) flat = k
    if (f > 0) {
      districtId = d.id
      const m = districtGroundMaterial(d)
      if (m) material = m
    }
  }
  for (const p of world.patches) if (pointInPolygon(p.polygon, x, z)) material = p.material

  const relief = layout.relief * 1.4 * fbm(x * 0.05, z * 0.05) * (1 - flat)
  let ground = layout.groundHeight + relief

  // Landmark plinth: the terrain lifts a little so the plinth disc sits on a headland, not a slope.
  const plinth = plinthField(world, x, z)
  if (plinth > 0) {
    material = 'plinth'
    ground = layout.groundHeight + 0.1
  }

  // Inland water: a channel cut with soft banks.
  let wet = -1e6
  for (const w of world.water) {
    if (!w.inland) continue
    const f = waterField(w, x, z)
    if (f > wet) wet = f
  }
  if (wet > -BANK) {
    const cut = smoothstep(-BANK, 0.4, wet)
    ground = ground * (1 - cut) + (layout.seaLevel - WATER_BED) * cut
    if (wet > 0) material = 'water'
    else if (material !== 'paving') material = 'bank'
  }

  const landK = smoothstep(0, blend, land)
  const height = seaBed + (ground - seaBed) * landK
  if (landK < 0.5) {
    return { height, material: height < layout.seaLevel + 0.05 ? 'sea' : material === 'water' ? 'water' : 'ground', peakFrac: 0, mountainRow: 0, districtId }
  }
  return { height, material, peakFrac: 0, mountainRow: 0, districtId }
}

/* ---------- slots ---------- */

export interface SlotHints {
  /** Building pitch along the lane and depth across it, metres. */
  along: number
  across: number
  /** Half-width of the free lane down the district's centreline. */
  laneHalf: number
  /** Rows each side of the lane. */
  rows: number
  /** Ring placement around the anchor instead of rows. */
  ring?: number
}

const DEFAULT_HINTS: SlotHints = { along: 7.5, across: 6.5, laneHalf: 3, rows: 2 }

const HINTS: Record<string, SlotHints> = {
  // academy
  'dorm-block': { along: 19, across: 9, laneHalf: 4, rows: 1 },
  'lecture-hall': { along: 16, across: 13, laneHalf: 13, rows: 1 },
  'corridor-hall': { along: 14, across: 11, laneHalf: 4.5, rows: 1 },
  townhouse: { along: 9.5, across: 8, laneHalf: 6, rows: 2 },
  observatory: { along: 12, across: 10, laneHalf: 2, rows: 1 },
  // industry
  warehouse: { along: 13, across: 10, laneHalf: 4, rows: 2 },
  'furnace-hall': { along: 14, across: 11, laneHalf: 4, rows: 2 },
  'terrace-house': { along: 7.5, across: 6.5, laneHalf: 3.5, rows: 3 },
  tank: { along: 14, across: 12, laneHalf: 4, rows: 2 },
  'pump-shed': { along: 8, across: 7, laneHalf: 3, rows: 1 },
  // utopia
  'canal-house': { along: 7.5, across: 6.5, laneHalf: 7.5, rows: 2 },
  'civic-block': { along: 13, across: 11, laneHalf: 6, rows: 2 },
  'greenhouse-pod': { along: 8, across: 7, laneHalf: 2, rows: 2 },
  // candy
  'gumdrop-house': { along: 7.5, across: 6.5, laneHalf: 3.5, rows: 2 },
  'wafer-house': { along: 9, across: 7.5, laneHalf: 4, rows: 2 },
  'cupcake-tower': { along: 11, across: 9, laneHalf: 5, rows: 2 },
  'lollipop-cottage': { along: 8, across: 7, laneHalf: 3.5, rows: 2 },
  'parfait-hut': { along: 7, across: 6, laneHalf: 2.5, rows: 2 },
}

export function slotHints(building: string): SlotHints {
  return HINTS[building] ?? DEFAULT_HINTS
}

/** Clear radius around each anchor kind (buildings and props keep out). */
export function anchorClearance(district: DistrictDef): number {
  switch (district.anchorKind) {
    case 'dock-chapel':
      return 7
    case 'court-axis':
    case 'arcade':
    case 'canal-bridges':
      return 0
    case 'portal-fountain':
      return 11
    case 'observatory':
      return 7
    case 'quay-crane':
      return 9
    case 'blast-furnace':
      return 9
    case 'water-tower':
      return 8
    case 'tank-trio':
      return 15
    case 'walking-beam':
      return 8
    case 'transit-hub':
      return 12
    case 'lens-dome':
      return 17
    case 'mooring-mast':
      return 10
    case 'garden-dome':
      return 12
    case 'sundae-fountain':
      return 8
    case 'candy-gate':
      return 8
    case 'cupcake-stand':
      return 9
    case 'lollipop-ring':
      return 10
    case 'gumdrop-well':
      return 6
    default:
      return 5
  }
}

export function worldAnchorPoint(district: DistrictDef): Pt {
  return district.anchorPosition ?? districtCentre(district)
}

/** Distance from a point to the nearest transit / road / rail line's edge (negative inside). */
export function transitClearance(world: WorldSpec, x: number, z: number, lines?: TransitLine[]): number {
  let best = 1e6
  for (const t of lines ?? world.transit) {
    if (t.height > 3) continue // elevated lines pass over buildings; only their pylons need room
    const pts = t.closed ? [...t.points, t.points[0]] : t.points
    best = Math.min(best, distToPolyline(pts, x, z).dist - t.width / 2)
  }
  return best
}

function pylonPoints(line: TransitLine, every = 14): Pt[] {
  const pts = line.closed ? [...line.points, line.points[0]] : line.points
  const total = polylineLength(pts)
  const out: Pt[] = []
  for (let s = 0; s < total; s += every) {
    const p = pointAlong(pts, s)
    out.push([p.x, p.z])
  }
  return out
}

export function pylons(world: WorldSpec): Array<{ line: TransitLine; points: Pt[] }> {
  return world.transit.filter((t) => t.height > 3).map((line) => ({ line, points: pylonPoints(line) }))
}

/**
 * Fixed slot order per district from a rotated grid: rows either side of the lane (the strip's
 * centreline, or a synthesised line through a polygon's centroid along `laneYaw`), inner rows
 * first, nearest the anchor first. Slots avoid water, the anchor, transit lines and each other.
 */
export function worldSlots(layout: BiomeLayout, world: WorldSpec, district: DistrictDef): Slot[] {
  const n = maxBuildings(district)
  if (n === 0) return []
  const hints = slotHints(district.building)
  const rng = seeded(district.band * 101 + 5)
  const [ax, az] = worldAnchorPoint(district)
  const clear = anchorClearance(district)
  const pylonPts = pylons(world).flatMap((p) => p.points)

  let line = districtCentreline(district)
  if (district.shape.kind === 'polygon') {
    // Extend the synthesised line to the polygon's full extent along the lane.
    const [cx, cz] = districtCentre(district)
    const r = districtRadius(district) * 1.1
    const dx = Math.sin(district.laneYaw)
    const dz = Math.cos(district.laneYaw)
    line = [
      [cx - dx * r, cz - dz * r],
      [cx + dx * r, cz + dz * r],
    ]
  }
  const total = polylineLength(line)
  const candidates: Array<{ x: number; z: number; yaw: number; rank: number }> = []
  // Buildings may stand close to the district edge (the edge is the plot line, not a margin).
  const inset = Math.min(hints.across * 0.45, 2.0)
  const bounds = districtBounds(district)
  // Rows step half a building depth apart: overlapping candidates, thinned by the min-gap filter,
  // so the grid still fills where the lane, a road or the coast forbids the nominal row positions.
  const rowStep = (hints.across + 1.5) * 0.5
  const halfExtent = district.shape.kind === 'strip' ? district.shape.width / 2 : districtRadius(district)
  const maxRows = Math.max(hints.rows, Math.ceil((halfExtent - hints.laneHalf) / rowStep) + 1)

  for (let row = 0; row < maxRows; row++) {
    const offset = hints.laneHalf + hints.across / 2 + row * rowStep
    const count = Math.max(1, Math.floor((total - hints.along * 0.6) / hints.along))
    for (let i = 0; i <= count; i++) {
      const stagger = row % 2 === 1 ? hints.along * 0.5 : 0
      const s = hints.along * 0.5 + i * hints.along + stagger + (rng() - 0.5) * hints.along * 0.15
      if (s > total - hints.along * 0.3) continue
      const p = pointAlong(line, s)
      const nx = -p.dz
      const nz = p.dx
      for (const side of [1, -1]) {
        const jitter = (rng() - 0.5) * 0.8
        const x = p.x + nx * (offset * side + jitter)
        const z = p.z + nz * (offset * side + jitter)
        if (x < bounds.minX - 2 || x > bounds.maxX + 2 || z < bounds.minZ - 2 || z > bounds.maxZ + 2) continue
        const yaw = Math.atan2(-nx * side, -nz * side)
        candidates.push({ x, z, yaw, rank: row * 1000 + Math.hypot(x - ax, z - az) })
      }
    }
  }
  if (hints.ring) {
    const m = n * 2
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2 + 0.3
      const r = hints.ring + (i % 2) * 2
      const x = ax + Math.cos(a) * r
      const z = az + Math.sin(a) * r
      candidates.push({ x, z, yaw: Math.atan2(ax - x, az - z), rank: i })
    }
  }

  candidates.sort((a, b) => a.rank - b.rank)
  const out: Slot[] = []
  const minGap = Math.min(hints.along, hints.across) * 0.85
  for (const c of candidates) {
    if (out.length >= n) break
    if (districtField(district, c.x, c.z) < inset) continue
    if (worldLandField(world, c.x, c.z) < hints.across * 0.5 + 0.5) continue
    if (inlandWaterField(world, c.x, c.z) > -(hints.across * 0.5 + 1.5)) continue
    if (Math.hypot(c.x - ax, c.z - az) < clear + hints.across * 0.5) continue
    if (transitClearance(world, c.x, c.z) < hints.across * 0.3) continue
    if (pylonPts.some(([px, pz]) => Math.hypot(px - c.x, pz - c.z) < hints.across * 0.5 + 1)) continue
    if (out.some((o) => Math.hypot(o.position[0] - c.x, o.position[2] - c.z) < minGap)) continue
    const s = sampleWorldTerrain(layout, world, c.x, c.z)
    if (s.material === 'sea' || s.material === 'water' || s.material === 'plinth') continue
    out.push({ position: [c.x, s.height, c.z], yaw: c.yaw, districtId: district.id, index: out.length })
  }
  return out
}

/* ---------- lanes, bridges, line geometry ---------- */

export interface WorldPath {
  districtId: string | null
  kind: 'lane' | 'axis' | 'quay' | 'road' | 'path'
  points: Array<[number, number, number]>
  width: number
  minBand: number
  colour: 'paving' | 'road' | 'lawn'
}

function lift(layout: BiomeLayout, pts: Pt[], dy: number): Array<[number, number, number]> {
  return pts.map(([x, z]) => {
    const s = layout.world ? sampleWorldTerrain(layout, layout.world, x, z) : null
    return [x, Math.max(layout.seaLevel + 0.3, s?.height ?? layout.groundHeight) + dy, z]
  })
}

/** One paved lane per district along its centreline (the plaza axis, the quay, the arcade lane). */
export function worldPaths(layout: BiomeLayout, world: WorldSpec): WorldPath[] {
  const out: WorldPath[] = []
  for (const d of layout.districts) {
    const hints = slotHints(d.building)
    let line = districtCentreline(d)
    if (d.shape.kind === 'polygon') {
      const [cx, cz] = districtCentre(d)
      const r = districtRadius(d) * 0.9
      const dx = Math.sin(d.laneYaw)
      const dz = Math.cos(d.laneYaw)
      line = [
        [cx - dx * r, cz - dz * r],
        [cx + dx * r, cz + dz * r],
      ]
    }
    // Trim the lane to the land.
    const pts: Pt[] = []
    const total = polylineLength(line)
    for (let s = 0; s <= total; s += 2.5) {
      const p = pointAlong(line, s)
      if (worldLandField(world, p.x, p.z) > 1.5 && districtField(d, p.x, p.z) > -1) pts.push([p.x, p.z])
    }
    if (pts.length < 2) continue
    const width = d.anchorKind === 'court-axis' ? 4 : d.anchorKind === 'arcade' ? 4 : Math.min(4, hints.laneHalf * 0.9)
    out.push({ districtId: d.id, kind: d.anchorKind === 'court-axis' ? 'axis' : 'lane', points: lift(layout, pts, 0.06), width, minBand: 0, colour: 'paving' })
  }
  for (const t of world.transit) {
    if (t.kind !== 'road' && t.kind !== 'causeway' && t.kind !== 'path') continue
    const pts = t.closed ? [...t.points, t.points[0]] : t.points
    const dense: Pt[] = []
    const total = polylineLength(pts)
    for (let s = 0; s <= total; s += 2.5) {
      const p = pointAlong(pts, s)
      dense.push([p.x, p.z])
    }
    out.push({ districtId: null, kind: t.kind === 'road' ? 'road' : 'path', points: lift(layout, dense, 0.05), width: t.width, minBand: t.minBand, colour: t.kind === 'road' ? 'road' : 'paving' })
  }
  return out
}

export interface BridgeSpan {
  /** Deck from `a` to `b` over water, in metres; `yaw` along the deck. */
  a: Pt
  b: Pt
  length: number
  yaw: number
  width: number
  kind: TransitLine['kind']
  minBand: number
}

/** Where ground-level lines (roads, causeways, paths, rails) cross water: one span per crossing. */
export function bridgeSpans(world: WorldSpec): BridgeSpan[] {
  const out: BridgeSpan[] = []
  for (const t of world.transit) {
    if (t.height > 3) continue
    const pts = t.closed ? [...t.points, t.points[0]] : t.points
    const total = polylineLength(pts)
    let start: Pt | null = null
    for (let s = 0; s <= total + 0.5; s += 0.5) {
      const p = pointAlong(pts, Math.min(total, s))
      const wet = wetField(world, p.x, p.z) > -0.4
      if (wet && !start) start = [p.x, p.z]
      if ((!wet || s >= total) && start) {
        const end: Pt = [p.x, p.z]
        const len = Math.hypot(end[0] - start[0], end[1] - start[1])
        if (len > 2) {
          const dx = (end[0] - start[0]) / len
          const dz = (end[1] - start[1]) / len
          const a: Pt = [start[0] - dx * 1.5, start[1] - dz * 1.5]
          const b: Pt = [end[0] + dx * 1.5, end[1] + dz * 1.5]
          out.push({ a, b, length: len + 3, yaw: Math.atan2(dx, dz), width: t.width, kind: t.kind, minBand: t.minBand })
        }
        start = null
      }
    }
  }
  return out
}

/** 3-D points for a line: ground-following (plus `height`) or a flat deck at ground + height. */
export function linePoints3(layout: BiomeLayout, line: TransitLine, step = 2): Array<[number, number, number]> {
  const pts = line.closed ? [...line.points, line.points[0]] : line.points
  const total = polylineLength(pts)
  const out: Array<[number, number, number]> = []
  for (let s = 0; s <= total; s += step) {
    const p = pointAlong(pts, Math.min(total, s))
    const smp = layout.world ? sampleWorldTerrain(layout, layout.world, p.x, p.z) : null
    const ground = Math.max(layout.seaLevel, smp?.height ?? layout.groundHeight)
    out.push([p.x, (line.height > 3 ? layout.groundHeight : ground) + line.height + 0.05, p.z])
  }
  if (out.length && !line.closed) {
    const [lx, lz] = pts[pts.length - 1]
    const smp = layout.world ? sampleWorldTerrain(layout, layout.world, lx, lz) : null
    out[out.length - 1] = [lx, (line.height > 3 ? layout.groundHeight : Math.max(layout.seaLevel, smp?.height ?? layout.groundHeight)) + line.height + 0.05, lz]
  }
  return out
}

/** Shoreline points of a polygon district facing the water (for docks, quays and stilt rows). */
export function shorePoints(world: WorldSpec, district: DistrictDef, step = 4): Array<{ x: number; z: number; dir: Pt }> {
  const b = districtBounds(district)
  const out: Array<{ x: number; z: number; dir: Pt }> = []
  for (let x = b.minX; x <= b.maxX; x += step) {
    for (let z = b.minZ; z <= b.maxZ; z += step) {
      if (districtField(district, x, z) < -2) continue
      const land = worldLandField(world, x, z)
      if (land < 1.5 || land > 1.5 + step) continue
      out.push({ x, z, dir: toWaterDir(world, x, z) })
    }
  }
  return out
}
