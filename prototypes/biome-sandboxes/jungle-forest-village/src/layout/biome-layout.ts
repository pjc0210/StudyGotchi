/**
 * Biome layout: one course = one kingdom. Pure data and pure functions, no three.js.
 * Coordinates: x east, z south (toward the default camera), y up. Metres.
 * Spec: docs/design/world/biome-world-structure.md, superseded where it conflicts by
 * docs/design/world/biome-lab-fix-plan.md, then by Philote's pass-3 review (districts as
 * polygons / strips shaped by the land, fixed 2 px pass, creature scale rule).
 */

export type DistrictKind = 'harbour' | 'town' | 'lake' | 'forest' | 'glacier' | 'station'

export type BuildingKind = 'stilt-house' | 'timber-house' | 'fishing-hut' | 'forest-house' | 'tent' | 'quonset'

export type DistrictMaterial = 'snow' | 'planks' | 'ice'

/**
 * A district is a region of the land, not a circle: either a polygon (x, z vertices, any
 * winding) or a strip (a centreline with a width). Slots and props are derived from the shape.
 */
export type DistrictShape =
  | { kind: 'polygon'; vertices: Array<[number, number]> }
  | { kind: 'strip'; centreline: Array<[number, number]>; width: number }

/** Buildings placed per band (0, 25, 50, 75, 100 %). Monotonic by construction (validated in tests). */
export type PopulationTable = [number, number, number, number, number]

export interface DistrictDef {
  id: DistrictKind
  name: string
  /** Topic slot: course order from the harbour (1) outward. */
  band: number
  /** Short blurb for the panel: what the anchor is. */
  anchor: string
  shape: DistrictShape
  /** Lane direction (radians, from +z toward +x) used by the polygon districts for their rows. */
  laneYaw: number
  /**
   * District-station azimuth (degrees from +z toward +x). Long districts are framed along their
   * length so the chord stays short and creatures keep ≥ 6 % of the viewport (the scale rule).
   */
  stationAzimuth?: number
  building: BuildingKind
  population: PopulationTable
  /** The one warm accent per district; appears at 25 % ("first light"). */
  accent: string
  material: DistrictMaterial
}

export interface LakeDef {
  center: [number, number]
  radius: number
  /** Dark open-water patches: [x, z, radius]. */
  openWater: Array<[number, number, number]>
}

export interface BiomeLayout {
  id: string
  name: string
  /** Terrain mesh half-extent; the land continues past it into fog at the back. */
  worldExtent: number
  /** Radius the overview / arrival stations frame. */
  frameRadius: number
  seaLevel: number
  /** Mainland snow surface height (cliff drop = groundHeight − seaLevel). */
  groundHeight: number
  /** Glacier shelf plate height (a lower slab than the mainland). */
  shelfHeight: number
  /** Rolling relief amplitude on the mainland. */
  relief: number
  /** Mainland as a union of wobbly lobes: centre, radii, and extra lobes for bays and points. */
  mainland: { center: [number, number]; rx: number; rz: number; lobes: Array<[number, number, number]> }
  /**
   * The range follows a curved arc z = arcZ + arcCurve·x² (ends wrap forward). The back land's
   * boundary sits `footDepth` in front of the arc and wanders ±18 m with noise; the foothill belt
   * climbs from the boundary to the peaks.
   */
  range: { arcZ: number; arcCurve: number; footDepth: number; footRise: number }
  /** x where the shelf ends and the western sea with floes begins. */
  shelfEndX: number
  lake: LakeDef
  /** River polyline from the foothills through the forest town down into the lake, [x, z]. Open teal water. */
  river: Array<[number, number]>
  riverWidth: number
  /** Pink-lavender rock outcrop with the ice cave and crystal. */
  outcrop: { center: [number, number]; radius: number; height: number; caveYaw: number }
  /** Hero ice arch on the shelf. */
  iceArch: { center: [number, number]; yaw: number; span: number; height: number }
  /** Offshore research-station island. */
  miniIsland: { center: [number, number]; radius: number }
  /** Headland ice rock at the harbour mouth carrying the landmark. */
  headland: { center: [number, number]; radius: number }
  /** Whale arc: a circle 20–40 m off the harbour. */
  whaleArc: { center: [number, number]; radius: number }
  /**
   * Harbour shore: inside this many metres of the harbour shape the coast is a slope, not a cliff,
   * and the ground rises `harbourRise` metres toward the quay.
   */
  harbourShore: { slopeLength: number; rise: number }
  /** Dense pine forest wraps the forest town: pines inside this margin around its shape. */
  forestMargin: number
  /** Resident base height, metres, before `creatureScale`. */
  creatureHeight: number
  /** Per-course creature scale (growth-and-catastrophe.md, "The scale rule"). */
  creatureScale: number
  districts: DistrictDef[]
}

/** Plan §6 palette: pale ground, saturated accents only. */
export const ICE_TOWN_PALETTE = {
  sky: '#dbe2ee',
  skyNight: '#22284a',
  snow: '#eef4f7',
  snowShadow: '#dfe8ef',
  paleIce: '#d8e9f4',
  cliffIce: '#8fbfdc',
  rock: '#c9bfd0',
  rockDeep: '#b3a7bd',
  water: '#2f5f80',
  waterNight: '#16304a',
  openWater: '#3f6f90',
  /** The forest town's river (winter-forest-town ref): saturated teal against the snow. */
  river: '#2fa3b4',
  riverBank: '#e7e0d3',
  crystal: '#7fd0ee',
  planks: '#8c6a4f',
  planksLight: '#a88465',
  timberDark: '#4a3c36',
  timberRed: '#c8524a',
  timberTeal: '#5f9ea8',
  timberSlate: '#6d7f96',
  cream: '#f4e9d2',
  bone: '#efe6d6',
  stationBlue: '#3f9bd8',
  pine: '#5f8f78',
  pineLight: '#7fa79a',
  pineSnow: '#e4edf2',
  trunk: '#786557',
  stone: '#8e8a94',
  ink: '#342d45',
  light: '#ffe7a3',
  coral: '#e88a8a',
  peach: '#f2a86f',
  mint: '#8fc9d8',
  lilac: '#c9a2e6',
} as const

export const ICE_TOWN_LAYOUT: BiomeLayout = {
  id: 'ice-town',
  name: 'Ice / Chilly Town',
  worldExtent: 170,
  frameRadius: 96,
  seaLevel: -0.4,
  groundHeight: 1.5,
  shelfHeight: 0.45,
  relief: 0.6,
  mainland: {
    center: [0, -4],
    rx: 58,
    rz: 54,
    lobes: [
      [-36, 8, 24],
      [48, -16, 24],
      [22, 30, 20],
      // Pass 4: fills the back-east inlet so the forest town's strip has land under its whole length.
      [36, -42, 32],
    ],
  },
  range: { arcZ: -90, arcCurve: 0.0032, footDepth: 34, footRise: 7 },
  shelfEndX: -102,
  lake: {
    center: [-24, -18],
    radius: 11.5,
    openWater: [
      [-28, -16, 2.4],
      [-19, -22, 1.9],
      [-21, -13, 1.4],
    ],
  },
  river: [
    [31, -82],
    [28, -66],
    [24, -54],
    [20, -44],
    [13, -35],
    [2, -29],
    [-9, -24],
    [-15, -21],
  ],
  riverWidth: 4.4,
  outcrop: { center: [-46, -24], radius: 8, height: 3.4, caveYaw: 1.4 },
  iceArch: { center: [-82, 14], yaw: 0.5, span: 9, height: 8 },
  miniIsland: { center: [72, 63], radius: 8.5 },
  headland: { center: [53, 48], radius: 5.5 },
  whaleArc: { center: [14, 84], radius: 9 },
  harbourShore: { slopeLength: 20, rise: 1.4 },
  forestMargin: 24,
  creatureHeight: 1.8,
  creatureScale: 1.6,
  districts: [
    {
      id: 'harbour',
      name: 'Harbour',
      band: 1,
      anchor: 'plank dock · moored icebreaker · hanging whale skeleton',
      // A curved band along the front coast (probe: coast at z ≈ 50 for x ∈ [0, 30], curving to
      // (50, 25)); the sea edge of the polygon is in the water so stilt houses and boats fit.
      shape: {
        kind: 'polygon',
        vertices: [
          [2, 34],
          [26, 32],
          [36, 25],
          [46, 19],
          [52, 26],
          [46, 42],
          [36, 56],
          [16, 58],
          [0, 54],
        ],
      },
      laneYaw: 1.5,
      stationAzimuth: 100,
      building: 'stilt-house',
      population: [0, 2, 4, 7, 8],
      accent: ICE_TOWN_PALETTE.timberRed,
      material: 'planks',
    },
    {
      id: 'town',
      name: 'Town',
      band: 2,
      anchor: 'plaza tree · frozen fountain',
      shape: { kind: 'polygon', vertices: [[9, -8], [30, -10], [31, 0], [25, 8], [11, 13], [3, 5]] },
      laneYaw: 2.12,
      building: 'timber-house',
      population: [0, 2, 4, 8, 8],
      accent: ICE_TOWN_PALETTE.light,
      material: 'snow',
    },
    {
      id: 'lake',
      name: 'Lake',
      band: 3,
      anchor: 'skating ring · open-water patches',
      shape: {
        kind: 'polygon',
        vertices: [[-24, -31], [-15, -27], [-11, -18], [-15, -6], [-24, -4], [-33, -9], [-40, -21], [-32, -29]],
      },
      laneYaw: 0.2,
      building: 'fishing-hut',
      population: [0, 1, 2, 4, 4],
      accent: ICE_TOWN_PALETTE.coral,
      material: 'ice',
    },
    {
      id: 'forest',
      name: 'Forest town',
      band: 4,
      anchor: 'sawmill on the river · pine forest',
      // A long strip along the foothill edge at the back (probe: boundary z ≈ −53…−60 there).
      shape: {
        kind: 'strip',
        centreline: [
          [5, -47],
          [20, -45.5],
          [36, -43.5],
          [64, -44],
        ],
        width: 24,
      },
      laneYaw: 1.5,
      // Oblique to the strip so it reads as a village along a river with depth (ref viewpoint).
      stationAzimuth: 66,
      building: 'forest-house',
      population: [0, 3, 7, 12, 14],
      accent: ICE_TOWN_PALETTE.light,
      material: 'snow',
    },
    {
      id: 'glacier',
      name: 'Glacier camp',
      band: 5,
      anchor: 'ice arch · crystal spire · ice cave',
      shape: { kind: 'polygon', vertices: [[-86, -7], [-66, -9], [-62, 1], [-69, 10], [-81, 8], [-88, 1]] },
      laneYaw: 0.3,
      building: 'tent',
      population: [0, 1, 2, 4, 4],
      accent: ICE_TOWN_PALETTE.lilac,
      material: 'ice',
    },
    {
      id: 'station',
      name: 'Research station',
      band: 6,
      anchor: 'dish tower · helipad',
      shape: { kind: 'polygon', vertices: [[61, 59], [73, 53], [83, 59], [81, 67], [73, 71], [63, 69]] },
      laneYaw: -0.6,
      building: 'quonset',
      population: [0, 1, 2, 3, 3],
      accent: ICE_TOWN_PALETTE.timberRed,
      material: 'snow',
    },
  ],
}

export type DistrictProgress = Record<string, number>

/* ---------- shapes ---------- */

const polygonCache = new WeakMap<DistrictShape, Array<[number, number]>>()

/** Polygon outline for any shape (a strip is offset both ways from its centreline). */
export function shapePolygon(shape: DistrictShape): Array<[number, number]> {
  if (shape.kind === 'polygon') return shape.vertices
  const cached = polygonCache.get(shape)
  if (cached) return cached
  const poly = stripPolygon(shape.centreline, shape.width)
  polygonCache.set(shape, poly)
  return poly
}

function stripPolygon(centreline: Array<[number, number]>, width: number): Array<[number, number]> {
  const half = width / 2
  const left: Array<[number, number]> = []
  const right: Array<[number, number]> = []
  for (let i = 0; i < centreline.length; i++) {
    const prev = centreline[Math.max(0, i - 1)]
    const next = centreline[Math.min(centreline.length - 1, i + 1)]
    const dx = next[0] - prev[0]
    const dz = next[1] - prev[1]
    const len = Math.hypot(dx, dz) || 1
    const nx = -dz / len
    const nz = dx / len
    const [x, z] = centreline[i]
    left.push([x + nx * half, z + nz * half])
    right.push([x - nx * half, z - nz * half])
  }
  return [...left, ...right.reverse()]
}

export function polygonCentroid(poly: Array<[number, number]>): [number, number] {
  let area = 0
  let cx = 0
  let cz = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i]
    const [x1, z1] = poly[(i + 1) % poly.length]
    const cross = x0 * z1 - x1 * z0
    area += cross
    cx += (x0 + x1) * cross
    cz += (z0 + z1) * cross
  }
  if (Math.abs(area) < 1e-9) {
    const n = poly.length
    return [poly.reduce((a, p) => a + p[0], 0) / n, poly.reduce((a, p) => a + p[1], 0) / n]
  }
  area *= 0.5
  return [cx / (6 * area), cz / (6 * area)]
}

export function pointInPolygon(poly: Array<[number, number]>, x: number, z: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

function segmentDistance(ax: number, az: number, bx: number, bz: number, x: number, z: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz || 1
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / len2))
  return Math.hypot(ax + dx * t - x, az + dz * t - z)
}

export function polygonEdgeDistance(poly: Array<[number, number]>, x: number, z: number): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i]
    const [bx, bz] = poly[(i + 1) % poly.length]
    best = Math.min(best, segmentDistance(ax, az, bx, bz, x, z))
  }
  return best
}

/** Signed distance to the district boundary in metres: positive inside, negative outside. */
export function districtField(district: DistrictDef, x: number, z: number): number {
  const poly = shapePolygon(district.shape)
  const d = polygonEdgeDistance(poly, x, z)
  return pointInPolygon(poly, x, z) ? d : -d
}

export function districtCentre(district: DistrictDef): [number, number] {
  return polygonCentroid(shapePolygon(district.shape))
}

/** Radius of the smallest circle around the centroid that contains the shape. */
export function districtRadius(district: DistrictDef): number {
  const [cx, cz] = districtCentre(district)
  return Math.max(...shapePolygon(district.shape).map(([x, z]) => Math.hypot(x - cx, z - cz)))
}

export function districtBounds(district: DistrictDef): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const poly = shapePolygon(district.shape)
  return {
    minX: Math.min(...poly.map((p) => p[0])),
    maxX: Math.max(...poly.map((p) => p[0])),
    minZ: Math.min(...poly.map((p) => p[1])),
    maxZ: Math.max(...poly.map((p) => p[1])),
  }
}

/**
 * Width of the shape as the camera sees it: its extent along the camera-right axis for an
 * azimuth (measured from +z toward +x), plus a margin so houses at the edge are not cut.
 */
export function districtChord(district: DistrictDef, azimuthDeg: number, margin = 6): number {
  const a = (azimuthDeg * Math.PI) / 180
  const rx = Math.cos(a)
  const rz = -Math.sin(a)
  const proj = shapePolygon(district.shape).map(([x, z]) => x * rx + z * rz)
  return Math.max(...proj) - Math.min(...proj) + margin
}

/** Shortest distance between two district outlines (0 if they overlap). */
export function districtGap(a: DistrictDef, b: DistrictDef): number {
  const pa = shapePolygon(a.shape)
  const pb = shapePolygon(b.shape)
  if (pa.some(([x, z]) => pointInPolygon(pb, x, z)) || pb.some(([x, z]) => pointInPolygon(pa, x, z))) return 0
  let best = Number.POSITIVE_INFINITY
  for (const [x, z] of pa) best = Math.min(best, polygonEdgeDistance(pb, x, z))
  for (const [x, z] of pb) best = Math.min(best, polygonEdgeDistance(pa, x, z))
  // Sample the edges as well as the vertices so two long parallel edges measure correctly.
  for (const [poly, other] of [
    [pa, pb],
    [pb, pa],
  ] as const) {
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i]
      const [bx, bz] = poly[(i + 1) % poly.length]
      for (let t = 0.1; t < 1; t += 0.1) best = Math.min(best, polygonEdgeDistance(other, ax + (bx - ax) * t, az + (bz - az) * t))
    }
  }
  return best
}

/** Strip centreline (polygon districts synthesise one through the centroid along laneYaw). */
export function districtCentreline(district: DistrictDef): Array<[number, number]> {
  if (district.shape.kind === 'strip') return district.shape.centreline
  const [cx, cz] = districtCentre(district)
  const r = districtRadius(district) * 0.8
  const dx = Math.sin(district.laneYaw)
  const dz = Math.cos(district.laneYaw)
  return [
    [cx - dx * r, cz - dz * r],
    [cx + dx * r, cz + dz * r],
  ]
}

/* ---------- growth ---------- */

/** Five bands (0, 25, 50, 75, 100 %) → 0–4. */
export function bandForProgress(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  return Math.floor(p * 4 + 1e-9)
}

export function bandLabel(progress: number): string {
  return `${bandForProgress(progress) * 25}%`
}

export interface Population {
  band: number
  /** Houses placed (first N of the district's fixed slot order). */
  buildings: number
  /** 25 %: the one warm accent object. */
  accent: boolean
  /** 50 %: fences and lamps. */
  fences: boolean
  /** 75 %: clutter props and string lights. */
  clutter: boolean
  /** 100 %: the extras (watchtower, second dock, helicopter, doubled tents). */
  extras: boolean
}

/** Plan §3: population per band from the district's table. Elevation never changes for a district. */
export function populationFor(district: DistrictDef, progress: number): Population {
  const band = bandForProgress(progress)
  return { band, buildings: district.population[band], accent: band >= 1, fences: band >= 2, clutter: band >= 3, extras: band >= 4 }
}

export function maxBuildings(district: DistrictDef): number {
  return Math.max(...district.population)
}

export function courseProgress(layout: BiomeLayout, progress: DistrictProgress): number {
  const values = layout.districts.map((c) => progress[c.id] ?? 0)
  return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)
}

export interface MountainProfile {
  band: number
  /** Peaks in the front row. */
  peaks: number
  /** Multiplier on the peak heights (0 % → low hills, 100 % → the full range). */
  heightScale: number
  /** Whether the middle row exists (50 %+). */
  secondRow: boolean
  /** Whether the distant back row exists (75 %+). */
  thirdRow: boolean
  /** Snow-cap threshold as a fraction of each peak's height (lower = more snow). */
  snowLine: number
}

/** Plan §3: the mountain range is the only elevation that grows, by course fraction. */
export function mountainProfile(fraction: number): MountainProfile {
  const band = bandForProgress(fraction)
  return {
    band,
    peaks: [3, 5, 6, 8, 9][band],
    heightScale: [0.42, 0.6, 0.76, 0.9, 1][band],
    secondRow: band >= 2,
    thirdRow: band >= 3,
    snowLine: [0.8, 0.7, 0.62, 0.55, 0.5][band],
  }
}

export type LandmarkStage = 'stake' | 's1' | 's2' | 's3'

/** Grand landmark stage from the course fraction (bible §a). */
export function landmarkStage(fraction: number): LandmarkStage {
  if (fraction <= 0) return 'stake'
  if (fraction < 0.5) return 's1'
  if (fraction < 1) return 's2'
  return 's3'
}

/** Districts in topic order (harbour first). */
export function districtOrder(layout: BiomeLayout): DistrictDef[] {
  return [...layout.districts].sort((a, b) => a.band - b.band)
}

/* ---------- the scale rule (growth-and-catastrophe.md) ---------- */

/**
 * Fraction of the viewport height a creature covers at a station that fits `chord` metres into
 * `fitWidth` of the frame width, seen from `pitchDeg` above the ground. Pure geometry: the FOV
 * and distance cancel, only the chord, the aspect and the pitch matter.
 */
export function creatureViewportFraction(creatureHeight: number, chord: number, fitWidth: number, aspect: number, pitchDeg: number): number {
  const visibleWidth = chord / fitWidth
  const visibleHeight = visibleWidth / aspect
  return (creatureHeight * Math.cos((pitchDeg * Math.PI) / 180)) / visibleHeight
}

/** Creature scale that reaches `minFraction` (rule: 6 %) at the given station framing. */
export function requiredCreatureScale(baseHeight: number, chord: number, fitWidth: number, aspect: number, pitchDeg: number, minFraction = 0.06): number {
  const at1 = creatureViewportFraction(baseHeight, chord, fitWidth, aspect, pitchDeg)
  return Math.max(1, minFraction / at1)
}

/* ---------- whale schedule ---------- */

export type WhalePhase = 'hidden' | 'rise' | 'blow' | 'glide' | 'dive' | 'breach'

export interface WhaleEvent {
  /** Seconds from t = 0 at which the whale starts rising. */
  startAt: number
  /** Total visible seconds. */
  duration: number
  breach: boolean
  /** Arc start angle (radians) and sweep. */
  angle: number
  sweep: number
}

export const WHALE_TIMING = { rise: 1.2, blow: 1.5, glide: 3.0, dive: 1.5, breach: 2.2 } as const

/**
 * Plan §5: hidden most of the time; every 45–90 s (seeded) one surfacing. One in four is a breach.
 * `count` events are pre-rolled so the schedule is a pure function of the seed.
 */
export function whaleSchedule(seed: number, count = 40): WhaleEvent[] {
  const rng = seeded(seed * 31 + 7)
  const out: WhaleEvent[] = []
  let t = 30 + rng() * 30
  for (let i = 0; i < count; i++) {
    const breach = rng() < 0.25
    const duration = breach
      ? WHALE_TIMING.rise + WHALE_TIMING.breach + WHALE_TIMING.dive
      : WHALE_TIMING.rise + WHALE_TIMING.blow + WHALE_TIMING.glide + WHALE_TIMING.dive
    out.push({ startAt: t, duration, breach, angle: rng() * Math.PI * 2, sweep: 0.5 + rng() * 0.5 })
    t += duration + 45 + rng() * 45
  }
  return out
}

export interface WhaleState {
  phase: WhalePhase
  /** 0–1 within the phase. */
  k: number
  /** 0–1 along the arc. */
  u: number
  event: WhaleEvent | null
}

export function whaleStateAt(schedule: WhaleEvent[], time: number): WhaleState {
  for (const event of schedule) {
    if (time < event.startAt) break
    const local = time - event.startAt
    if (local >= event.duration) continue
    const u = local / event.duration
    let acc = 0
    const phases: Array<[WhalePhase, number]> = event.breach
      ? [
          ['rise', WHALE_TIMING.rise],
          ['breach', WHALE_TIMING.breach],
          ['dive', WHALE_TIMING.dive],
        ]
      : [
          ['rise', WHALE_TIMING.rise],
          ['blow', WHALE_TIMING.blow],
          ['glide', WHALE_TIMING.glide],
          ['dive', WHALE_TIMING.dive],
        ]
    for (const [phase, seconds] of phases) {
      if (local < acc + seconds) return { phase, k: (local - acc) / seconds, u, event }
      acc += seconds
    }
  }
  return { phase: 'hidden', k: 0, u: 0, event: null }
}

/** Whale position on its arc for a given event and 0–1 progress. */
export function whalePointOnArc(layout: BiomeLayout, event: WhaleEvent, u: number): [number, number] {
  const a = event.angle + event.sweep * u
  const { center, radius } = layout.whaleArc
  return [center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius]
}

/* ---------- export ---------- */

export interface LayoutExport {
  version: 3
  biome: string
  ground: { seaLevel: number; groundHeight: number; shelfHeight: number }
  creature: { height: number; scale: number }
  districts: Array<{
    id: DistrictKind
    band: number
    shape: DistrictShape
    centre: [number, number]
    progress: number
    population: Population
  }>
  mountains: MountainProfile
  landmark: LandmarkStage
  courseProgress: number
  camera: unknown
}

export function buildLayoutExport(layout: BiomeLayout, progress: DistrictProgress, camera: unknown): LayoutExport {
  const fraction = courseProgress(layout, progress)
  return {
    version: 3,
    biome: layout.id,
    ground: { seaLevel: layout.seaLevel, groundHeight: layout.groundHeight, shelfHeight: layout.shelfHeight },
    creature: { height: layout.creatureHeight, scale: layout.creatureScale },
    districts: layout.districts.map((c) => {
      const p = progress[c.id] ?? 0
      return { id: c.id, band: c.band, shape: c.shape, centre: districtCentre(c), progress: p, population: populationFor(c, p) }
    }),
    mountains: mountainProfile(fraction),
    landmark: landmarkStage(fraction),
    courseProgress: fraction,
    camera,
  }
}

/** mulberry32: deterministic small PRNG for prop scatter. */
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
