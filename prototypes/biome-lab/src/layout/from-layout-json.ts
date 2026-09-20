/**
 * Adapter between `docs/design/world/layouts/*.layout.json` and the lab's internal `BiomeLayout`.
 *
 * The layout files were written by hand for three biomes and differ in small ways (`vertices` vs
 * `points`, `growth` vs `growthByBand`, `height` vs `heightM`, top-level vs `ground.` / `land.`
 * numbers). The reader accepts every spelling seen so far and the shared `layout.schema.json`
 * field names; the writer emits the schema spelling. Ice / Chilly Town exports through the same
 * writer with an `ice` extension block so it round-trips (see the tests).
 */
import {
  type AnchorKind,
  type BiomeLayout,
  type DistrictDef,
  type DistrictShape,
  ICE_TOWN_PALETTE,
  type LandmarkMotif,
  type PopulationTable,
  type SkylineBand,
  type SkylineKind,
  type SkylineSpec,
  type TransitLine,
  type WaterBody,
  type WorldColours,
  type WorldFamily,
  type WorldSpec,
  creatureViewportFraction,
  districtChord,
  requiredCreatureScale,
} from './biome-layout'
import type { Pt } from './geometry'

/* ---------- file shape (loose) ---------- */

type Json = Record<string, unknown>
type Num2 = [number, number]

export interface LayoutFileDistrict {
  id: string
  name?: string
  band: number
  anchor?: string
  anchorPosition?: Num2
  shape: { kind?: string; type?: string; vertices?: Num2[]; points?: Num2[]; centreline?: Num2[]; width?: number }
  laneYaw?: number
  stationAzimuth?: number
  building?: string
  buildingHeight?: number | Num2
  buildingHeightM?: number | Num2
  material?: string
  population: Record<string, number> | number[]
  populationNotes?: Record<string, string>
  populationDetail?: Record<string, string>
  extrasAt100?: string
  accent?: string
  accentObject?: string
  features?: string[]
  solitary?: boolean
  camera?: { pitchDeg?: number; azimuthDeg?: number; fitWidth?: number }
  [k: string]: unknown
}

/** The layout file as read from disk; only the fields the adapter uses are typed. */
export interface LayoutFile {
  version?: number
  biome: string
  name?: string
  worldExtent?: number
  frameRadius?: number
  seaLevel?: number
  groundHeight?: number
  relief?: number
  ground?: { seaLevel?: number; groundHeight?: number; relief?: number; shelfHeight?: number }
  palette?: Record<string, string>
  land?: Json
  districts: LayoutFileDistrict[]
  landmark?: Json
  /** Schema (layout.schema.json) top-level blocks. */
  world?: Json
  water?: unknown
  transit?: unknown
  soloIsland?: Json
  ambient?: Json
  scale?: { creatureHeight?: number; creatureScale?: number }
  creature?: { height?: number; scale?: number }
  [k: string]: unknown
}

/* ---------- small readers ---------- */

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback)
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {})
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const pts = (v: unknown): Pt[] => arr<unknown>(v).filter((p) => Array.isArray(p) && p.length >= 2).map((p) => [Number((p as number[])[0]), Number((p as number[])[1])])

function circlePolygon(center: Pt, radius: number, n = 14): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius] as Pt
  })
}

const BAND_KEYS = ['0', '25', '50', '75', '100']

export function readPopulation(p: LayoutFileDistrict['population']): PopulationTable {
  if (Array.isArray(p)) {
    const t = [0, 1, 2, 3, 4].map((i) => num(p[i], p[p.length - 1] ?? 0))
    return t as PopulationTable
  }
  return BAND_KEYS.map((k) => num(p[k], 0)) as PopulationTable
}

function readShape(s: LayoutFileDistrict['shape']): DistrictShape {
  const kind = s.kind ?? s.type ?? (s.centreline ? 'strip' : 'polygon')
  if (kind === 'strip') return { kind: 'strip', centreline: pts(s.centreline), width: num(s.width, 24) }
  return { kind: 'polygon', vertices: pts(s.vertices ?? s.points) }
}

function midHeight(v: unknown, fallback: number): number {
  if (typeof v === 'number') return v
  if (Array.isArray(v) && v.length >= 2) return (Number(v[0]) + Number(v[1])) / 2
  return fallback
}

/* ---------- family, palette ---------- */

export function familyFor(biome: string): WorldFamily {
  if (/academy|college|campus/.test(biome)) return 'academy'
  if (/industr|factory|machin/.test(biome)) return 'industry'
  if (/utopia|future/.test(biome)) return 'utopia'
  if (/candy|sweet|whims/.test(biome)) return 'candy'
  return 'generic'
}

function shade(hex: string, dl: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const v = parseInt(m[1], 16)
  const ch = (c: number) => Math.max(0, Math.min(255, Math.round(c + dl * 255)))
  const r = ch((v >> 16) & 255)
  const g = ch((v >> 8) & 255)
  const b = ch(v & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function resolveColours(p: Record<string, string>): WorldColours {
  const pick = (...keys: string[]): string | undefined => keys.map((k) => p[k]).find((v) => typeof v === 'string')
  const ground = pick('ground', 'lawn', 'snow', 'sugar') ?? '#d9d9d9'
  const water = pick('water', 'riverWater', 'lagoon') ?? '#4f7fa6'
  const accent = pick('accent', 'warning') ?? '#f2b233'
  const paving = pick('paving', 'quayPaving', 'pathCore', 'roadCore', 'plaza') ?? shade(ground, 0.06)
  return {
    ground,
    groundAlt: pick('groundAlt', 'frosting') ?? shade(ground, -0.06),
    paving,
    lawn: pick('lawn', 'mint') ?? ground,
    cliff: pick('cliff', 'riverWall', 'brick') ?? shade(ground, -0.18),
    cliffStrip: pick('cliffStrip'),
    water,
    waterNight: pick('waterNight', 'riverWaterNight') ?? shade(water, -0.22),
    inlandWater: pick('canal', 'riverWater', 'lake') ?? water,
    shore: pick('slag', 'shore', 'groundAlt') ?? shade(ground, -0.2),
    sky: pick('sky') ?? '#dfe6ee',
    skyNight: pick('skyNight') ?? '#22284a',
    fog: pick('fog') ?? pick('sky') ?? '#e9e5df',
    window: pick('window') ?? '#ffe9a8',
    accent,
    accentWarm: pick('accentWarm', 'molten', 'poster') ?? accent,
    ink: pick('ink') ?? '#342d45',
    structureA: pick('limestone', 'structureCream', 'structureWhite', 'marshmallow', 'cream') ?? '#ece6da',
    structureB: pick('brick', 'structureNavy', 'structureSlate', 'strawberry', 'timberRed') ?? '#8a5a5a',
    structureC: pick('verdigris', 'structureBrick', 'structureMint', 'blueberry', 'timberTeal') ?? '#7fa89a',
    glass: pick('glass') ?? '#9fc3d8',
    steel: pick('steel', 'transitPylon', 'ink') ?? '#6b5f7a',
    road: pick('road', 'roadCore') ?? paving,
    roadEdge: pick('roadEdge', 'pathEdge') ?? shade(paving, -0.1),
    rail: pick('rail', 'transitRail') ?? pick('steel') ?? '#6b5f7a',
    tree: pick('tree', 'canopy', 'pine') ?? '#5f9a5a',
    blossom: pick('blossom') ?? pick('accentWarm') ?? accent,
    smoke: pick('smoke', 'steam') ?? '#fff8f0',
    lamp: pick('lamp') ?? pick('window') ?? '#ffe9a8',
  }
}

/* ---------- skyline ---------- */

function skylineKind(raw: string, family: WorldFamily): SkylineKind {
  if (/gantry|crane/.test(raw)) return 'gantry-wall'
  if (/spire|tower|civic/.test(raw)) return 'spire-rows'
  if (/hall/.test(raw)) return 'hall-skyline'
  if (/candy|cream|whip|lollipop/.test(raw)) return 'candy-peaks'
  if (/mountain|range/.test(raw)) return 'mountain-range'
  return family === 'industry' ? 'gantry-wall' : family === 'utopia' ? 'spire-rows' : family === 'academy' ? 'hall-skyline' : family === 'candy' ? 'candy-peaks' : 'mountain-range'
}

function readBand(kind: SkylineKind, b: Json, i: number): SkylineBand {
  const n = (k: string, f = 0) => num(b[k], f)
  switch (kind) {
    case 'hall-skyline':
      return {
        count: n('halls', n('count')),
        height: n('hallHeight', n('height')),
        secondary: n('towers'),
        secondaryHeight: n('towerHeight'),
        tertiary: n('domes'),
        tertiaryHeight: n('domeHeight', n('hallHeight') + 4),
        hero: n('bellTowerHeight', n('heroHeight', n('towerHeight'))),
        rows: b.secondRow ? 2 : n('rows', 1),
        lit: b.clockLit ? 1 : n('lit', i >= 3 ? 1 : 0),
      }
    case 'gantry-wall':
      return {
        count: n('gantries', n('count')),
        height: n('gantryHeight', n('height')),
        secondary: n('chimneys'),
        secondaryHeight: n('chimneyHeight'),
        tertiary: n('coolingTowers'),
        tertiaryHeight: n('coolingTowerHeight'),
        hero: n('heroHeight', n('gantryHeight', n('height')) * 1.1),
        rows: n('rows', n('coolingTowers') > 0 ? 2 : 1),
        lit: n('lit', i >= 3 ? 1 : 0),
      }
    case 'spire-rows':
      return {
        count: n('towers', n('count')),
        height: n('tallestM', n('tallest', n('height'))),
        secondary: n('blocks', Math.floor(n('towers', n('count')) / 2)),
        secondaryHeight: n('blockHeight', n('tallestM', n('height')) * 0.45),
        tertiary: 0,
        tertiaryHeight: 0,
        hero: n('tallestM', n('height')),
        rows: n('rows', 1),
        lit: n('bandsLit', n('lit')),
      }
    case 'candy-peaks':
      return {
        count: n('peaks', n('count')),
        height: n('peakHeight', n('height')),
        secondary: n('lollipops'),
        secondaryHeight: n('lollipopHeight'),
        tertiary: n('clouds'),
        tertiaryHeight: n('cloudHeight'),
        hero: n('heroHeight', n('peakHeight', n('height')) * 1.2),
        rows: n('rows', 1),
        lit: n('lit', i >= 3 ? 1 : 0),
      }
    default:
      return {
        count: n('peaks', n('count', [3, 5, 6, 8, 9][i])),
        height: n('height', [0.42, 0.6, 0.76, 0.9, 1][i] * 34),
        secondary: 0,
        secondaryHeight: 0,
        tertiary: 0,
        tertiaryHeight: 0,
        hero: 0,
        rows: n('rows', i >= 3 ? 3 : i >= 2 ? 2 : 1),
        lit: 0,
      }
  }
}

function readSkyline(land: Json, family: WorldFamily, worldExtent: number): SkylineSpec {
  const s = obj(land.skyline)
  const kind = skylineKind(str(s.kind, ''), family)
  // Schema: `range: { arcZ, arcCurve, footDepth }` (and `arc` as a sampled polyline); older files: `arc: { arcZ, ... }`.
  const arc = Array.isArray(s.arc) ? obj(s.range) : obj(s.range ?? s.arc)
  const arcZ = num(arc.arcZ, -86)
  const footDepth = num(arc.footDepth, 12)
  const footZ = num(s.footZ, num(arc.footZ, arcZ + footDepth))
  const rawGrowth = obj(s.growth ?? s.growthByBand)
  const growth = BAND_KEYS.map((k, i) => readBand(kind, obj(rawGrowth[k] ?? rawGrowth[String(i)]), i)) as SkylineSpec['growth']
  const extras = obj(s.extras)
  const hero = obj(s.bellTower ?? s.hero ?? extras.bellTower ?? extras.hero)
  const heroPos = pts([hero.position])[0]
  return {
    kind,
    arcZ,
    arcCurve: num(arc.arcCurve, 0.001),
    footZ,
    fogStartZ: num(s.fogStartZ, footZ - 10),
    fogOpaqueZ: num(s.fogOpaqueZ, -worldExtent),
    pitch: num(s.gantryPitchX, num(s.hallSpacing, num(s.pitch, num(extras.gantryPitchX, num(extras.hallSpacing, 16))))),
    growth,
    heroPosition: heroPos,
  }
}

/* ---------- water, transit, landmark, island ---------- */

function readWater(file: LayoutFile, land: Json, family: WorldFamily, colours: WorldColours): WaterBody[] {
  const out: WaterBody[] = []
  for (const raw of arr<Json>(file.water ?? land.water)) {
    const id = str(raw.id, `water-${out.length}`)
    const rawKind = str(raw.kind, 'lake')
    const kind: WaterBody['kind'] =
      rawKind === 'channel' ? 'canal' : rawKind === 'harbour' || rawKind === 'sea' ? 'sea' : (['lake', 'river', 'canal', 'basin', 'lagoon', 'pool', 'pond'] as const).includes(rawKind as never) ? (rawKind as WaterBody['kind']) : 'lake'
    const colour = str(raw.color ?? raw.hex ?? raw.colour, colours.inlandWater)
    // Schema: `geometry: { kind: polygon | polyline | disc | complement, ... }`; older files put the fields on the body.
    const g = obj(raw.geometry)
    const complement = g.kind === 'complement'
    const polygon = pts(g.vertices ?? raw.polygon)
    const centreline = pts(g.centreline ?? raw.centreline)
    const center = pts([g.center ?? raw.center])[0]
    const radius = num(g.radius ?? raw.radius, 0)
    const innerRadius = num(g.innerRadius ?? raw.innerRadius, 0)
    const width = num(g.width ?? raw.width, 6)
    if (complement || kind === 'sea' || kind === 'lagoon' || (kind === 'basin' && !center && polygon.length < 3) || (kind === 'river' && polygon.length >= 3 && centreline.length < 2)) {
      // Open water: the sea plane outside the land. A river drawn as the whole front basin is the sea.
      out.push({ id, kind: kind === 'river' ? 'river' : kind === 'basin' ? 'basin' : kind, inland: false, colour })
      continue
    }
    if ((kind === 'pool' || innerRadius > 0) && center) {
      out.push({ id, kind: 'pool', inland: true, colour, centreline: [center], width: radius * 2, innerRadius: innerRadius || undefined })
      continue
    }
    if (polygon.length >= 3) out.push({ id, kind, inland: true, colour, polygon })
    else if (centreline.length >= 2) out.push({ id, kind, inland: true, colour, centreline, width })
    else if (center && radius > 0) out.push({ id, kind, inland: true, colour, polygon: circlePolygon(center, radius) })
    const basin = obj(raw.basin ?? raw.turningBasin)
    const bc = pts([basin.center])[0]
    if (bc) out.push({ id: `${id}-basin`, kind: 'basin', inland: true, colour, polygon: circlePolygon(bc, num(basin.radius, 6)) })
  }
  void family
  return out
}

function readTransit(file: LayoutFile, land: Json, colours: WorldColours): TransitLine[] {
  const out: TransitLine[] = []
  // Schema: one flat `transit[]` with kind road | path | rail | pipe | conveyor | monorail and `polyline`.
  for (const raw of arr<Json>(file.transit)) {
    const points = pts(raw.polyline ?? raw.route ?? raw.points)
    if (points.length < 2) continue
    const kind = str(raw.kind, 'path')
    const id = str(raw.id, `${kind}-${out.length}`)
    const elevation = num(raw.elevation, 0)
    const closed = raw.closed === true
    const colour = str(raw.color, colours.paving)
    if (kind === 'monorail') {
      const stations = arr<Json>(raw.stations).map((s) => ({ at: pts([s.at])[0] ?? points[0], name: str(s.name, ''), district: typeof s.district === 'string' ? s.district : undefined }))
      const pods = obj(obj(raw.extras).pods)
      out.push({ id, kind: 'monorail-loop', points, closed, height: elevation || 6, width: 2.4, stations, minBand: 0, colour: str(raw.color, colours.rail), vehicles: { count: num(pods.count, 4), speed: num(pods.speedMps, 6), dwell: num(pods.dwellS, 4), body: str(pods.bodyHex, '#ffffff'), nose: str(pods.noseHex, colours.accentWarm) } })
    } else if (kind === 'rail') {
      const spine = /spine|main/.test(id)
      out.push({ id, kind: 'rail-spine', points, closed, height: 0, width: num(raw.width, 1.4) + 1.2, minBand: 0, colour: str(raw.color, colours.rail), event: spine ? { every: [60, 120], visible: 30 } : undefined })
    } else if (kind === 'pipe') {
      out.push({ id, kind: 'pipe-rack', points, closed, height: elevation || 4, width: num(raw.width, 1.2), minBand: 0, colour: str(raw.color, '#4f8fb0') })
    } else if (kind === 'conveyor') {
      out.push({ id, kind: 'conveyor', points, closed, height: elevation || 6, width: num(raw.width, 2.4), minBand: Math.round(num(raw.appearsAtBand, 75) / 25), colour: str(raw.color, colours.steel) })
    } else if (kind === 'road') {
      out.push({ id, kind: 'road', points, closed, height: 0, width: num(raw.edgeWidth ?? raw.width, 5), minBand: 0, colour: str(raw.color, colours.road) })
    } else {
      out.push({ id, kind: kind === 'causeway' ? 'causeway' : 'path', points, closed, height: 0, width: num(raw.width, 3), minBand: num(raw.minBand, 0), colour })
    }
  }
  if (out.length) return out
  for (const raw of arr<Json>(land.transit)) {
    const route = pts(raw.route ?? raw.points)
    if (route.length < 2) continue
    const pods = obj(raw.pods)
    const stations = arr<Json>(raw.stations).map((s) => ({ at: pts([s.at])[0] ?? route[0], name: str(s.name, ''), district: typeof s.district === 'string' ? s.district : undefined }))
    out.push({
      id: str(raw.id, `transit-${out.length}`),
      kind: /rail-spine|train/.test(str(raw.kind, '')) ? 'rail-spine' : 'monorail-loop',
      points: route,
      closed: raw.closed !== false,
      height: num(raw.heightM ?? raw.height, 6),
      width: 2.4,
      stations,
      minBand: 0,
      colour: str(raw.railHex, colours.rail),
      vehicles: { count: num(pods.count, 4), speed: num(pods.speedMps, 6), dwell: num(pods.dwellS, 4), body: str(pods.bodyHex, '#ffffff'), nose: str(pods.noseHex, colours.accentWarm) },
    })
  }
  for (const raw of arr<Json>(land.rail)) {
    const points = pts(raw.points)
    if (points.length < 2) continue
    const spine = /spine|main/.test(str(raw.id, ''))
    out.push({ id: str(raw.id, `rail-${out.length}`), kind: 'rail-spine', points, closed: false, height: 0, width: num(raw.gauge, 1.4) + 1.2, minBand: 0, colour: colours.rail, event: spine ? { every: [60, 120], visible: 30 } : undefined })
  }
  for (const raw of arr<Json>(land.roads)) {
    const points = pts(raw.points ?? raw.centreline)
    if (points.length < 2) continue
    out.push({ id: str(raw.id, `road-${out.length}`), kind: 'road', points, closed: false, height: 0, width: num(raw.edgeWidth ?? raw.width, 5), minBand: 0, colour: colours.road })
  }
  const riverRoad = obj(land.riverRoad)
  const rr = pts(riverRoad.centreline)
  if (rr.length >= 2) out.push({ id: 'river-road', kind: 'road', points: rr, closed: false, height: 0, width: num(riverRoad.width, 5), minBand: 0, colour: colours.road })
  for (const raw of arr<Json>(land.paths)) {
    const points = pts(raw.points ?? raw.centreline)
    if (points.length < 2) continue
    out.push({ id: str(raw.id, `path-${out.length}`), kind: raw.kind === 'causeway' ? 'causeway' : 'path', points, closed: raw.closed === true, height: 0, width: num(raw.width, 3), minBand: num(raw.minBand, 0), colour: colours.paving })
  }
  for (const raw of arr<Json>(land.pipes)) {
    const points = pts(raw.points)
    if (points.length < 2) continue
    out.push({ id: str(raw.id, `pipe-${out.length}`), kind: 'pipe-rack', points, closed: false, height: num(raw.elevation, 4), width: num(raw.diameter, 1.2), minBand: 0, colour: str(raw.colour, '#4f8fb0') })
  }
  for (const raw of arr<Json>(land.conveyors)) {
    const points = pts(raw.points)
    if (points.length < 2) continue
    out.push({ id: str(raw.id, `conveyor-${out.length}`), kind: 'conveyor', points, closed: false, height: num(raw.elevation, 6), width: num(raw.width, 2.4), minBand: Math.round(num(raw.appearsAtBand, 75) / 25), colour: colours.steel })
  }
  return out
}

function landmarkMotif(lm: Json, family: WorldFamily): LandmarkMotif {
  const text = `${str(lm.motif, '')} ${str(lm.id, '')} ${arr<Json>(lm.stages).map((s) => str(s.name, '')).join(' ')}`.toLowerCase()
  if (/gear|press|works/.test(text)) return 'gear'
  if (/spire|needle/.test(text)) return 'spire'
  if (/castle|keep/.test(text)) return 'castle'
  if (/light ?house|beacon/.test(text)) return 'lighthouse'
  if (/dome|hall|lectern/.test(text)) return 'dome'
  return family === 'industry' ? 'gear' : family === 'utopia' ? 'spire' : family === 'candy' ? 'castle' : 'dome'
}

function readLandmark(file: LayoutFile, family: WorldFamily, fallback: Pt): WorldSpec['landmark'] {
  const lm = obj(file.landmark)
  const position = pts([lm.position])[0] ?? fallback
  const plinth = obj(lm.court ?? lm.plinth ?? lm.slab)
  const slabPoly = pts(plinth.polygon)
  // Schema: stages keyed by id (`{ s1: {...}, s2: {...} }`); older files used an array.
  const rawStages: Json[] = Array.isArray(lm.stages) ? arr<Json>(lm.stages) : Object.entries(obj(lm.stages)).map(([id, s]) => ({ id, ...obj(s) }))
  const stages = rawStages.map((s, i) => {
    const height = num(s.height ?? s.heightM, [4, 9, 16][i] ?? 10)
    const fp = pts([s.footprint])[0]
    return { id: str(s.id, `s${i + 1}`), name: str(s.name, `stage ${i + 1}`), height, footprint: (fp ?? [height * 0.7, height * 0.55]) as [number, number] }
  })
  while (stages.length < 3) {
    const i = stages.length
    stages.push({ id: `s${i + 1}`, name: `stage ${i + 1}`, height: [4, 9, 16][i], footprint: [[6, 4], [14, 10], [20, 14]][i] as [number, number] })
  }
  return {
    position,
    plinthRadius: num(plinth.radius, slabPoly.length ? 11 : 8),
    plinthHeight: num(plinth.height ?? plinth.heightM, 0.6),
    plinthPolygon: slabPoly.length >= 3 ? slabPoly : undefined,
    causeway: pts(plinth.causeway),
    motif: landmarkMotif(lm, family),
    stages,
  }
}

function readSoloIsland(file: LayoutFile, land: Json, districts: DistrictDef[]): WorldSpec['soloIsland'] {
  const raw = obj(file.soloIsland ?? land.soloIsland)
  const center = pts([raw.center])[0]
  if (!center) return undefined
  const radius = num(raw.radius, 12)
  let polygon = pts(raw.polygon ?? raw.outline)
  const owner = districts.find((d) => d.solitary || d.id === raw.district || d.id === raw.id)
  if (polygon.length < 3 && owner?.shape.kind === 'polygon') polygon = owner.shape.vertices
  if (polygon.length < 3) polygon = circlePolygon(center, radius)
  return { id: str(raw.id, owner?.id ?? 'island'), center, radius, polygon, districtId: owner?.id }
}

/* ---------- districts ---------- */

const ANCHOR_RULES: Array<[RegExp, AnchorKind]> = [
  [/boathouse|dock spur|chapel/, 'dock-chapel'],
  [/axis|lawn|court/, 'court-axis'],
  [/arcade|column comb|corridor|lane with/, 'arcade'],
  [/portal|transit canopy|fountain dot|stall/, 'portal-fountain'],
  [/observatory|dome \+ the dock/, 'observatory'],
  [/quay crane|container/, 'quay-crane'],
  [/blast furnace|furnace/, 'blast-furnace'],
  [/water tower|sawtooth/, 'water-tower'],
  [/three tanks|tanks|pipe rack/, 'tank-trio'],
  [/walking beam|seesaw|pump/, 'walking-beam'],
  [/hub arch|transit hub|ring reflecting|ring pool/, 'transit-hub'],
  [/footbridge|canal/, 'canal-bridges'],
  [/lens dome|civic hall/, 'lens-dome'],
  [/mooring mast|h-pad/, 'mooring-mast'],
  [/garden dome|glass dome/, 'garden-dome'],
  [/sundae|parfait fountain/, 'sundae-fountain'],
  [/candy gate|wafer gate|macaron/, 'candy-gate'],
  [/cupcake/, 'cupcake-stand'],
  [/lollipop/, 'lollipop-ring'],
  [/gumdrop|well/, 'gumdrop-well'],
]

/** Schema: `anchor` is an object `{ id, description, position, footprint }`; older files used a string. */
function anchorText(d: LayoutFileDistrict): string {
  const a = d.anchor as unknown
  if (typeof a === 'string') return a
  const o = obj(a)
  return `${str(o.id, '')} ${str(o.description, '')}`.trim()
}

function anchorPosition(d: LayoutFileDistrict): [number, number] | undefined {
  const fromObj = pts([obj(d.anchor as unknown).position])[0]
  if (fromObj) return fromObj
  return Array.isArray(d.anchorPosition) ? [Number(d.anchorPosition[0]), Number(d.anchorPosition[1])] : undefined
}

export function inferAnchorKind(d: LayoutFileDistrict): AnchorKind {
  const text = `${anchorText(d)} ${d.id} ${d.building ?? ''}`.toLowerCase()
  for (const [re, kind] of ANCHOR_RULES) if (re.test(text)) return kind
  return 'none'
}

function readDistrict(d: LayoutFileDistrict, palette: Record<string, string>): DistrictDef {
  const camera = d.camera ?? {}
  const notes = d.populationNotes ?? d.populationDetail
  return {
    id: d.id,
    name: d.name ?? d.id,
    band: d.band,
    anchor: anchorText(d),
    shape: readShape(d.shape),
    laneYaw: num(d.laneYaw, 0),
    stationAzimuth: num(camera.azimuthDeg, num(d.stationAzimuth, Number.NaN)) || undefined,
    stationPitch: typeof camera.pitchDeg === 'number' ? camera.pitchDeg : undefined,
    stationFit: typeof camera.fitWidth === 'number' ? camera.fitWidth : undefined,
    building: d.building ?? 'house',
    population: readPopulation(d.population),
    accent: d.accent ?? palette.accent ?? '#f2b233',
    material: d.material ?? 'ground',
    buildingHeight: midHeight(d.buildingHeight ?? d.buildingHeightM, 5.5),
    features: Array.isArray(d.features) ? d.features.map(String) : undefined,
    anchorKind: inferAnchorKind(d),
    anchorPosition: anchorPosition(d),
    solitary: d.solitary === true,
    extrasAt100: d.extrasAt100 ?? (typeof d.extras100 === 'string' ? d.extras100 : undefined) ?? notes?.['100'],
  }
}

/* ---------- mainland ---------- */

function readMainland(land: Json, backZ: number, worldExtent: number): Pt[] {
  const mainland = obj(land.mainland)
  const fromMainland = pts(mainland.vertices ?? mainland.polygon)
  if (fromMainland.length >= 3) return fromMainland
  // Schema: `land.outline: { kind: 'polygon', vertices }`; older files used a bare point list.
  const outline = Array.isArray(land.outline) ? pts(land.outline) : pts(obj(land.outline).vertices)
  if (outline.length >= 3) return outline
  const bank = pts(land.riverBank ?? obj(land.river).bank)
  if (bank.length >= 2) {
    // Land north of the river bank, running off into the back fog.
    const far = backZ - worldExtent
    return [...bank, [bank[bank.length - 1][0], far], [bank[0][0], far]]
  }
  const r = num(land.islandRadius, worldExtent * 0.9)
  return circlePolygon([0, 0], r, 24)
}

/* ---------- the adapter ---------- */

export interface AdapterReport {
  /** Creature scale the rule required vs. the one the file gave. */
  creatureScale: { given: number | null; used: number }
  /** Things read from the file that the lab cannot render (kept for the report). */
  unrendered: string[]
}

export function fromLayoutJson(file: LayoutFile, report?: AdapterReport): BiomeLayout {
  const ice = obj(obj(file.land).ice)
  const palette = file.palette ?? {}
  const land = obj(file.land)
  const ground = obj(file.ground)
  // Schema: `world: { extent, frameRadius, seaLevel, groundHeight, relief }`; older files: top-level or `ground.` / `land.`.
  const w0 = obj(file.world)
  const worldExtent = num(w0.extent, num(file.worldExtent, num(land.worldExtent, 100)))
  const frameRadius = num(w0.frameRadius, num(file.frameRadius, num(land.frameRadius, worldExtent * 0.92)))
  const seaLevel = num(w0.seaLevel, num(file.seaLevel, num(ground.seaLevel, num(land.seaLevel, -0.4))))
  const groundHeight = num(w0.groundHeight, num(file.groundHeight, num(ground.groundHeight, num(land.groundHeight, 1.4))))
  const relief = num(w0.relief, num(file.relief, num(ground.relief, num(land.relief, 0.3))))
  const extras = obj(land.extras)
  const ambient = obj(file.ambient)
  const creatureHeight = num(file.scale?.creatureHeight, num(file.creature?.height, 1.8))
  const givenScale = typeof file.scale?.creatureScale === 'number' ? file.scale.creatureScale : typeof file.creature?.scale === 'number' ? file.creature.scale : null

  const districts = file.districts.map((d) => readDistrict(d, palette))

  /* Ice / Chilly Town round-trip: the ice extension block restores the built-in fields. */
  if (Object.keys(ice).length) {
    const layout: BiomeLayout = {
      id: file.biome,
      name: file.name ?? file.biome,
      worldExtent,
      frameRadius,
      seaLevel,
      groundHeight,
      shelfHeight: num(ground.shelfHeight, num(ice.shelfHeight, 0.45)),
      relief,
      mainland: ice.mainland as BiomeLayout['mainland'],
      range: ice.range as BiomeLayout['range'],
      shelfEndX: num(ice.shelfEndX, -102),
      lake: ice.lake as BiomeLayout['lake'],
      river: pts(ice.river),
      riverWidth: num(ice.riverWidth, 4.4),
      outcrop: ice.outcrop as BiomeLayout['outcrop'],
      iceArch: ice.iceArch as BiomeLayout['iceArch'],
      miniIsland: ice.miniIsland as BiomeLayout['miniIsland'],
      headland: ice.headland as BiomeLayout['headland'],
      whaleArc: ice.whaleArc as BiomeLayout['whaleArc'],
      harbourShore: ice.harbourShore as BiomeLayout['harbourShore'],
      forestMargin: num(ice.forestMargin, 24),
      creatureHeight,
      creatureScale: givenScale ?? 1.65,
      districts: districts.map(stripWorldFields),
    }
    if (report) report.creatureScale = { given: givenScale, used: layout.creatureScale }
    return layout
  }

  const family = familyFor(file.biome)
  const colours = resolveColours(palette)
  const skyline = readSkyline(land, family, worldExtent)
  const backZ = skyline.footZ
  const mainland = readMainland(land, backZ, worldExtent)
  const landmark = readLandmark(file, family, [0, -20])
  const soloIsland = readSoloIsland(file, land, districts)
  const water = readWater(file, land, family, colours)
  const transit = readTransit(file, land, colours)

  // River walk along the bank (older academy file): a path offset inland from the bank line.
  const bank = pts(land.riverBank)
  const walk = obj(land.riverWalk)
  if (bank.length >= 2 && Object.keys(walk).length && !transit.some((t) => t.id === 'river-walk')) {
    const off = Math.abs(num(walk.offsetFromBank, 2))
    transit.push({ id: 'river-walk', kind: 'path', points: bank.map(([x, z]) => [x, z - off] as Pt), closed: false, height: 0, width: num(walk.width, 2.5), minBand: 0, colour: colours.paving })
  }

  const patches: WorldSpec['patches'] = []
  for (const raw of arr<Json>(land.lawns ?? extras.lawns)) {
    const poly = pts(raw.vertices ?? raw.polygon)
    if (poly.length >= 3) patches.push({ id: str(raw.id, `lawn-${patches.length}`), polygon: poly, material: 'lawn' })
  }
  const slag = obj(land.slagShore ?? extras.slagShore)
  const slagPoly = pts(slag.polygon)
  if (slagPoly.length >= 3) patches.push({ id: 'slag-shore', polygon: slagPoly, material: 'shore' })
  for (const raw of arr<Json>(land.patches)) {
    const poly = pts(raw.polygon ?? raw.vertices)
    const m = str(raw.material, 'paving')
    if (poly.length >= 3) patches.push({ id: str(raw.id, `patch-${patches.length}`), polygon: poly, material: (['lawn', 'paving', 'shore', 'groundAlt'] as const).includes(m as never) ? (m as 'lawn') : 'paving' })
  }

  const ce = obj(land.creatureEvent ?? ambient.creatureEvent)
  const ceArc = obj(ce.arc)
  const ceCenter = pts([ceArc.center])[0]
  const creatureEvent: WorldSpec['creatureEvent'] = ceCenter
    ? { arc: { center: ceCenter, radius: num(ceArc.radius, 10) }, body: str(ce.hex ?? ce.color, '#4f6378'), belly: str(ce.bellyHex ?? ce.bellyColor, '#e3f2ec'), kind: /manta|ray/.test(str(ce.id, '')) ? 'manta' : 'whale' }
    : undefined

  const river = obj(land.river ?? extras.river)
  const loop = obj(river.sailboatLoop ?? ambient.sailboatLoop ?? land.boats)
  const loopCenter = pts([loop.center])[0]
  const boats: WorldSpec['boats'] = loopCenter
    ? { center: loopCenter, rx: num(loop.rx, 40), rz: num(loop.ry ?? loop.rz, 12), count: num(loop.boats ?? loop.count, 3), sail: palette[str(loop.sail, 'accent')] ?? colours.accent, hull: palette[str(loop.hull, 'limestone')] ?? colours.structureA, speed: num(loop.speed, 1.2) }
    : undefined

  const coast: WorldSpec['coast'] = family === 'industry' ? 'quay' : family === 'utopia' ? 'glass' : family === 'candy' ? 'plush' : 'cliff'
  const cliff = obj(land.coastCliff ?? land.cliff)
  const world: WorldSpec = {
    family,
    palette,
    colours,
    mainland,
    backZ,
    coast,
    cliffDrop: num(cliff.height ?? cliff.dropM, num(obj(land.riverWall).height, num(ground.quayWallHeight, 1.8))),
    coastWobble: coast === 'plush' ? 2.4 : coast === 'cliff' ? 0.5 : 0,
    water,
    transit,
    skyline,
    landmark,
    soloIsland,
    patches,
    creatureEvent,
    boats,
  }

  const layout: BiomeLayout = {
    id: file.biome,
    name: file.name ?? file.biome,
    worldExtent,
    frameRadius,
    seaLevel,
    groundHeight,
    shelfHeight: seaLevel,
    relief,
    // Ice-only fields, neutral: the generic terrain never reads them.
    mainland: { center: [0, 0], rx: worldExtent, rz: worldExtent, lobes: [] },
    range: { arcZ: skyline.arcZ, arcCurve: skyline.arcCurve, footDepth: skyline.footZ - skyline.arcZ, footRise: 0 },
    shelfEndX: -1e6,
    lake: { center: [0, 1e6], radius: 0, openWater: [] },
    river: [
      [0, 1e6],
      [1, 1e6],
    ],
    riverWidth: 0,
    outcrop: { center: [0, 1e6], radius: 0, height: 0, caveYaw: 0 },
    iceArch: { center: [0, 1e6], yaw: 0, span: 0, height: 0 },
    miniIsland: soloIsland ? { center: soloIsland.center, radius: soloIsland.radius } : { center: [0, 1e6], radius: 0 },
    headland: { center: landmark.position, radius: landmark.plinthRadius },
    whaleArc: creatureEvent ? creatureEvent.arc : { center: [0, 1e6], radius: 1 },
    harbourShore: { slopeLength: 20, rise: 0 },
    forestMargin: 0,
    creatureHeight,
    creatureScale: 1,
    districts,
    world,
  }

  // The scale rule: every district station must show a creature at ≥ 6 % of the viewport height.
  let required = givenScale ?? 1
  for (const d of districts) {
    const az = d.stationAzimuth ?? 30
    const chord = districtChord(d, az)
    required = Math.max(required, requiredCreatureScale(creatureHeight, chord, d.stationFit ?? 0.75, 16 / 9, d.stationPitch ?? 30))
  }
  layout.creatureScale = Math.round(required * 100) / 100
  if (report) {
    report.creatureScale = { given: givenScale, used: layout.creatureScale }
    for (const d of districts) {
      const frac = creatureViewportFraction(creatureHeight * layout.creatureScale, districtChord(d, d.stationAzimuth ?? 30), d.stationFit ?? 0.75, 16 / 9, d.stationPitch ?? 30)
      if (frac < 0.06 - 1e-6) report.unrendered.push(`${d.id}: creature ${(frac * 100).toFixed(1)} % < 6 %`)
    }
  }
  return layout
}

function stripWorldFields(d: DistrictDef): DistrictDef {
  const out: DistrictDef = {
    id: d.id,
    name: d.name,
    band: d.band,
    anchor: d.anchor,
    shape: d.shape,
    laneYaw: d.laneYaw,
    building: d.building,
    population: d.population,
    accent: d.accent,
    material: d.material,
  }
  if (d.stationAzimuth !== undefined) out.stationAzimuth = d.stationAzimuth
  return out
}

/* ---------- writer ---------- */

/** The lab's internal layout in the shared layout-file shape (schema spelling). */
export function toLayoutJson(layout: BiomeLayout): LayoutFile {
  const districts: LayoutFileDistrict[] = layout.districts.map((d) => {
    const out: LayoutFileDistrict = {
      id: d.id,
      name: d.name,
      band: d.band,
      anchor: d.anchor,
      shape: d.shape.kind === 'polygon' ? { kind: 'polygon', vertices: d.shape.vertices } : { kind: 'strip', centreline: d.shape.centreline, width: d.shape.width },
      laneYaw: d.laneYaw,
      building: d.building,
      material: d.material,
      population: Object.fromEntries(BAND_KEYS.map((k, i) => [k, d.population[i]])),
      accent: d.accent,
    }
    if (d.stationAzimuth !== undefined) {
      out.stationAzimuth = d.stationAzimuth
      out.camera = { pitchDeg: d.stationPitch ?? 30, azimuthDeg: d.stationAzimuth, fitWidth: d.stationFit ?? 0.75 }
    }
    if (d.anchorPosition) out.anchorPosition = d.anchorPosition
    if (d.features) out.features = d.features
    if (d.solitary) out.solitary = true
    if (d.buildingHeight !== undefined && layout.world) out.buildingHeight = d.buildingHeight
    return out
  })
  const w = layout.world
  const growthKeys = (kind: SkylineKind, b: SkylineBand): Json => {
    switch (kind) {
      case 'hall-skyline':
        return { halls: b.count, hallHeight: b.height, towers: b.secondary, towerHeight: b.secondaryHeight, domes: b.tertiary, bellTowerHeight: b.hero, secondRow: b.rows > 1, clockLit: b.lit > 0 }
      case 'gantry-wall':
        return { gantries: b.count, gantryHeight: b.height, chimneys: b.secondary, chimneyHeight: b.secondaryHeight, coolingTowers: b.tertiary, coolingTowerHeight: b.tertiaryHeight }
      case 'spire-rows':
        return { towers: b.count, tallestM: b.height, rows: b.rows, bandsLit: b.lit }
      case 'candy-peaks':
        return { peaks: b.count, peakHeight: b.height, lollipops: b.secondary, lollipopHeight: b.secondaryHeight, clouds: b.tertiary, cloudHeight: b.tertiaryHeight, rows: b.rows }
      default:
        return { peaks: b.count, height: b.height, rows: b.rows }
    }
  }
  const land: Json = w
    ? {
        worldExtent: layout.worldExtent,
        frameRadius: layout.frameRadius,
        mainland: { kind: 'polygon', vertices: w.mainland },
        skyline: {
          kind: w.skyline.kind,
          arc: { arcZ: w.skyline.arcZ, arcCurve: w.skyline.arcCurve, footDepth: w.skyline.footZ - w.skyline.arcZ },
          footZ: w.skyline.footZ,
          fogStartZ: w.skyline.fogStartZ,
          fogOpaqueZ: w.skyline.fogOpaqueZ,
          pitch: w.skyline.pitch,
          growth: Object.fromEntries(BAND_KEYS.map((k, i) => [k, growthKeys(w.skyline.kind, w.skyline.growth[i])])),
        },
        water: w.water.map((b) => ({ id: b.id, kind: b.kind, colour: b.colour, ...(b.polygon ? { polygon: b.polygon } : {}), ...(b.centreline ? { centreline: b.centreline, width: b.width } : {}) })),
        transit: w.transit.filter((t) => t.kind === 'monorail-loop').map((t) => ({ id: t.id, kind: t.kind, route: t.points, closed: t.closed, heightM: t.height, stations: t.stations })),
        rail: w.transit.filter((t) => t.kind === 'rail-spine').map((t) => ({ id: t.id, points: t.points })),
        roads: w.transit.filter((t) => t.kind === 'road').map((t) => ({ id: t.id, points: t.points, width: t.width })),
        paths: w.transit.filter((t) => t.kind === 'path' || t.kind === 'causeway').map((t) => ({ id: t.id, kind: t.kind, points: t.points, width: t.width })),
        ...(w.soloIsland ? { soloIsland: { id: w.soloIsland.id, center: w.soloIsland.center, radius: w.soloIsland.radius, polygon: w.soloIsland.polygon } } : {}),
      }
    : {
        skyline: {
          kind: 'mountain-range',
          arc: layout.range,
          growth: Object.fromEntries(BAND_KEYS.map((k, i) => [k, { peaks: [3, 5, 6, 8, 9][i], heightScale: [0.42, 0.6, 0.76, 0.9, 1][i], rows: i >= 3 ? 3 : i >= 2 ? 2 : 1 }])),
        },
        miniIsland: layout.miniIsland,
        headland: layout.headland,
        ice: {
          mainland: layout.mainland,
          range: layout.range,
          shelfEndX: layout.shelfEndX,
          shelfHeight: layout.shelfHeight,
          lake: layout.lake,
          river: layout.river,
          riverWidth: layout.riverWidth,
          outcrop: layout.outcrop,
          iceArch: layout.iceArch,
          miniIsland: layout.miniIsland,
          headland: layout.headland,
          whaleArc: layout.whaleArc,
          harbourShore: layout.harbourShore,
          forestMargin: layout.forestMargin,
        },
      }
  return {
    version: 1,
    biome: layout.id,
    name: layout.name,
    worldExtent: layout.worldExtent,
    frameRadius: layout.frameRadius,
    seaLevel: layout.seaLevel,
    groundHeight: layout.groundHeight,
    relief: layout.relief,
    ground: { seaLevel: layout.seaLevel, groundHeight: layout.groundHeight, relief: layout.relief, shelfHeight: layout.shelfHeight },
    palette: w ? w.palette : { ...ICE_TOWN_PALETTE },
    land,
    districts,
    landmark: w
      ? { position: w.landmark.position, motif: w.landmark.motif, plinth: { radius: w.landmark.plinthRadius, height: w.landmark.plinthHeight, ...(w.landmark.plinthPolygon ? { polygon: w.landmark.plinthPolygon } : {}) }, stages: w.landmark.stages }
      : { position: layout.headland.center, motif: 'lighthouse', plinth: { radius: layout.headland.radius, height: 0.5 }, stages: [{ id: 's1', name: 'igloo', height: 2 }, { id: 's2', name: 'observatory', height: 5 }, { id: 's3', name: 'lighthouse', height: 9 }] },
    scale: { creatureHeight: layout.creatureHeight, creatureScale: layout.creatureScale },
  }
}
