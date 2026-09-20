#!/usr/bin/env node
/**
 * Validates every *.layout.json in this folder against layout.schema.json and the design rules
 * from docs/design/world/biome-lab-fix-plan.md (Review 2) and biome-factory-handoff.md (Lessons).
 *
 *   node validate.mjs            # all files
 *   node validate.mjs foo.layout.json [...]
 *   node validate.mjs --verbose   # also print every measured clearance
 *
 * No dependencies beyond Node >= 18. Exits 1 on any violation, printing one line per violation.
 * The schema checker below covers the JSON Schema 2020-12 subset the schema uses (type, const, enum,
 * required, properties, additionalProperties, propertyNames, items, min/max, pattern, oneOf, anyOf,
 * local $ref). It is not a general-purpose validator.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const MIN_DISTRICT_GAP = 20
const MIN_ISLAND_GAP = 15
const MIN_LANDMARK_GAP = 15
const BANDS = ['0', '25', '50', '75', '100']
/** Tolerance so a gap authored at exactly 15.0 or 20.0 m is not rejected on floating-point noise. */
const EPS = 1e-6

/* ---------- minimal JSON Schema 2020-12 checker ---------- */

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`only local $ref supported: ${ref}`)
  return ref
    .slice(2)
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((node, key) => {
      if (node === undefined || node[key] === undefined) throw new Error(`bad $ref: ${ref}`)
      return node[key]
    }, root)
}

function typeOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  return typeof value
}

function matchesType(value, type) {
  const actual = typeOf(value)
  if (type === 'number') return actual === 'number' || actual === 'integer'
  return actual === type
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Appends "path: message" strings to `out` and returns it (empty when valid). */
function checkSchema(root, schema, value, path, out) {
  checkNode(root, schema, value, path, out)
  return out
}

function checkNode(root, schema, value, path, out) {
  if (schema === true) return
  if (schema === false) {
    out.push(`${path}: not allowed`)
    return
  }
  if (schema.$ref) {
    const target = resolveRef(root, schema.$ref)
    const before = out.length
    checkSchema(root, target, value, path, out)
    if (out.length > before) return
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some((t) => matchesType(value, t))) {
      out.push(`${path}: expected ${types.join(' | ')}, got ${typeOf(value)}`)
      return
    }
  }
  if (schema.const !== undefined && !deepEqual(value, schema.const)) out.push(`${path}: must equal ${JSON.stringify(schema.const)}`)
  if (schema.enum && !schema.enum.some((e) => deepEqual(e, value))) out.push(`${path}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`)

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) out.push(`${path}: ${value} < minimum ${schema.minimum}`)
    if (schema.maximum !== undefined && value > schema.maximum) out.push(`${path}: ${value} > maximum ${schema.maximum}`)
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) out.push(`${path}: ${value} must be > ${schema.exclusiveMinimum}`)
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) out.push(`${path}: ${value} must be < ${schema.exclusiveMaximum}`)
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) out.push(`${path}: shorter than ${schema.minLength}`)
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) out.push(`${path}: "${value}" does not match ${schema.pattern}`)
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) out.push(`${path}: needs >= ${schema.minItems} items, has ${value.length}`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) out.push(`${path}: needs <= ${schema.maxItems} items, has ${value.length}`)
    if (schema.uniqueItems) {
      const seen = new Set(value.map((v) => JSON.stringify(v)))
      if (seen.size !== value.length) out.push(`${path}: items must be unique`)
    }
    if (schema.items !== undefined) value.forEach((v, i) => checkSchema(root, schema.items, v, `${path}[${i}]`, out))
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value)
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) out.push(`${path}: needs >= ${schema.minProperties} properties`)
    for (const req of schema.required ?? []) if (!(req in value)) out.push(`${path}: missing required "${req}"`)
    if (schema.propertyNames) for (const k of keys) checkSchema(root, schema.propertyNames, k, `${path}.${k} (name)`, out)
    for (const k of keys) {
      const sub = schema.properties?.[k]
      if (sub !== undefined) checkSchema(root, sub, value[k], `${path}.${k}`, out)
      else if (schema.additionalProperties === false) out.push(`${path}.${k}: unknown property`)
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') checkSchema(root, schema.additionalProperties, value[k], `${path}.${k}`, out)
    }
  }
  if (schema.oneOf) {
    const passing = schema.oneOf.filter((s) => checkSchema(root, s, value, path, []).length === 0)
    if (passing.length !== 1) {
      const detail = passing.length === 0 ? schema.oneOf.map((s, i) => `  option ${i}: ${checkSchema(root, s, value, path, [])[0]}`).join('\n') : ''
      out.push(`${path}: matches ${passing.length} of ${schema.oneOf.length} oneOf options (needs exactly 1)${detail ? '\n' + detail : ''}`)
    }
  }
  if (schema.anyOf) {
    if (!schema.anyOf.some((s) => checkSchema(root, s, value, path, []).length === 0)) out.push(`${path}: matches none of the anyOf options`)
  }
  if (schema.allOf) for (const s of schema.allOf) checkSchema(root, s, value, path, out)
}

/* ---------- geometry (mirrors prototypes/biome-lab/src/layout/biome-layout.ts) ---------- */

function stripPolygon(centreline, width) {
  const half = width / 2
  const left = []
  const right = []
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

function shapePolygon(shape) {
  return shape.kind === 'polygon' ? shape.vertices : stripPolygon(shape.centreline, shape.width)
}

function discPolygon(center, radius, n = 48) {
  const out = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push([center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius])
  }
  return out
}

function pointInPolygon(poly, x, z) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

function segmentDistance(ax, az, bx, bz, x, z) {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz || 1
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / len2))
  return Math.hypot(ax + dx * t - x, az + dz * t - z)
}

function polygonEdgeDistance(poly, x, z) {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i]
    const [bx, bz] = poly[(i + 1) % poly.length]
    best = Math.min(best, segmentDistance(ax, az, bx, bz, x, z))
  }
  return best
}

function segmentsIntersect(p1, p2, p3, p4) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const d1 = d(p3, p4, p1)
  const d2 = d(p3, p4, p2)
  const d3 = d(p1, p2, p3)
  const d4 = d(p1, p2, p4)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/** Shortest distance between two polygon outlines; 0 if they overlap or cross. */
function polygonGap(pa, pb) {
  if (pa.some(([x, z]) => pointInPolygon(pb, x, z)) || pb.some(([x, z]) => pointInPolygon(pa, x, z))) return 0
  for (let i = 0; i < pa.length; i++) {
    for (let j = 0; j < pb.length; j++) {
      if (segmentsIntersect(pa[i], pa[(i + 1) % pa.length], pb[j], pb[(j + 1) % pb.length])) return 0
    }
  }
  let best = Number.POSITIVE_INFINITY
  for (const [x, z] of pa) best = Math.min(best, polygonEdgeDistance(pb, x, z))
  for (const [x, z] of pb) best = Math.min(best, polygonEdgeDistance(pa, x, z))
  return best
}

/* ---------- design rules ---------- */

const HEX = /^#[0-9a-f]{6}$/

function walkHex(value, path, out) {
  if (typeof value === 'string') {
    if (/^#[0-9a-fA-F]{3,8}$/.test(value) && !HEX.test(value)) out.push(`${path}: "${value}" is not a lowercase 6-digit hex colour`)
    return
  }
  if (Array.isArray(value)) value.forEach((v, i) => walkHex(v, `${path}[${i}]`, out))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const p = `${path}.${k}`
      if (/(color|colour|hex|colours)$/i.test(k) || /^(side|top|lip|accent|accents)$/.test(k)) {
        const list = Array.isArray(v) ? v : [v]
        for (const item of list) {
          if (typeof item === 'string' && !HEX.test(item)) out.push(`${p}: "${item}" is not a lowercase 6-digit hex colour`)
        }
      }
      walkHex(v, p, out)
    }
  }
}

/** Every `material` field must name a palette role so the renderer can resolve it to a colour. */
function walkMaterials(value, path, roles, out) {
  if (Array.isArray(value)) value.forEach((v, i) => walkMaterials(v, `${path}[${i}]`, roles, out))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'extras' || k === 'ambient') continue
      if (k === 'material' && typeof v === 'string' && !roles.has(v)) out.push(`${path}.material: "${v}" is not a palette role`)
      walkMaterials(v, `${path}.${k}`, roles, out)
    }
  }
}

function distinctPoints(points) {
  return new Set(points.map(([x, z]) => `${x},${z}`)).size
}

function designRules(layout, out, report) {
  const districts = layout.districts ?? []
  const shapes = new Map()

  for (const d of districts) {
    const p = `districts[${d.id}]`
    const shape = d.shape
    if (!shape) continue
    if (shape.kind === 'polygon') {
      const n = distinctPoints(shape.vertices ?? [])
      if (n < 5) out.push(`${p}.shape: polygon has ${n} distinct vertices; needs >= 5 (no circles, no plain quads)`)
    } else if (shape.kind !== 'strip') {
      out.push(`${p}.shape.kind: "${shape.kind}" is neither polygon nor strip`)
    }
    if (shape.kind === 'polygon' || shape.kind === 'strip') shapes.set(d.id, shapePolygon(shape))

    if (!d.anchor || !d.anchor.description) out.push(`${p}.anchor: every district needs an anchor readable at 0 %`)
    if (d.population) {
      const counts = BANDS.map((b) => d.population[b])
      for (let i = 1; i < counts.length; i++) {
        if (counts[i] < counts[i - 1]) out.push(`${p}.population: not monotonic (${BANDS[i - 1]} % = ${counts[i - 1]} > ${BANDS[i]} % = ${counts[i]})`)
      }
    }
    for (const [name, table] of Object.entries(d.props ?? {})) {
      const counts = BANDS.map((b) => table[b])
      for (let i = 1; i < counts.length; i++) {
        if (counts[i] < counts[i - 1]) out.push(`${p}.props.${name}: not monotonic at ${BANDS[i]} %`)
      }
    }
  }

  const ids = districts.map((d) => d.id)
  if (new Set(ids).size !== ids.length) out.push(`districts: duplicate ids (${ids.join(', ')})`)

  const entries = [...shapes.entries()]
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const gap = polygonGap(entries[i][1], entries[j][1])
      report.push(`gap ${entries[i][0]} <-> ${entries[j][0]}: ${gap.toFixed(1)} m`)
      if (gap < MIN_DISTRICT_GAP - EPS) out.push(`districts: ${entries[i][0]} and ${entries[j][0]} are ${gap.toFixed(1)} m apart; need >= ${MIN_DISTRICT_GAP} m`)
    }
  }

  const growth = layout.land?.skyline?.growth
  if (growth) {
    const heights = BANDS.map((b) => growth[b]?.height)
    for (let i = 1; i < heights.length; i++) {
      if (heights[i] < heights[i - 1]) out.push(`land.skyline.growth: height decreases from ${BANDS[i - 1]} % (${heights[i - 1]}) to ${BANDS[i]} % (${heights[i]})`)
    }
  }

  const island = layout.soloIsland
  if (island) {
    const islandPoly = island.polygon ?? discPolygon(island.center, island.radius)
    if (island.district && !shapes.has(island.district)) out.push(`soloIsland.district: "${island.district}" is not a district id`)
    for (const d of districts) {
      if (d.solitary || d.id === island.district) continue
      const poly = shapes.get(d.id)
      if (!poly) continue
      const gap = polygonGap(islandPoly, poly)
      report.push(`soloIsland <-> ${d.id}: ${gap.toFixed(1)} m`)
      if (gap < MIN_ISLAND_GAP - EPS) out.push(`soloIsland: ${gap.toFixed(1)} m from district ${d.id}; need >= ${MIN_ISLAND_GAP} m`)
    }
  }

  const lm = layout.landmark
  if (lm?.plinth) {
    const plinthPoly = lm.plinth.polygon ?? (lm.plinth.radius ? discPolygon(lm.position, lm.plinth.radius) : null)
    if (plinthPoly) {
      for (const d of districts) {
        const poly = shapes.get(d.id)
        if (!poly) continue
        const gap = polygonGap(plinthPoly, poly)
        report.push(`landmark plinth <-> ${d.id}: ${gap.toFixed(1)} m`)
        if (gap < MIN_LANDMARK_GAP - EPS) out.push(`landmark.plinth: ${gap.toFixed(1)} m from district ${d.id}; need >= ${MIN_LANDMARK_GAP} m`)
      }
    }
  }

  if (layout.marker) {
    const slots = (layout.marker.props ?? []).map((p) => p.slot)
    if (new Set(slots).size !== slots.length) out.push(`marker.props: duplicate slots (${slots.join(', ')})`)
  }

  walkMaterials(layout, '$', new Set(Object.keys(layout.palette ?? {})), out)
  walkHex(layout, '$', out)
}

/* ---------- main ---------- */

const schema = JSON.parse(readFileSync(join(here, 'layout.schema.json'), 'utf8'))
const argv = process.argv.slice(2)
const verbose = argv.includes('--verbose')
const args = argv.filter((a) => !a.startsWith('--'))
const files = (args.length ? args.map((f) => basename(f)) : readdirSync(here).filter((f) => f.endsWith('.layout.json'))).sort()

let failures = 0
for (const file of files) {
  let layout
  try {
    layout = JSON.parse(readFileSync(join(here, file), 'utf8'))
  } catch (err) {
    console.log(`FAIL ${file}: ${err.message}`)
    failures++
    continue
  }
  const violations = []
  const report = []
  checkSchema(schema, schema, layout, '$', violations)
  if (layout.biome && `${layout.biome}.layout.json` !== file) violations.push(`$.biome: "${layout.biome}" does not match the file name ${file}`)
  designRules(layout, violations, report)
  if (violations.length) {
    failures++
    console.log(`FAIL ${file} (${violations.length} violation${violations.length === 1 ? '' : 's'})`)
    for (const v of violations) console.log(`  ${v}`)
  } else {
    const n = layout.districts.length
    console.log(`PASS ${file}: ${n} districts, ${layout.water.length} water bodies, ${(layout.transit ?? []).length} transit lines, soloIsland ${layout.soloIsland ? 'yes' : 'no'}`)
  }
  if (verbose) for (const r of report) console.log(`  ${r}`)
}

if (!files.length) {
  console.log('no *.layout.json files found')
  process.exit(1)
}
process.exit(failures ? 1 : 0)
