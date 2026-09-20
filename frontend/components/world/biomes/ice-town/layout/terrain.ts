import {
  type BiomeLayout,
  type DistrictDef,
  type DistrictProgress,
  type MountainProfile,
  districtBounds,
  districtCentre,
  districtCentreline,
  districtField,
  districtRadius,
  maxBuildings,
  populationFor,
  seeded,
} from './biome-layout'

import { distToPolyline, fbm, hash2, pointAlong, polylineCrossings, polylineLength, smoothstep } from './geometry'
import { sampleWorldTerrain, worldSlots } from '../world/world-terrain'

export { distToPolyline, fbm, pointAlong, polylineCrossings, polylineLength, smoothstep }

/* ---------- noise ---------- */

/** Worley F1/F2 on a grid of `cell` metres: plates are cells, seams are where F2 − F1 is small. */
function worley(x: number, z: number, cell: number): { f1: number; f2: number } {
  const px = x / cell
  const pz = z / cell
  const ix = Math.floor(px)
  const iz = Math.floor(pz)
  let f1 = Number.POSITIVE_INFINITY
  let f2 = Number.POSITIVE_INFINITY
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx
      const cz = iz + dz
      const fx = cx + 0.05 + 0.9 * hash2(cx * 3.1, cz * 7.3)
      const fz = cz + 0.05 + 0.9 * hash2(cx * 5.7, cz * 2.9)
      const d = Math.hypot(fx - px, fz - pz) * cell
      if (d < f1) {
        f2 = f1
        f1 = d
      } else if (d < f2) {
        f2 = d
      }
    }
  }
  return { f1, f2 }
}

/* ---------- land fields (metres: positive inside) ---------- */

/** Wobbly blob: positive inside, metres. Three harmonics plus fbm so no edge is a circle. */
function blobField(cx: number, cz: number, radius: number, x: number, z: number, phase: number): number {
  const dx = x - cx
  const dz = z - cz
  const angle = Math.atan2(dz, dx)
  const wobble = 1 + 0.1 * Math.sin(angle * 3 + phase) + 0.06 * Math.sin(angle * 5 - phase * 0.7) + 0.04 * Math.sin(angle * 7 + 1.1)
  return radius * wobble + fbm(x * 0.03 + phase, z * 0.03) * radius * 0.16 - Math.hypot(dx, dz)
}

/** Centre line of the range: a curved arc whose ends wrap forward around the north-west and north-east. */
export function rangeArcZ(layout: BiomeLayout, x: number): number {
  return layout.range.arcZ + layout.range.arcCurve * x * x
}

/** Where the back land begins (in front of the arc), wandering ±18 m with noise. */
export function backBoundaryZ(layout: BiomeLayout, x: number): number {
  return rangeArcZ(layout, x) + layout.range.footDepth + fbm(x * 0.016, 5.1) * 56 + fbm(x * 0.06, 8.3) * 12
}

/** The mainland lobes alone (no back land): used as the shelf's inner coast. */
export function mainlandBlob(layout: BiomeLayout, x: number, z: number): number {
  const { center, rx, rz, lobes } = layout.mainland
  const dx = x - center[0]
  const dz = z - center[1]
  const angle = Math.atan2(dz, dx)
  const r = Math.hypot(dx / rx, dz / rz) * rx
  const wobble = 1 + 0.09 * Math.sin(angle * 3 - 1.0) + 0.05 * Math.sin(angle * 5 + 0.4) + 0.035 * Math.sin(angle * 7 + 2.0)
  let field = rx * wobble + fbm(x * 0.025, z * 0.025) * 14 - r
  lobes.forEach(([lx, lz, lr], i) => {
    field = Math.max(field, blobField(lx, lz, lr, x, z, i * 1.7 + 0.4))
  })
  return field
}

/**
 * Mainland lobes unioned with the back land: a noise-warped half-plane in front of the range whose
 * boundary wanders ±18 m, tapering into fogged sea at the far east and west.
 */
export function mainlandField(layout: BiomeLayout, x: number, z: number): number {
  // The back land ends east and west in two huge wobbly capes (not straight tapers), so even the
  // fogged far corners are curved coastline.
  const capeZ = layout.range.arcZ - 22
  const capes = Math.max(blobField(-62, capeZ, 92, x, z, 2.3), blobField(64, capeZ, 96, x, z, 4.1))
  const back = Math.min(backBoundaryZ(layout, x) - z, capes)
  return Math.max(mainlandBlob(layout, x, z), back)
}

export function headlandField(layout: BiomeLayout, x: number, z: number): number {
  const { center, radius } = layout.headland
  const d = Math.hypot(x - center[0], z - center[1])
  return radius + fbm(x * 0.2, z * 0.2) * 1.6 - d
}

export function miniIslandField(layout: BiomeLayout, x: number, z: number): number {
  const { center, radius } = layout.miniIsland
  const d = Math.hypot(x - center[0], z - center[1])
  return radius + fbm(x * 0.12, z * 0.12) * 2.4 - d
}

/** Glacier shelf band west of the mainland; positive inside the shelf footprint (plates and seams). */
export function shelfField(layout: BiomeLayout, x: number, z: number): number {
  // The shelf hugs the mainland's west coast (organic), so it is only defined west of the lobes.
  const west = Math.min(-mainlandBlob(layout, x, z) + 6, layout.mainland.center[0] - 30 - x)
  const outer = x - layout.shelfEndX + fbm(z * 0.03, 5.5) * 16
  const front = 44 - z + fbm(x * 0.03, 1.7) * 16
  return Math.min(west, outer, front)
}

/** Any land at all (mainland, headland, mini island); positive inside. */
export function landField(layout: BiomeLayout, x: number, z: number): number {
  return Math.max(mainlandField(layout, x, z), headlandField(layout, x, z), miniIslandField(layout, x, z))
}

/** Unit vector pointing from the land toward the sea (down the land-field gradient). */
export function seawardNormal(layout: BiomeLayout, x: number, z: number): [number, number] {
  const e = 0.5
  const gx = mainlandField(layout, x + e, z) - mainlandField(layout, x - e, z)
  const gz = mainlandField(layout, x, z + e) - mainlandField(layout, x, z - e)
  const len = Math.hypot(gx, gz) || 1
  return [-gx / len, -gz / len]
}

/** Walk from a land point along the seaward normal until the land field reaches `target`. */
export function walkToLand(layout: BiomeLayout, x: number, z: number, target: number, maxSteps = 240): [number, number] {
  let px = x
  let pz = z
  for (let i = 0; i < maxSteps; i++) {
    const f = mainlandField(layout, px, pz)
    if (Math.abs(f - target) < 0.15) break
    const [nx, nz] = seawardNormal(layout, px, pz)
    const step = Math.min(1.0, Math.abs(f - target) * 0.6) * (f > target ? 1 : -1)
    px += nx * step
    pz += nz * step
  }
  return [px, pz]
}

/* ---------- mountains ---------- */

export interface Shoulder {
  /** Offset from the peak centre, metres. */
  dx: number
  dz: number
  radius: number
  height: number
}

export interface Peak {
  x: number
  z: number
  height: number
  radius: number
  row: 1 | 2 | 3
  /** Cone exponent: 1 is a straight cone, higher is a spire with a flared base. */
  sharp: number
  /** Three or four low secondary cones that jag the silhouette. */
  shoulders: Shoulder[]
}

interface RowSpec {
  row: 1 | 2 | 3
  /** Distance behind the arc centre line. */
  back: number
  /** Peak spacing along x; bases overlap 30–50 % because radii ≈ 0.75–0.9 of it. */
  spacing: number
  offset: number
  count: number
  height: [number, number]
  radius: [number, number]
}

const ROWS: RowSpec[] = [
  { row: 1, back: 0, spacing: 24, offset: 0, count: 9, height: [22, 34], radius: [20, 24] },
  { row: 2, back: 22, spacing: 25, offset: 12, count: 8, height: [30, 42], radius: [22, 28] },
  { row: 3, back: 46, spacing: 29, offset: -4, count: 8, height: [36, 50], radius: [26, 32] },
]

/** Front-row reveal order: middle first, then alternating outward so 3 peaks already read as a range. */
const FRONT_ORDER = [4, 1, 7, 2, 6, 3, 5, 0, 8]

function buildRow(layout: BiomeLayout, spec: RowSpec): Peak[] {
  const rng = seeded(1000 + spec.row * 77)
  const out: Peak[] = []
  for (let i = 0; i < spec.count; i++) {
    const x = (i - (spec.count - 1) / 2) * spec.spacing + spec.offset + (rng() - 0.5) * 9
    const z = rangeArcZ(layout, x) - spec.back + (rng() - 0.5) * 10
    // Every third peak is a hero: taller and sharper, so the skyline has notches between them.
    // The pattern shifts per row so heroes do not line up front to back.
    const hero = (i + spec.row) % 3 === 2
    const height = spec.height[0] + (hero ? 0.75 + rng() * 0.25 : rng() * 0.6) * (spec.height[1] - spec.height[0])
    const radius = spec.radius[0] + rng() * (spec.radius[1] - spec.radius[0])
    const sharp = hero ? 1.45 + rng() * 0.35 : 1.15 + rng() * 0.3
    const n = 3 + (rng() < 0.5 ? 1 : 0)
    const shoulders: Shoulder[] = []
    for (let s = 0; s < n; s++) {
      const a = (s / n) * Math.PI * 2 + rng() * 1.2
      const d = radius * (0.6 + rng() * 0.35)
      shoulders.push({ dx: Math.cos(a) * d, dz: Math.sin(a) * d, radius: radius * (0.4 + rng() * 0.25), height: height * (0.42 + rng() * 0.24) })
    }
    out.push({ x, z, height, radius, row: spec.row, sharp, shoulders })
  }
  return out
}

/** Peaks active for a mountain profile (plan §3: count and height grow with the course fraction). */
export function mountainPeaks(layout: BiomeLayout, profile: MountainProfile): Peak[] {
  const front = buildRow(layout, ROWS[0])
  const scale = (p: Peak): Peak => ({
    ...p,
    height: p.height * profile.heightScale,
    radius: p.radius * (0.75 + 0.25 * profile.heightScale),
    shoulders: p.shoulders.map((s) => ({ ...s, height: s.height * profile.heightScale })),
  })
  const out: Peak[] = FRONT_ORDER.slice(0, profile.peaks).map((i) => scale(front[i]))
  if (profile.secondRow) out.push(...buildRow(layout, ROWS[1]).map(scale))
  if (profile.thirdRow) out.push(...buildRow(layout, ROWS[2]).map(scale))
  return out
}

function cone(h: number, r: number, d: number, sharp = 1.1): number {
  const k = Math.max(0, 1 - d / r)
  return h * Math.pow(k, sharp)
}

export type MountainRow = 0 | 1 | 2 | 3

/** Peaks alone (the foothill belt underneath is added by the terrain sample). */
function mountainHeight(peaks: Peak[], x: number, z: number): { height: number; peakFrac: number; row: MountainRow } {
  let max = 0
  let sum = 0
  let dominant = 1
  let row: MountainRow = 0
  const jag = 1 + fbm(x * 0.09, z * 0.09, 2) * 0.45
  // Ridged creases: 1 − |fbm| has sharp maxima, so the flanks fold into ridge lines and gullies
  // instead of reading as smooth cones.
  const ridged = 1 - Math.abs(fbm(x * 0.07, z * 0.07, 3)) * 2.2
  const crease = 0.74 + 0.3 * Math.max(0, ridged)
  for (const p of peaks) {
    const dx = x - p.x
    const dz = z - p.z
    if (Math.abs(dx) > p.radius * 1.5 || Math.abs(dz) > p.radius * 1.5) continue
    let h = cone(p.height, p.radius, Math.hypot(dx, dz) * jag, p.sharp)
    // Shoulders are straighter cones than the spire so they read as separate sub-peaks.
    for (const s of p.shoulders) h = Math.max(h, cone(s.height, s.radius, Math.hypot(dx - s.dx, dz - s.dz) * jag, 1.0))
    h *= crease
    if (h > max) {
      max = h
      dominant = p.height
      row = p.row
    }
    sum += h
  }
  // Mostly a max: saddles stay V-shaped, only a little fill so bases still merge.
  const height = max + (sum - max) * 0.15
  return { height, peakFrac: max > 0 ? max / dominant : 0, row }
}

/** Foothill belt: from ~1 m at the back-land boundary to ~footRise m some 25–40 m in, with relief. */
export function foothill(layout: BiomeLayout, x: number, z: number): { k: number; height: number; rock: number } {
  const depth = backBoundaryZ(layout, x) - z
  if (depth < -6) return { k: 0, height: 0, rock: 0 }
  const k = smoothstep(2, 34, depth)
  const relief = fbm(x * 0.045, z * 0.045, 3) * (1.5 + 4 * k)
  // Rock outcrops break through the snow across the belt (denser toward the peaks): lavender
  // knuckles 1–3 m high wherever the ridged noise crests.
  const rockN = fbm(x * 0.13 + 3.3, z * 0.13, 3)
  const threshold = 0.13 - 0.05 * k
  const rock = k > 0.1 && rockN > threshold ? (rockN - threshold) * 9 : 0
  return { k, height: k * layout.range.footRise + relief * k + rock, rock }
}

/* ---------- terrain sample ---------- */

/** Ice materials plus the generic world's: ground, lawn, paving, inland water and its bank, slag / shore, plinth. */
export type GroundMaterial =
  | 'sea'
  | 'snow'
  | 'ice'
  | 'lake'
  | 'openWater'
  | 'rock'
  | 'mountain'
  | 'river'
  | 'riverBank'
  | 'ground'
  | 'groundAlt'
  | 'lawn'
  | 'paving'
  | 'water'
  | 'bank'
  | 'shore'
  | 'plinth'

export interface Sample {
  height: number
  material: GroundMaterial
  /** 0 off the mountains; on them, this point's height as a fraction of the dominant peak. */
  peakFrac: number
  /** Row of the dominant peak (0 off the mountains); the back rows are hazed paler. */
  mountainRow: MountainRow
  /** District whose shape contains the point. */
  districtId: string | null
}

const SEA_FLOOR_DROP = 0.7
/** River channel depth below the surrounding snow and the bank width either side. */
const RIVER_DEPTH = 0.8
const RIVER_BANK = 2.2

export function districtAt(layout: BiomeLayout, x: number, z: number): DistrictDef | null {
  for (const d of layout.districts) if (districtField(d, x, z) > 0) return d
  return null
}

function harbour(layout: BiomeLayout): DistrictDef | undefined {
  return layout.districts.find((d) => d.id === 'harbour')
}

/** 1 inside the harbour district fading to 0 ten metres outside it: where the coast is a slope. */
export function harbourShoreMask(layout: BiomeLayout, x: number, z: number): number {
  const h = harbour(layout)
  if (!h) return 0
  return smoothstep(-10, 1, districtField(h, x, z))
}

/** The quay rise persists inland past the district so the beach climbs to a shelf, not a berm. */
function harbourRiseMask(layout: BiomeLayout, x: number, z: number): number {
  const h = harbour(layout)
  if (!h) return 0
  return smoothstep(-34, -4, districtField(h, x, z))
}

/** Land depth averaged over a 9-point, ±5 m stencil: the coast's shape without its metre-scale wobble. */
function smoothLandDepth(layout: BiomeLayout, x: number, z: number, centre: number): number {
  const e = 5
  let sum = centre
  for (const [ox, oz] of [
    [e, 0],
    [-e, 0],
    [0, e],
    [0, -e],
    [e * 0.7, e * 0.7],
    [-e * 0.7, e * 0.7],
    [e * 0.7, -e * 0.7],
    [-e * 0.7, -e * 0.7],
  ]) sum += landField(layout, x + ox, z + oz)
  return sum / 9
}

/**
 * The single heightfield. Districts never change it by progress (plan §3); only the mountain
 * profile does. `profile` defaults to the 0 % range so callers that only care about the ground
 * can omit it.
 */
export function sampleTerrain(layout: BiomeLayout, x: number, z: number, profile?: MountainProfile, peaks?: Peak[]): Sample {
  if (layout.world) return sampleWorldTerrain(layout, layout.world, x, z)
  const land = landField(layout, x, z)
  const shelf = land > 0 ? -1 : shelfField(layout, x, z)
  const sea: Sample = { height: layout.seaLevel - SEA_FLOOR_DROP, material: 'sea', peakFrac: 0, mountainRow: 0, districtId: null }
  if (land < -2.5 && shelf < -2.5) return sea

  // District footprints: calm the relief to flat inside them (smooth over ±3 m of the boundary).
  let flat = 0
  let districtId: string | null = null
  for (const d of layout.districts) {
    const f = districtField(d, x, z)
    const k = smoothstep(-3, 3, f)
    if (k > flat) flat = k
    if (f > 0) districtId = d.id
  }

  let material: GroundMaterial = 'snow'
  let height: number
  let peakFrac = 0
  let mountainRow: MountainRow = 0

  if (land > -2.5) {
    const shore = harbourShoreMask(layout, x, z)
    const rise = harbourRiseMask(layout, x, z)
    // The land field wobbles with noise, so along a straight line inland it is not monotonic; the
    // harbour beach climbs on a low-passed depth so the slope is one clean incline, no dips.
    const depth = shore > 0 || rise > 0 ? smoothLandDepth(layout, x, z, land) : land
    const cliffK = smoothstep(0, 1.6, land)
    // Harbour: the coast is a beach that climbs from the water over `slopeLength` metres.
    const slopeK = smoothstep(-2.5, layout.harbourShore.slopeLength - 2.5, depth)
    const landK = cliffK * (1 - shore) + slopeK * shore
    const relief = layout.relief * 1.4 * fbm(x * 0.05, z * 0.05) * (1 - flat)
    let ground = layout.groundHeight + relief + layout.harbourShore.rise * smoothstep(2, layout.harbourShore.slopeLength, depth) * rise

    // Headland rock: a taller ice rock for the landmark.
    const head = headlandField(layout, x, z)
    if (head > 0) ground += 1.3 * smoothstep(0, layout.headland.radius * 0.7, head)

    // Pink-lavender outcrop with the ice cave.
    const { center: oc, radius: orad, height: oh } = layout.outcrop
    const od = Math.hypot(x - oc[0], z - oc[1]) * (1 + fbm(x * 0.15, z * 0.15) * 0.4)
    const ok = 1 - smoothstep(orad * 0.25, orad, od)
    if (ok > 0) {
      ground += oh * ok
      if (ok > 0.3) material = 'rock'
    }

    // Frozen lake with open-water patches.
    const { center: lc, radius: lr, openWater } = layout.lake
    const ld = Math.hypot(x - lc[0], z - lc[1])
    const lakeK = 1 - smoothstep(lr - 1.6, lr + 0.6, ld)
    if (lakeK > 0) {
      ground = ground * (1 - lakeK) + (layout.groundHeight - 0.35) * lakeK
      if (lakeK > 0.5) material = 'lake'
      for (const [px, pz, pr] of openWater) {
        const pk = 1 - smoothstep(pr - 0.5, pr + 0.4, Math.hypot(x - px, z - pz))
        if (pk > 0) {
          ground = ground * (1 - pk) + (layout.groundHeight - 0.75) * pk
          if (pk > 0.5) material = 'openWater'
        }
      }
    }

    // Foothill belt behind the back-land boundary; the range grows out of it. Districts calm it.
    const foot = foothill(layout, x, z)
    if (foot.k > 0) {
      ground += foot.height * (1 - flat * 0.85)
      if (foot.rock > 0.25 && material === 'snow' && flat < 0.5) material = 'rock'
    }
    if (profile && foot.k > 0.05) {
      const m = mountainHeight(peaks ?? mountainPeaks(layout, profile), x, z)
      if (m.height > 0.2) {
        ground += m.height * Math.min(1, foot.k * 1.6)
        peakFrac = m.peakFrac
        if (m.height > 3) {
          material = 'mountain'
          mountainRow = m.row
        }
      }
    }

    // River: an open teal channel cut into the snow with pale banks, from the foothills into the lake.
    if (lakeK < 0.5 && material !== 'mountain') {
      const { dist, t } = distToPolyline(layout.river, x, z)
      const half = (layout.riverWidth / 2) * (0.55 + 0.45 * smoothstep(0.05, 0.3, t))
      if (dist < half + RIVER_BANK) {
        const cut = 1 - smoothstep(half - 0.4, half + RIVER_BANK, dist)
        ground -= RIVER_DEPTH * (0.35 + 0.65 * cut)
        if (dist < half) material = 'river'
        else if (material === 'snow') material = 'riverBank'
      }
    }

    const below = shelf > 0 ? layout.shelfHeight : sea.height
    height = below + (ground - below) * landK
    if (landK < 0.5) material = shelf > 0 ? 'ice' : 'snow'
    if (landK < 0.5 && shelf <= 0) {
      // Cliff faces and the harbour beach: sea where the surface is under water.
      return { height, material: height < layout.seaLevel + 0.05 ? 'sea' : 'snow', peakFrac: 0, mountainRow: 0, districtId }
    }
    return { height, material, peakFrac, mountainRow, districtId }
  }

  // Glacier shelf: Worley plates. Near the mainland the seams are narrow grooves that stay above
  // the water; toward the open sea the plates get smaller and the seams open to dark water, so the
  // field fades into floes.
  const shelfK = smoothstep(0, 1.4, shelf)
  const wx = x + fbm(z * 0.05, 7.7) * 6
  const wz = z + fbm(x * 0.05, 2.2) * 6
  const glacier = layout.districts.find((c) => c.id === 'glacier')
  const inCamp = glacier ? districtField(glacier, x, z) > -1 : false
  const edgeBreak = smoothstep(26, 0, shelf)
  const big = worley(wx, wz, 14)
  const small = worley(wx + 3.1, wz - 1.7, 6.5)
  const bigWidth = 0.36 + Math.max(0, fbm(x * 0.03, z * 0.03)) * 1.6
  const bigSeam = inCamp ? 0 : 1 - smoothstep(bigWidth, bigWidth + 0.8, big.f2 - big.f1)
  const smallWidth = 0.5 + edgeBreak * 2.4
  const smallSeam = inCamp ? 0 : edgeBreak * (1 - smoothstep(smallWidth, smallWidth + 0.9, small.f2 - small.f1))
  const seam = Math.max(bigSeam, smallSeam)
  // Inner seams: a groove 0.35 m deep (reads as a lighter crack); outer seams drop to the water.
  const seamFloor = (layout.shelfHeight - 0.35) * (1 - edgeBreak) + sea.height * edgeBreak
  const plate = layout.shelfHeight + fbm(x * 0.07, z * 0.07, 2) * 0.16
  const top = plate * (1 - seam) + seamFloor * seam
  height = sea.height + (top - sea.height) * shelfK
  const wet = seam > 0.5 && seamFloor < layout.seaLevel + 0.05
  return { height, material: shelfK > 0.5 && !wet ? 'ice' : 'sea', peakFrac: 0, mountainRow: 0, districtId }
}

/* ---------- harbour fixtures ---------- */

export interface HarbourFixtures {
  /** Quay point where the main dock leaves the land (land field ≈ 6). */
  dockRoot: [number, number]
  /** Unit direction of the dock, land → sea. */
  dockDir: [number, number]
  dockLength: number
  /** Second dock (100 % extra), same direction, shifted along the shore. */
  dock2Root: [number, number]
  dock2Length: number
  /** Icebreaker moored alongside the main dock's outer half. */
  icebreaker: [number, number]
  icebreakerYaw: number
  /** Whale skeleton gantry on the quay. */
  gantry: [number, number]
  gantryYaw: number
  /** Quay lane (along the shore, land field ≈ 8). */
  quay: Array<[number, number]>
}

const fixturesCache = new WeakMap<BiomeLayout, HarbourFixtures>()

/** Docks and moorings derived from the harbour's shore contour. */
export function harbourFixtures(layout: BiomeLayout): HarbourFixtures {
  const cached = fixturesCache.get(layout)
  if (cached) return cached
  const out = computeHarbourFixtures(layout)
  fixturesCache.set(layout, out)
  return out
}

/** Land-field depth of the quay lane, the stilt-house row, the back row, and the dock root. */
export const HARBOUR_DEPTHS = { quay: 9.5, stilts: 3.5, backRow: 14, dockRoot: 7.5, gantry: 11.5 } as const

/**
 * A polyline following the coast at a fixed land depth, marched in 3 m steps from the polygon's
 * first inland vertex toward its last, so the points are evenly spaced along the shore contour.
 */
export function coastContour(layout: BiomeLayout, back: Array<[number, number]>, depth: number, step = 3): Array<[number, number]> {
  const end = back[back.length - 1]
  const out: Array<[number, number]> = [walkToLand(layout, back[0][0], back[0][1], depth)]
  for (let guard = 0; guard < 80; guard++) {
    const [x, z] = out[out.length - 1]
    const [nx, nz] = seawardNormal(layout, x, z)
    let tx = -nz
    let tz = nx
    if ((end[0] - x) * tx + (end[1] - z) * tz < 0) {
      tx = -tx
      tz = -tz
    }
    const next = walkToLand(layout, x + tx * step, z + tz * step, depth)
    out.push(next)
    if (distToPolyline(back, next[0], next[1]).t >= 0.97) break
  }
  return out
}

function computeHarbourFixtures(layout: BiomeLayout): HarbourFixtures {
  const h = harbour(layout)!
  // The inland edge of the polygon is its first four vertices; the quay follows the coast in front
  // of it at a fixed land depth.
  const back = h.shape.kind === 'polygon' ? h.shape.vertices.slice(0, 4) : districtCentreline(h)
  const quay = coastContour(layout, back, HARBOUR_DEPTHS.quay)
  const total = polylineLength(quay)
  const at = (t: number, depth: number): [number, number] => {
    const p = pointAlong(quay, total * t)
    return walkToLand(layout, p.x, p.z, depth)
  }
  const dockRoot = at(0.44, HARBOUR_DEPTHS.dockRoot)
  const dockDir = seawardNormal(layout, dockRoot[0], dockRoot[1])
  const dockLength = 24
  const along: [number, number] = [-dockDir[1], dockDir[0]]
  const ib = 0.62 * dockLength
  const dock2Root = at(0.74, HARBOUR_DEPTHS.dockRoot)
  const gantry = at(0.2, HARBOUR_DEPTHS.gantry)
  return {
    dockRoot,
    dockDir,
    dockLength,
    dock2Root,
    dock2Length: 15,
    icebreaker: [dockRoot[0] + dockDir[0] * ib + along[0] * 7.0, dockRoot[1] + dockDir[1] * ib + along[1] * 7.0],
    icebreakerYaw: Math.atan2(dockDir[0], dockDir[1]),
    gantry,
    gantryYaw: Math.atan2(along[0], along[1]),
    quay,
  }
}

/* ---------- district content ---------- */

export interface Slot {
  position: [number, number, number]
  yaw: number
  districtId: string
  index: number
  /** Stilt houses at the waterline stand in the shallows. */
  overWater?: boolean
}

const LAKE_HUT_OK: GroundMaterial[] = ['lake', 'snow', 'ice']
const LAND_OK: GroundMaterial[] = ['snow', 'ice', 'rock']

export function laneDir(district: DistrictDef): [number, number] {
  return [Math.sin(district.laneYaw), Math.cos(district.laneYaw)]
}

/** Anchor positions that other content must keep clear of. */
export function anchorPoint(layout: BiomeLayout, district: DistrictDef): [number, number] {
  if (layout.world) return district.anchorPosition ?? districtCentre(district)
  switch (district.id) {
    case 'harbour':
      return harbourFixtures(layout).gantry
    case 'forest':
      return sawmillPoint(layout)
    case 'station': {
      const [cx, cz] = districtCentre(district)
      const [dx, dz] = laneDir(district)
      return [cx - dx * 6, cz - dz * 6]
    }
    default:
      return districtCentre(district)
  }
}

/** The sawmill sits on the river's west bank where the river leaves the forest lane, facing the water. */
export function sawmillPoint(layout: BiomeLayout): [number, number] {
  const forest = layout.districts.find((d) => d.id === 'forest')!
  const cross = polylineCrossings(districtCentreline(forest), layout.river)[0]
  if (!cross) return districtCentre(forest)
  // Downstream (toward the lake) and to the bank on the lane's left: a mill wheel dips in the river.
  const [px, pz] = cross.point
  const rd = riverDirAt(layout, px, pz)
  const side: [number, number] = [-rd[1], rd[0]]
  const off = layout.riverWidth / 2 + 3.6
  return [px + rd[0] * 7 + side[0] * off, pz + rd[1] * 7 + side[1] * off]
}

/** Unit downstream direction of the river nearest a point. */
export function riverDirAt(layout: BiomeLayout, x: number, z: number): [number, number] {
  const { t } = distToPolyline(layout.river, x, z)
  const s = t * polylineLength(layout.river)
  const p = pointAlong(layout.river, Math.min(polylineLength(layout.river) - 0.01, s + 0.01))
  return [p.dx, p.dz]
}

/** Helipad centre on the mini island (the helicopter extra lands here). */
export function helipadPoint(layout: BiomeLayout): [number, number] {
  const c = layout.districts.find((k) => k.id === 'station')!
  const [cx, cz] = districtCentre(c)
  const [dx, dz] = laneDir(c)
  return [cx + dx * 10.5, cz + dz * 10.5]
}

function riverClearance(layout: BiomeLayout, x: number, z: number, margin: number): boolean {
  return distToPolyline(layout.river, x, z).dist > layout.riverWidth / 2 + margin
}

function nearHarbourFixtures(layout: BiomeLayout, x: number, z: number, margin: number): boolean {
  const fx = harbourFixtures(layout)
  const dockEnd: [number, number] = [fx.dockRoot[0] + fx.dockDir[0] * fx.dockLength, fx.dockRoot[1] + fx.dockDir[1] * fx.dockLength]
  const dock2End: [number, number] = [fx.dock2Root[0] + fx.dockDir[0] * fx.dock2Length, fx.dock2Root[1] + fx.dockDir[1] * fx.dock2Length]
  if (distToPolyline([fx.dockRoot, dockEnd], x, z).dist < margin) return true
  if (distToPolyline([fx.dock2Root, dock2End], x, z).dist < margin) return true
  if (Math.hypot(x - fx.icebreaker[0], z - fx.icebreaker[1]) < margin + 5) return true
  return Math.hypot(x - fx.gantry[0], z - fx.gantry[1]) < margin + 2
}

/**
 * Fixed slot order per district: the first N are populated, so growth is monotonic and a house
 * never moves. Slots are derived from the shape: rows along the strip for the forest town, rows
 * along the shore contour for the harbour, rings or pairs for the others.
 */
export function districtSlots(layout: BiomeLayout, district: DistrictDef): Slot[] {
  if (layout.world) return worldSlots(layout, layout.world, district)
  const n = maxBuildings(district)
  const candidates: Array<{ x: number; z: number; yaw: number; rank: number; overWater?: boolean }> = []
  const rng = seeded(district.band * 101 + 5)
  const [ax, az] = anchorPoint(layout, district)

  if (district.id === 'forest' && district.shape.kind === 'strip') {
    const line = district.shape.centreline
    const total = polylineLength(line)
    const offset = district.shape.width * FOREST_ROW
    // Houses are 4.2 m across: a 6.6 m pitch leaves a house-sized gap between neighbours (ref:
    // never a continuous wall of roofs), every other house turns its gable to the lane.
    const spacing = 6.6
    const fixtures = forestFixtures(layout)
    const start = 4
    const count = Math.floor((total - start - 4) / spacing)
    for (let i = 0; i <= count; i++) {
      const s = start + i * spacing + (rng() - 0.5) * 0.6
      const p = pointAlong(line, s)
      const nx = -p.dz
      const nz = p.dx
      for (const side of [1, -1]) {
        const jitter = (rng() - 0.5) * 1.6
        // Stagger the two rows by half a spacing so facing houses do not line up.
        const shift = side === -1 ? spacing * 0.5 : 0
        const q = pointAlong(line, Math.min(total - 4, s + shift))
        const x = q.x + nx * (offset * side + jitter)
        const z = q.z + nz * (offset * side + jitter)
        if (fixtures.some((f) => Math.hypot(f.position[0] - x, f.position[2] - z) < 3.4)) continue
        const turned = (i + (side === -1 ? 1 : 0)) % 2 === 1
        candidates.push({ x, z, yaw: Math.atan2(-nx * side, -nz * side) + (turned ? Math.PI / 2 : 0), rank: Math.hypot(x - ax, z - az) })
      }
      // A third, outer row on the open (front) side, between the plots: filled last, so the town
      // thickens toward the pines at 75–100 % (ref: three to four rows deep).
      const outer = district.shape.width * FOREST_OUTER
      const q = pointAlong(line, Math.min(total - 4, s + spacing * 0.75))
      const ox = q.x + nx * outer
      const oz = q.z + nz * outer
      if (!fixtures.some((f) => Math.hypot(f.position[0] - ox, f.position[2] - oz) < 5.5)) {
        candidates.push({ x: ox, z: oz, yaw: Math.atan2(-nx, -nz) + (i % 2 === 0 ? Math.PI / 2 : 0), rank: 60 + i })
      }
    }
  } else if (district.id === 'harbour' && district.shape.kind === 'polygon') {
    const fx = harbourFixtures(layout)
    const back = district.shape.vertices.slice(0, 4)
    // Rows along the shore contour: stilt houses at the waterline, a second row up the slope.
    // Each row is its own coast contour so the spacing is even even where the coast is concave.
    const rows: Array<{ depth: number; spacing: number; rank: number; overWater: boolean }> = [
      { depth: HARBOUR_DEPTHS.stilts, spacing: 5.6, rank: 0, overWater: true },
      { depth: HARBOUR_DEPTHS.backRow, spacing: 7, rank: 40, overWater: false },
    ]
    for (const row of rows) {
      const contour = coastContour(layout, back, row.depth)
      const total = polylineLength(contour)
      const n = Math.floor(total / row.spacing)
      for (let i = 0; i < n; i++) {
        const p = pointAlong(contour, ((i + 0.5) / n) * total)
        const [nx, nz] = seawardNormal(layout, p.x, p.z)
        candidates.push({ x: p.x, z: p.z, yaw: Math.atan2(nx, nz), rank: row.rank + Math.hypot(p.x - fx.dockRoot[0], p.z - fx.dockRoot[1]), overWater: row.overWater })
      }
    }
  } else if (district.building === 'fishing-hut' || district.building === 'tent' || district.building === 'quonset') {
    const [cx, cz] = districtCentre(district)
    const ring = district.building === 'tent' ? 6.5 : district.building === 'quonset' ? 9.2 : 8.0
    const m = n * 2 + (district.building === 'quonset' ? 2 : 0)
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2 + 0.4
      const r = ring + (i % 2) * 1.6
      const x = cx + Math.cos(a) * r
      const z = cz + Math.sin(a) * r
      candidates.push({ x, z, yaw: Math.atan2(cx - x, cz - z), rank: i })
    }
  } else {
    const [cx, cz] = districtCentre(district)
    const [dx, dz] = laneDir(district)
    const nx = -dz
    const nz = dx
    const spacing = 6.0
    const offset = 4.8
    const m = n * 2
    const rows = Math.ceil(m / 2)
    for (let i = 0; i < m; i++) {
      const row = Math.floor(i / 2)
      const side = i % 2 === 0 ? 1 : -1
      const along = (row - (rows - 1) / 2) * spacing
      const jitter = (rng() - 0.5) * 0.8
      const x = cx + dx * along + nx * (offset * side + jitter)
      const z = cz + dz * along + nz * (offset * side + jitter)
      candidates.push({ x, z, yaw: Math.atan2(-nx * side, -nz * side), rank: i })
    }
  }

  candidates.sort((a, b) => a.rank - b.rank)
  const ok = district.building === 'fishing-hut' ? LAKE_HUT_OK : LAND_OK
  const out: Slot[] = []
  for (const c of candidates) {
    if (out.length >= n) break
    const s = sampleTerrain(layout, c.x, c.z)
    if (c.overWater) {
      if (s.material !== 'sea' && s.material !== 'snow') continue
      if (nearHarbourFixtures(layout, c.x, c.z, 4.5)) continue
      out.push({ position: [c.x, layout.seaLevel - 0.35, c.z], yaw: c.yaw, districtId: district.id, index: out.length, overWater: true })
      continue
    }
    if (!ok.includes(s.material)) continue
    if (district.building === 'fishing-hut' && s.material !== 'lake') continue
    if (district.id !== 'lake' && districtField(district, c.x, c.z) < 0.5) continue
    if (district.id === 'forest' && !riverClearance(layout, c.x, c.z, 2.8)) continue
    if (Math.hypot(c.x - ax, c.z - az) < (district.id === 'forest' ? 5.5 : 4.5)) continue
    if (district.id === 'harbour' && nearHarbourFixtures(layout, c.x, c.z, 4)) continue
    if (district.id === 'station') {
      const [hx, hz] = helipadPoint(layout)
      if (Math.hypot(c.x - hx, c.z - hz) < 8) continue
    }
    if (out.some((o) => Math.hypot(o.position[0] - c.x, o.position[2] - c.z) < (district.id === 'station' ? 7.4 : 4.0))) continue
    out.push({ position: [c.x, s.height, c.z], yaw: c.yaw, districtId: district.id, index: out.length })
  }
  return out
}

export type PropKind =
  | 'lamp'
  | 'fence'
  | 'fenced-plot'
  | 'bench'
  | 'crate'
  | 'barrel'
  | 'snowman'
  | 'bare-tree'
  | 'pine'
  | 'pine-trio'
  | 'log-pile'
  | 'cart'
  | 'stump'
  | 'sawhorse'
  | 'sled'
  | 'fuel-drum'
  | 'boat'
  | 'flag'
  | 'crystal'
  | 'boulder'
  | 'string-lights'
  | 'watchtower'
  | 'windmill'
  | 'helicopter'
  | 'antenna'
  | 'warm-tent'
  | 'footbridge'

export interface Placement {
  kind: PropKind
  position: [number, number, number]
  yaw: number
  scale: number
  districtId: string
  /** Population band at which the prop appears. */
  minBand: number
  /** Ruin knocks these over. */
  knockable: boolean
  index: number
  /** Footbridges: deck length. */
  length?: number
}

interface Recipe {
  kind: PropKind
  count: number
  minBand: number
  knockable?: boolean
  scale?: [number, number]
  /** Metres inside the district boundary the prop must sit (negative allows outside, for boats). */
  inset?: number
  /** Keep this far from building slots. */
  slotClear?: number
  /** Place along the lane instead of scattering: every `every` metres, alternating sides at `side` m. */
  lane?: { every: number; side: number }
}

const RECIPES: Record<string, Recipe[]> = {
  harbour: [
    { kind: 'lamp', count: 6, minBand: 2, lane: { every: 9, side: 1.9 } },
    { kind: 'fence', count: 3, minBand: 2, inset: 2, knockable: true },
    { kind: 'crate', count: 4, minBand: 3, inset: 2, knockable: true },
    { kind: 'barrel', count: 4, minBand: 3, inset: 2, knockable: true },
    { kind: 'bench', count: 2, minBand: 3, inset: 3, knockable: true },
    { kind: 'boat', count: 1, minBand: 2, inset: -6 },
    { kind: 'boat', count: 2, minBand: 3, inset: -6 },
    { kind: 'string-lights', count: 2, minBand: 3, inset: 3 },
    { kind: 'boat', count: 2, minBand: 4, inset: -6 },
    { kind: 'flag', count: 1, minBand: 4, inset: 3 },
  ],
  town: [
    { kind: 'fence', count: 5, minBand: 2, knockable: true },
    { kind: 'lamp', count: 4, minBand: 2, lane: { every: 8, side: 2.4 } },
    { kind: 'bench', count: 3, minBand: 3, knockable: true },
    { kind: 'snowman', count: 2, minBand: 3, knockable: true },
    { kind: 'bare-tree', count: 3, minBand: 3 },
    { kind: 'string-lights', count: 3, minBand: 3 },
    { kind: 'pine', count: 4, minBand: 0, inset: -2 },
    { kind: 'watchtower', count: 1, minBand: 4, inset: 3, slotClear: 4 },
  ],
  lake: [
    { kind: 'bench', count: 3, minBand: 2, knockable: true },
    { kind: 'lamp', count: 2, minBand: 2 },
    { kind: 'snowman', count: 3, minBand: 3, knockable: true },
    { kind: 'bare-tree', count: 3, minBand: 3 },
    { kind: 'sled', count: 1, minBand: 3, knockable: true },
    { kind: 'pine-trio', count: 2, minBand: 0 },
    { kind: 'warm-tent', count: 1, minBand: 4 },
  ],
  forest: [
    { kind: 'log-pile', count: 1, minBand: 1, inset: 2, knockable: true },
    { kind: 'lamp', count: 9, minBand: 2, lane: { every: 10, side: 2.6 } },
    { kind: 'fence', count: 7, minBand: 2, inset: 2, knockable: true },
    { kind: 'stump', count: 8, minBand: 2, inset: 1.5 },
    { kind: 'cart', count: 2, minBand: 3, inset: 2, knockable: true },
    { kind: 'barrel', count: 5, minBand: 3, inset: 1.5, knockable: true },
    { kind: 'log-pile', count: 2, minBand: 3, inset: 2, knockable: true },
    { kind: 'bench', count: 2, minBand: 3, inset: 2, knockable: true },
    { kind: 'sled', count: 1, minBand: 3, inset: 2, knockable: true },
    { kind: 'crate', count: 3, minBand: 3, inset: 1.5, knockable: true },
  ],
  glacier: [
    { kind: 'flag', count: 3, minBand: 2 },
    { kind: 'crate', count: 3, minBand: 2, knockable: true },
    { kind: 'sled', count: 2, minBand: 3, knockable: true },
    { kind: 'lamp', count: 2, minBand: 2 },
    { kind: 'crystal', count: 3, minBand: 0, inset: -2 },
    { kind: 'boulder', count: 2, minBand: 0, inset: -1 },
  ],
  station: [
    { kind: 'fuel-drum', count: 2, minBand: 2, knockable: true },
    { kind: 'antenna', count: 1, minBand: 2 },
    { kind: 'crate', count: 1, minBand: 3, knockable: true },
    { kind: 'lamp', count: 2, minBand: 2 },
    { kind: 'helicopter', count: 1, minBand: 4 },
  ],
}

/** House rows sit this fraction of the strip width either side of the lane; fixtures sit in the outer band. */
const FOREST_ROW = 0.225
const FOREST_OUTER = 0.4

const forestFixturesCache = new WeakMap<BiomeLayout, Placement[]>()

/**
 * The forest town's big timber structures at fixed spots derived from the strip: a watchtower at
 * each end (the second by the river), the windmill at the east end behind the houses, and three
 * fenced plots in the outer band between the house rows and the pines. Not seeded: they are
 * landmarks of the district, not clutter.
 */
export function forestFixtures(layout: BiomeLayout): Placement[] {
  const cached = forestFixturesCache.get(layout)
  if (cached) return cached
  const forest = layout.districts.find((d) => d.id === 'forest')
  if (!forest || forest.shape.kind !== 'strip') return []
  const line = forest.shape.centreline
  const total = polylineLength(line)
  const w = forest.shape.width
  const out: Placement[] = []
  let index = 800
  const put = (kind: PropKind, s: number, offset: number, minBand: number, yaw?: number) => {
    // Slide along the strip (alternating directions) until the spot is clear of the river.
    for (let tries = 0; tries < 7; tries++) {
      const slide = tries === 0 ? 0 : (tries % 2 === 1 ? 1 : -1) * Math.ceil(tries / 2) * 4
      const p = pointAlong(line, Math.min(total - 2, Math.max(2, s + slide)))
      const x = p.x + -p.dz * offset
      const z = p.z + p.dx * offset
      if (!riverClearance(layout, x, z, kind === 'fenced-plot' ? 4.5 : 3)) continue
      if (out.some((o) => Math.hypot(o.position[0] - x, o.position[2] - z) < 7)) continue
      const smp = sampleTerrain(layout, x, z)
      if (smp.material !== 'snow') continue
      out.push({ kind, position: [x, smp.height, z], yaw: yaw ?? Math.atan2(p.dx, p.dz) + (offset > 0 ? Math.PI : 0), scale: 1, districtId: 'forest', minBand, knockable: false, index: index++ })
      return
    }
  }
  const outer = w * FOREST_OUTER
  put('watchtower', 4, -outer, 3)
  // The windmill stands behind the back row, silhouetted against the foothills from the station
  // (never in the foreground where it would hide the houses).
  put('windmill', total * 0.72, -outer, 4)
  put('fenced-plot', total * 0.16, outer, 2)
  put('fenced-plot', total * 0.6, outer, 2)
  put('fenced-plot', total - 2, outer, 4)
  // Second watchtower by the river crossing, on the bank opposite the sawmill.
  const cross = polylineCrossings(line, layout.river)[0]
  if (cross) {
    const s = distToPolyline(line, cross.point[0], cross.point[1]).t * total
    put('watchtower', s + 9, -outer, 4)
  }
  forestFixturesCache.set(layout, out)
  return out
}

/** Footbridges wherever the forest lane and its two house rows cross the river. */
export function footbridges(layout: BiomeLayout): Placement[] {
  const forest = layout.districts.find((d) => d.id === 'forest')
  if (!forest || forest.shape.kind !== 'strip') return []
  const line = forest.shape.centreline
  const half = forest.shape.width * FOREST_ROW
  const offsetLine = (side: number): Array<[number, number]> =>
    line.map(([x, z], i) => {
      const prev = line[Math.max(0, i - 1)]
      const next = line[Math.min(line.length - 1, i + 1)]
      const dx = next[0] - prev[0]
      const dz = next[1] - prev[1]
      const len = Math.hypot(dx, dz) || 1
      return [x + (-dz / len) * half * side, z + (dx / len) * half * side]
    })
  const out: Placement[] = []
  const lines: Array<{ points: Array<[number, number]>; minBand: number }> = [
    { points: line, minBand: 1 },
    { points: offsetLine(1), minBand: 3 },
    { points: offsetLine(-1), minBand: 3 },
  ]
  let index = 900
  for (const { points, minBand } of lines) {
    for (const cross of polylineCrossings(points, layout.river)) {
      const [x, z] = cross.point
      const s = sampleTerrain(layout, x + cross.aDir[0] * (layout.riverWidth / 2 + 2.4), z + cross.aDir[1] * (layout.riverWidth / 2 + 2.4))
      const rd = riverDirAt(layout, x, z)
      // The deck crosses the river perpendicular to the flow, whatever the lane's angle.
      const yaw = Math.atan2(-rd[1], rd[0])
      out.push({ kind: 'footbridge', position: [x, s.height, z], yaw, scale: 1, districtId: 'forest', minBand, knockable: false, index: index++, length: layout.riverWidth + 3.2 })
    }
  }
  return out
}

/** Scatter props per district, deterministic by seed; every prop carries the band it appears at. */
export function propPlacements(layout: BiomeLayout, seed: number): Placement[] {
  const out: Placement[] = []
  if (layout.world) return out
  for (const district of layout.districts) {
    const rng = seeded(seed * 7 + district.band * 13)
    const slots = districtSlots(layout, district)
    const [ax, az] = anchorPoint(layout, district)
    const lane = district.id === 'harbour' ? harbourFixtures(layout).quay : districtCentreline(district)
    const bounds = districtBounds(district)
    const fixtures = district.id === 'forest' ? forestFixtures(layout) : []
    let index = 0
    for (const recipe of RECIPES[district.id] ?? []) {
      if (recipe.lane) {
        const total = polylineLength(lane)
        for (let n = 0; n < recipe.count; n++) {
          const s = recipe.lane.every * 0.5 + n * recipe.lane.every
          if (s > total) break
          const p = pointAlong(lane, s)
          const side = n % 2 === 0 ? 1 : -1
          const x = p.x + -p.dz * recipe.lane.side * side
          const z = p.z + p.dx * recipe.lane.side * side
          const smp = sampleTerrain(layout, x, z)
          if (!LAND_OK.includes(smp.material) && smp.material !== 'riverBank') continue
          if (!riverClearance(layout, x, z, 1.2)) continue
          if (slots.some((sl) => Math.hypot(sl.position[0] - x, sl.position[2] - z) < 2.6)) continue
          if (district.id === 'harbour' && nearHarbourFixtures(layout, x, z, 2.5)) continue
          out.push({ kind: recipe.kind, position: [x, smp.height, z], yaw: Math.atan2(p.dx, p.dz), scale: 1, districtId: district.id, minBand: recipe.minBand, knockable: false, index: index++ })
        }
        continue
      }
      for (let n = 0; n < recipe.count; n++) {
        if (recipe.kind === 'helicopter') {
          const [hx, hz] = helipadPoint(layout)
          const s = sampleTerrain(layout, hx, hz)
          out.push({ kind: 'helicopter', position: [hx, s.height, hz], yaw: district.laneYaw + 0.4, scale: 1, districtId: district.id, minBand: 4, knockable: false, index: index++ })
          continue
        }
        const inset = recipe.inset ?? 1.5
        const slotClear = recipe.slotClear ?? 2.8
        let placed = false
        for (let attempt = 0; attempt < 60 && !placed; attempt++) {
          const x = bounds.minX - 4 + rng() * (bounds.maxX - bounds.minX + 8)
          const z = bounds.minZ - 4 + rng() * (bounds.maxZ - bounds.minZ + 8)
          if (districtField(district, x, z) < inset) continue
          const s = sampleTerrain(layout, x, z)
          const wantsWater = recipe.kind === 'boat'
          if (wantsWater ? s.material !== 'sea' : !LAND_OK.includes(s.material)) continue
          if (Math.hypot(x - ax, z - az) < (district.id === 'forest' ? 6.5 : 4.5)) continue
          if (!riverClearance(layout, x, z, recipe.kind === 'fenced-plot' ? 4 : 1.2)) continue
          if (district.id === 'harbour' && nearHarbourFixtures(layout, x, z, wantsWater ? 4 : 2.5)) continue
          // Stay off the lane and clear of houses.
          if (!wantsWater && district.building !== 'fishing-hut' && district.building !== 'tent' && distToPolyline(lane, x, z).dist < (recipe.kind === 'fenced-plot' ? 4 : 1.8)) continue
          if (slots.some((sl) => Math.hypot(sl.position[0] - x, sl.position[2] - z) < slotClear)) continue
          if (fixtures.some((f) => Math.hypot(f.position[0] - x, f.position[2] - z) < (f.kind === 'fenced-plot' ? 4.5 : 3.5))) continue
          if (out.some((p) => p.districtId === district.id && Math.hypot(p.position[0] - x, p.position[2] - z) < 1.8)) continue
          const scale = recipe.scale ? recipe.scale[0] + rng() * (recipe.scale[1] - recipe.scale[0]) : 0.9 + rng() * 0.3
          out.push({
            kind: recipe.kind,
            position: [x, wantsWater ? layout.seaLevel : s.height, z],
            yaw: rng() * Math.PI * 2,
            scale,
            districtId: district.id,
            minBand: recipe.minBand,
            knockable: recipe.knockable ?? false,
            index: index++,
          })
          placed = true
        }
      }
    }
  }
  out.push(...forestFixtures(layout), ...footbridges(layout))
  return out
}

/* ---------- local paths ---------- */

export interface LocalPath {
  districtId: string
  kind: 'dock' | 'lane' | 'track'
  points: Array<[number, number, number]>
  width: number
  minBand: number
}

function pathHeights(layout: BiomeLayout, points: Array<[number, number]>, lift: number, floor: number): Array<[number, number, number]> {
  return points.map(([x, z]) => {
    const s = sampleTerrain(layout, x, z)
    return [x, Math.max(floor, s.height) + lift, z]
  })
}

/** Plan §2: 1–3 short paths per district, no inter-district route. */
export function localPaths(layout: BiomeLayout): LocalPath[] {
  const out: LocalPath[] = []
  if (layout.world) return out
  const deck = layout.seaLevel + 1.0
  for (const c of layout.districts) {
    const [cx, cz] = districtCentre(c)
    const [dx, dz] = laneDir(c)
    const nx = -dz
    const nz = dx
    switch (c.id) {
      case 'harbour': {
        const fx = harbourFixtures(layout)
        out.push({ districtId: c.id, kind: 'lane', width: 2.4, minBand: 0, points: pathHeights(layout, fx.quay, 0.05, deck) })
        const dock = (root: [number, number], length: number, band: number) => {
          const [near] = pathHeights(layout, [root], 0.1, deck)
          const end: [number, number, number] = [root[0] + fx.dockDir[0] * length, deck, root[1] + fx.dockDir[1] * length]
          out.push({ districtId: c.id, kind: 'dock', width: 3.0, minBand: band, points: [near, [root[0] + fx.dockDir[0] * 4, deck, root[1] + fx.dockDir[1] * 4], end] })
        }
        dock(fx.dockRoot, fx.dockLength, 0)
        dock(fx.dock2Root, fx.dock2Length, 4)
        break
      }
      case 'forest': {
        const line = districtCentreline(c)
        // Sample the lane densely so the ribbon follows the river cut and the relief.
        const total = polylineLength(line)
        const pts: Array<[number, number]> = []
        for (let s = 0; s <= total; s += 3) {
          const p = pointAlong(line, s)
          pts.push([p.x, p.z])
        }
        out.push({ districtId: c.id, kind: 'lane', width: 2.2, minBand: 0, points: pathHeights(layout, pts, 0.05, deck) })
        break
      }
      case 'town':
        out.push({ districtId: c.id, kind: 'lane', width: 1.8, minBand: 0, points: pathHeights(layout, [[cx - dx * 11, cz - dz * 11], [cx + dx * 11, cz + dz * 11]], 0.05, deck) })
        out.push({ districtId: c.id, kind: 'track', width: 1.1, minBand: 2, points: pathHeights(layout, [[cx + nx * 2, cz + nz * 2], [cx + nx * 9, cz + nz * 9]], 0.05, deck) })
        break
      case 'lake': {
        const r = layout.lake.radius
        out.push({ districtId: c.id, kind: 'track', width: 1.1, minBand: 0, points: pathHeights(layout, [[cx + 2, cz + r + 4], [cx + 1, cz + r - 1]], 0.05, deck) })
        break
      }
      case 'glacier':
        out.push({ districtId: c.id, kind: 'track', width: 1.0, minBand: 1, points: pathHeights(layout, [[cx - dx * 6, cz - dz * 6], [cx + dx * 6, cz + dz * 6]], 0.05, deck) })
        break
      case 'station': {
        const [hx, hz] = helipadPoint(layout)
        out.push({ districtId: c.id, kind: 'lane', width: 1.4, minBand: 0, points: pathHeights(layout, [[cx - dx * 5, cz - dz * 5], [hx, hz]], 0.05, deck) })
        break
      }
    }
  }
  return out
}

/* ---------- residents ---------- */

export interface Seat {
  districtId: string
  center: [number, number]
  rx: number
  rz: number
  phase: number
  speed: number
}

/** Residents = finished psets, distributed to districts by progress; each wanders a small loop. */
export function residentSeats(layout: BiomeLayout, progress: DistrictProgress, count: number, seed: number): Seat[] {
  const rng = seeded(seed * 3 + 11)
  const weights = layout.districts.map((c) => Math.max(0, progress[c.id] ?? 0))
  const total = weights.reduce((a, b) => a + b, 0)
  const out: Seat[] = []
  for (let i = 0; i < count; i++) {
    let district = layout.districts[0]
    if (total > 0) {
      let pick = ((i + 0.5) / count) * total
      for (let k = 0; k < weights.length; k++) {
        pick -= weights[k]
        if (pick <= 0) {
          district = layout.districts[k]
          break
        }
      }
    }
    if (district.id === 'forest' || district.id === 'harbour' || (layout.world && district.shape.kind === 'strip')) {
      // Along the lane / quay: a long loop that stays on the path and out of the river.
      const lane = district.id === 'harbour' && !layout.world ? harbourFixtures(layout).quay : districtCentreline(district)
      const total = polylineLength(lane)
      const p = pointAlong(lane, total * (0.15 + rng() * 0.7))
      out.push({
        districtId: district.id,
        center: [p.x, p.z],
        rx: 6 + rng() * 4,
        rz: 1.6 + rng() * 1.2,
        phase: rng() * Math.PI * 2,
        speed: 0.12 + rng() * 0.08,
      })
      continue
    }
    const [cx, cz] = districtCentre(district)
    const radius = districtRadius(district)
    const isLake = district.id === 'lake'
    const base = isLake ? radius * 0.45 : radius * 0.5
    const [dx, dz] = laneDir(district)
    const along = (rng() - 0.5) * radius * 0.5
    out.push({
      districtId: district.id,
      center: [cx + dx * along, cz + dz * along],
      rx: base * (0.7 + rng() * 0.5),
      rz: base * (0.7 + rng() * 0.5),
      phase: rng() * Math.PI * 2,
      speed: 0.12 + rng() * 0.08,
    })
  }
  return out
}

/* ---------- floes ---------- */

export function floePositions(layout: BiomeLayout, seed: number, count = 34): Array<[number, number, number, number]> {
  const rng = seeded(seed + 17)
  const out: Array<[number, number, number, number]> = []
  let guard = 0
  const h = harbour(layout)
  while (out.length < count && guard++ < count * 12) {
    // West: beyond the shelf and in its broken outer seams. Front/east: the harbour water.
    const west = rng() < 0.6
    const x = west ? layout.shelfEndX + 14 - rng() * 56 : -20 + rng() * 150
    const z = west ? -40 + rng() * 90 : 30 + rng() * 80
    if (sampleTerrain(layout, x, z).material !== 'sea') continue
    if (landField(layout, x, z) > -6) continue
    if (h && districtField(h, x, z) > -8) continue
    const wd = Math.hypot(x - layout.whaleArc.center[0], z - layout.whaleArc.center[1])
    if (wd < layout.whaleArc.radius + 8) continue
    if (Math.hypot(x - layout.miniIsland.center[0], z - layout.miniIsland.center[1]) < layout.miniIsland.radius + 6) continue
    out.push([x, z, 1.2 + rng() * 2.6, rng() * Math.PI])
  }
  return out
}

/* ---------- forest ---------- */

export interface Tree {
  x: number
  y: number
  z: number
  scale: number
  yaw: number
}

/** Positive inside the forest belt: the forest town's shape grown by `forestMargin`. */
export function forestField(layout: BiomeLayout, x: number, z: number): number {
  const forest = layout.districts.find((d) => d.id === 'forest')
  if (!forest) return -1
  return districtField(forest, x, z) + layout.forestMargin
}

/**
 * Dense pines wrapping the forest town on all sides (ambient: present at 0 %). Inside the strip
 * they fill the outer 2.5 m behind the house rows; outside, a belt `forestMargin` deep with a
 * ragged outer edge, climbing the foothills behind but never onto the range or into the river.
 */
export function forestPines(layout: BiomeLayout, seed: number): Tree[] {
  const forest = layout.districts.find((d) => d.id === 'forest')
  if (!forest) return []
  const rng = seeded(seed * 11 + 3)
  const b = districtBounds(forest)
  const m = layout.forestMargin
  const out: Tree[] = []
  const [ax, az] = anchorPoint(layout, forest)
  const lane = districtCentreline(forest)
  const fixtures = forestFixtures(layout)
  const step = 3.3
  for (let gx = b.minX - m; gx <= b.maxX + m; gx += step) {
    for (let gz = b.minZ - m; gz <= b.maxZ + m; gz += step) {
      const x = gx + (rng() - 0.5) * 2.4
      const z = gz + (rng() - 0.5) * 2.4
      const f = districtField(forest, x, z)
      if (f + m <= 0) continue
      if (f > 0) {
        // Inside the strip: only the outer margin behind the houses, sparse.
        if (f > 2.6 || rng() > 0.6) continue
      } else {
        // Ragged outer edge and thinning toward the far side.
        if (rng() > 1 - smoothstep(m * 0.5, m, -f)) continue
        if (layout.districts.some((d) => d.id !== 'forest' && districtField(d, x, z) > -7)) continue
        if (Math.hypot(x - layout.lake.center[0], z - layout.lake.center[1]) < layout.lake.radius + 4) continue
      }
      if (!riverClearance(layout, x, z, 2.2)) continue
      if (distToPolyline(lane, x, z).dist < 3.5) continue
      if (Math.hypot(x - ax, z - az) < 7) continue
      if (fixtures.some((f) => Math.hypot(f.position[0] - x, f.position[2] - z) < (f.kind === 'fenced-plot' ? 4.8 : 3.5))) continue
      const s = sampleTerrain(layout, x, z)
      if (s.material !== 'snow' && s.material !== 'rock') continue
      if (s.height > layout.groundHeight + 10) continue
      // Taller trees deeper in the forest, smaller ones at the strip edge (the reference's wall of pines).
      const depth = smoothstep(2, -m * 0.8, f)
      out.push({ x, y: s.height, z, scale: 1.7 + rng() * 0.7 + depth * 0.9, yaw: rng() * Math.PI * 2 })
    }
  }
  return out
}

/* ---------- ambient scatter in the gaps ---------- */

export interface Scatter {
  kind: 'grove' | 'outcrop'
  position: [number, number, number]
  yaw: number
  /** Trees (grove) or rocks (outcrop): local offsets and scale. */
  items: Array<{ dx: number; dz: number; scale: number; y: number }>
}

/** Foot-of-the-range outcrops are bigger knuckles of rock than the ones in the meadows. */
const FOOT_ROCK_SCALE = 1.9

function clearOfDistricts(layout: BiomeLayout, x: number, z: number, margin: number): boolean {
  for (const c of layout.districts) if (districtField(c, x, z) > -margin) return false
  if (forestField(layout, x, z) > -2) return false
  const [lx, lz] = layout.lake.center
  if (Math.hypot(x - lx, z - lz) < layout.lake.radius + margin) return false
  if (distToPolyline(layout.river, x, z).dist < layout.riverWidth + 3) return false
  const [ox, oz] = layout.outcrop.center
  return Math.hypot(x - ox, z - oz) > layout.outcrop.radius + margin
}

/**
 * Pine groves (5–9 trees) to the west and lavender rock outcrops (2–3 rocks) in the empty snow
 * between districts. Ambient, never progress. (The forest belt itself is `forestPines`.)
 */
export function ambientScatter(layout: BiomeLayout, seed: number): Scatter[] {
  const rng = seeded(seed * 5 + 29)
  const out: Scatter[] = []
  const tryPlace = (kind: Scatter['kind'], x: number, z: number, count: number, spread: number, itemScale = 1): boolean => {
    const s = sampleTerrain(layout, x, z)
    if (s.material !== 'snow' && !(kind === 'outcrop' && s.material === 'rock')) return false
    if (!clearOfDistricts(layout, x, z, kind === 'grove' ? 7 : 6)) return false
    if (out.some((o) => Math.hypot(o.position[0] - x, o.position[2] - z) < 14)) return false
    const items: Scatter['items'] = []
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2
      const r = Math.sqrt(rng()) * spread
      const dx = Math.cos(a) * r
      const dz = Math.sin(a) * r
      const t = sampleTerrain(layout, x + dx, z + dz)
      if (t.material !== 'snow' && t.material !== 'rock') continue
      items.push({ dx, dz, scale: (0.75 + rng() * 0.6) * itemScale, y: t.height - s.height })
    }
    if (items.length < 2) return false
    out.push({ kind, position: [x, s.height, z], yaw: rng() * Math.PI * 2, items })
    return true
  }
  // Mountain foot: big rock knuckles 6–16 m into the belt, where the snow starts to climb.
  for (const fx of [-72, -44, -18, 12, 40, 68]) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const x = fx + (rng() - 0.5) * 10
      if (tryPlace('outcrop', x, backBoundaryZ(layout, x) - 6 - rng() * 10, 3 + Math.floor(rng() * 2), 3.4, FOOT_ROCK_SCALE)) break
    }
  }
  // Groves: the west of the mainland (where the old lumber camp was) and the far foothill ends.
  const groveSpots: Array<[number, number]> = [[-46, 26], [-40, 8], [-50, -6], [-30, 20]]
  groveSpots.push([-60, backBoundaryZ(layout, -60) + 10], [74, backBoundaryZ(layout, 74) + 9])
  let groves = 0
  for (const [gx, gz] of groveSpots) {
    for (let attempt = 0; attempt < 6 && groves < 6; attempt++) {
      if (tryPlace('grove', gx + (rng() - 0.5) * 10 * attempt, gz + (rng() - 0.5) * 6 * attempt, 5 + Math.floor(rng() * 5), 5.5)) {
        groves++
        break
      }
    }
  }
  // Outcrops: rejection-sampled into the gaps between districts.
  let outcrops = 0
  for (let attempt = 0; attempt < 120 && outcrops < 6; attempt++) {
    const x = (rng() - 0.5) * 120
    const z = (rng() - 0.5) * 110 - 6
    if (tryPlace('outcrop', x, z, 2 + Math.floor(rng() * 2), 2.2)) outcrops++
  }
  return out
}

/** Which district's population is visible in a given band for a set of props. */
export function visibleProps(placements: Placement[], layout: BiomeLayout, progress: DistrictProgress): Placement[] {
  const bands = new Map<string, number>(layout.districts.map((c) => [c.id, populationFor(c, progress[c.id] ?? 0).band]))
  return placements.filter((p) => p.minBand <= (bands.get(p.districtId) ?? 0))
}
