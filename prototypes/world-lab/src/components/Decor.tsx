import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { DecorItem, Recipe } from '../lib/galaxy'
import { makeRng } from '../lib/seed'
import { toonMaterial } from '../lib/toon'
import type { BiomeId } from '../lib/world'

/**
 * Static terrain decoration (mountains, pines, houses, docks, lighthouses...) for the big planet.
 * Every item is a handful of unit primitives; everything is baked into ONE merged mesh per colour,
 * so ~700 items cost ~15 draw calls instead of ~2500.
 */

type Shape = 'cone' | 'cone4' | 'cyl' | 'hex' | 'box' | 'sphere' | 'octa' | 'dodeca'

interface Part {
  shape: Shape
  color: string
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rx: number
  ry: number
  rz: number
}

const P = (shape: Shape, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0): Part => ({
  shape, color, x, y, z, sx, sy, sz, rx, ry, rz,
})

let unitCache: Record<Shape, THREE.BufferGeometry> | null = null
/** unit shapes; the "standing" ones have their base at y = 0 so a part's y is its foot */
function unitShapes() {
  if (unitCache) return unitCache
  unitCache = {
    cone: new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
    cone4: new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0),
    hex: new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0),
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    sphere: new THREE.SphereGeometry(1, 9, 7),
    // polyhedra are non-indexed; index them so mergeGeometries accepts a mixed batch
    octa: mergeVertices(new THREE.OctahedronGeometry(1, 0)),
    dodeca: mergeVertices(new THREE.DodecahedronGeometry(1, 0)),
  }
  for (const g of Object.values(unitCache)) g.deleteAttribute('uv')
  return unitCache
}

/** recipes that sit on the water surface rather than on the bowl floor */
export const FLOATING = new Set<Recipe>(['floe', 'iceberg', 'boat'])

function partsFor(item: DecorItem, family: BiomeId): Part[] {
  const rng = makeRng(item.seed)
  const s = item.scale
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)]
  switch (item.recipe) {
    case 'mountain': {
      const rock = family === 'ice' ? '#9fb3c6' : family === 'volcanic' ? '#5a4f57' : family === 'sand' ? '#c98a5a' : family === 'coast' ? '#7f8f8c' : '#8b7a70'
      const cap = family === 'volcanic' ? '#3a3038' : family === 'sand' ? '#f4e6c8' : '#ffffff'
      const h = (5.5 + rng() * 3.5) * s
      const r = (3 + rng() * 1.6) * s
      const h2 = h * 0.62
      const r2 = r * 0.62
      return [
        P('cone', rock, 0, 0, 0, r, h, r),
        P('cone', cap, 0, h * 0.6, 0, r * 0.4, h * 0.4, r * 0.4),
        P('cone', rock, r * 0.95, 0, r * 0.45, r2, h2, r2),
        P('cone', cap, r * 0.95, h2 * 0.62, r * 0.45, r2 * 0.38, h2 * 0.38, r2 * 0.38),
      ]
    }
    case 'crystal': {
      const n = 1 + Math.floor(rng() * 3)
      const out: Part[] = []
      for (let i = 0; i < n; i++) {
        const k = s * (0.7 + rng() * 0.7)
        out.push(P('octa', i % 2 ? '#e9f7ff' : '#bfe3ff', (rng() - 0.5) * 1.6 * s, 0.9 * k, (rng() - 0.5) * 1.6 * s, 0.5 * k, 1.4 * k, 0.5 * k, (rng() - 0.5) * 0.7, rng() * 3, (rng() - 0.5) * 0.7))
      }
      return out
    }
    case 'floe': {
      const r = (1.2 + rng()) * s
      return [P('cyl', '#f6fbff', 0, -0.1, 0, r, 0.3, r * (0.7 + rng() * 0.4), 0, rng() * 3)]
    }
    case 'house': {
      const wall = family === 'ice' ? '#f7f2ec' : family === 'city' ? '#f2e6ef' : family === 'sand' ? '#f1e2c0' : family === 'coast' ? '#fbf6ea' : '#fff3dc'
      const roof = family === 'ice' ? '#6f8fa8' : family === 'city' ? '#b98bb0' : family === 'sand' ? '#c98a5a' : family === 'coast' ? '#e77f4f' : '#d97d6a'
      const w = 1.6 * s
      const h = 1.3 * s
      return [
        P('box', wall, 0, 0, 0, w, h, w),
        P('cone4', roof, 0, h, 0, w * 0.86, 0.95 * s, w * 0.86, 0, Math.PI / 4),
        P('box', '#8a5a3c', 0, 0, w * 0.5, 0.36 * s, 0.6 * s, 0.08),
      ]
    }
    case 'tower': {
      const h = (3.5 + rng() * 4.5) * s
      const w = 1.5 * s
      return [
        P('box', pick(['#e6dcea', '#d4c6d8', '#f0e6f1']), 0, 0, 0, w, h, w),
        P('box', '#b98bb0', 0, h, 0, w * 0.7, 0.45 * s, w * 0.7),
      ]
    }
    case 'dock': {
      const out: Part[] = [P('box', '#a97c52', 0, 0.85, 0, 1.3 * s, 0.18, 6 * s)]
      for (const dx of [-0.5, 0.5]) for (const dz of [-2.6, 2.6]) out.push(P('cyl', '#7a5a3c', dx * s, -0.4, dz * s, 0.14, 1.4, 0.14))
      return out
    }
    case 'lighthouse': {
      const h = 5.5 * s
      const r = 0.9 * s
      return [
        P('cyl', '#fff7f0', 0, 0, 0, r, h, r),
        P('cyl', '#e04e4e', 0, h * 0.25, 0, r * 1.03, 0.7 * s, r * 1.03),
        P('cyl', '#e04e4e', 0, h * 0.56, 0, r * 1.03, 0.7 * s, r * 1.03),
        P('cyl', '#3a3038', 0, h, 0, r * 0.75, 0.7 * s, r * 0.75),
        P('sphere', '#ffe36b', 0, h + 0.75 * s, 0, 0.36 * s, 0.36 * s, 0.36 * s),
        P('cone', '#e04e4e', 0, h + 1.05 * s, 0, r, 0.7 * s, r),
      ]
    }
    case 'rock': {
      const c = family === 'ice' ? '#b9c6d2' : family === 'volcanic' ? '#4a4048' : family === 'sand' ? '#c98a5a' : '#9a8f86'
      const k = s * (0.6 + rng() * 0.8)
      return [P('dodeca', c, 0, 0.45 * k, 0, k, 0.7 * k, k, rng() * 0.6, rng() * 3, rng() * 0.6)]
    }
    case 'pine': {
      const green = family === 'ice' ? '#3f6b52' : '#4f8a4a'
      const out = [
        P('cyl', '#6b4a36', 0, 0, 0, 0.18 * s, 0.9 * s, 0.18 * s),
        P('cone', green, 0, 0.75 * s, 0, 1.15 * s, 1.7 * s, 1.15 * s),
        P('cone', green, 0, 1.75 * s, 0, 0.9 * s, 1.45 * s, 0.9 * s),
        P('cone', green, 0, 2.7 * s, 0, 0.6 * s, 1.2 * s, 0.6 * s),
      ]
      if (family === 'ice') out.push(P('cone', '#ffffff', 0, 3.3 * s, 0, 0.32 * s, 0.62 * s, 0.32 * s))
      return out
    }
    case 'roundTree': {
      const leaf = family === 'forest' ? '#4f8a4a' : family === 'meadow' ? '#8fbf6a' : '#6faf62'
      return [
        P('cyl', '#7a5a3c', 0, 0, 0, 0.2 * s, 1.1 * s, 0.2 * s),
        P('sphere', leaf, 0, 1.9 * s, 0, 1.2 * s, 1.1 * s, 1.2 * s),
        P('sphere', '#7fbf72', 0.6 * s, 2.4 * s, 0.3 * s, 0.7 * s, 0.65 * s, 0.7 * s),
      ]
    }
    case 'palm': {
      const out = [P('cyl', '#a97c52', 0, 0, 0, 0.16 * s, 3 * s, 0.16 * s, 0, 0, 0.12)]
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4
        out.push(P('sphere', '#4f9a5a', Math.cos(a) * 0.7 * s - 0.35 * s, 3 * s, Math.sin(a) * 0.7 * s, 0.95 * s, 0.22 * s, 0.45 * s, 0, -a, 0))
      }
      return out
    }
    case 'cactus':
      return [
        P('cyl', '#6f9a5a', 0, 0, 0, 0.35 * s, 1.9 * s, 0.35 * s),
        P('cyl', '#6f9a5a', 0.5 * s, 0.9 * s, 0, 0.2 * s, 0.8 * s, 0.2 * s),
        P('cyl', '#6f9a5a', -0.45 * s, 0.6 * s, 0.1 * s, 0.2 * s, 0.7 * s, 0.2 * s),
      ]
    case 'pillar': {
      const h = (2 + rng()) * s
      return [P('cyl', '#e9dcc3', 0, 0, 0, 0.38 * s, h, 0.38 * s), P('box', '#e9dcc3', 0, h, 0, 1.0 * s, 0.25 * s, 1.0 * s)]
    }
    case 'chimney':
      return [
        P('box', '#8f7f8c', 0, 0, 0, 1.8 * s, 1.2 * s, 1.8 * s),
        P('cyl', '#6c5f66', 0, 1.2 * s, 0, 0.5 * s, 2.2 * s, 0.5 * s),
        P('cyl', '#c95a4a', 0, 3.2 * s, 0, 0.53 * s, 0.35 * s, 0.53 * s),
      ]
    case 'shrub': {
      const c = family === 'ice' ? '#4f6b5a' : family === 'sand' ? '#8a9a5a' : family === 'volcanic' ? '#6f6b5a' : '#5f9a52'
      return [
        P('sphere', c, 0, 0.38 * s, 0, 0.55 * s, 0.4 * s, 0.55 * s),
        P('sphere', c, 0.4 * s, 0.25 * s, 0.2 * s, 0.35 * s, 0.28 * s, 0.35 * s),
      ]
    }
    case 'flower':
      return [
        P('cyl', '#5f9a52', 0, 0, 0, 0.05, 0.6 * s, 0.05),
        P('sphere', pick(['#f6a3a3', '#ffe36b', '#f2f2f2', '#c9a2e6']), 0, 0.68 * s, 0, 0.24 * s, 0.24 * s, 0.24 * s),
      ]
    case 'iceberg':
      return [
        P('cone', '#f6fbff', 0, -0.2, 0, 1.4 * s, 2.4 * s, 1.4 * s, 0, 0, 0.15),
        P('box', '#e8f6ff', 0.5 * s, -0.2, 0.4 * s, 1.5 * s, 0.9 * s, 1.5 * s, 0, rng() * 3),
      ]
    case 'hexColumn': {
      const h = (1 + rng() * 2.2) * s
      return [P('hex', pick(['#4a4048', '#5f5560']), 0, 0, 0, 0.7 * s, h, 0.7 * s), P('hex', '#6f636b', 0, h, 0, 0.7 * s, 0.12, 0.7 * s)]
    }
    case 'coral':
      return [
        P('cone', '#f27d7d', 0, 0, 0, 0.3 * s, 1.1 * s, 0.3 * s),
        P('sphere', '#f2a86f', 0.5 * s, 0.35 * s, 0.2 * s, 0.4 * s, 0.4 * s, 0.4 * s),
        P('cone', '#ffb3c6', -0.4 * s, 0, 0.3 * s, 0.22 * s, 0.8 * s, 0.22 * s, 0, 0, 0.3),
      ]
    case 'lamp':
      return [P('cyl', '#3a3038', 0, 0, 0, 0.08, 2.2 * s, 0.08), P('sphere', '#ffe36b', 0, 2.3 * s, 0, 0.22 * s, 0.22 * s, 0.22 * s)]
    case 'boat':
      return [
        P('box', '#a97c52', 0, 0, 0, 1.2 * s, 0.5 * s, 2.8 * s),
        P('box', '#f1e2c0', 0, 0.5 * s, 0, 1.0 * s, 0.15 * s, 2.4 * s),
        P('cyl', '#7a5a3c', 0, 0.6 * s, 0.2 * s, 0.06, 2 * s, 0.06),
        P('box', '#fff7f0', 0, 1.1 * s, 0.7 * s, 0.06, 1.3 * s, 0.95 * s),
      ]
    case 'crop':
      return [-1, 0, 1].map((k) => P('box', k === 0 ? '#c9d96b' : '#7fbf6a', k * 1.0 * s, 0, 0, 0.7 * s, 0.45 * s, 3.2 * s))
    case 'geyser': {
      const h = (1.5 + rng()) * s
      return [
        P('cyl', '#b8aeb0', 0, -0.05, 0, 1.3 * s, 0.12, 1.3 * s),
        P('cyl', '#8fd0d8', 0, 0.02, 0, 1.1 * s, 0.12, 1.1 * s),
        P('cyl', '#dff6fa', 0, 0.1, 0, 0.2 * s, h, 0.2 * s),
        P('sphere', '#f4fbfd', 0, h + 0.1, 0, 0.5 * s, 0.4 * s, 0.5 * s),
      ]
    }
    case 'fence':
      // two posts and a rail, 1 m long along local +Z
      return [
        P('box', '#9a7a55', 0, 0, -1.0 * s, 0.14 * s, 0.9 * s, 0.14 * s),
        P('box', '#9a7a55', 0, 0, 1.0 * s, 0.14 * s, 0.9 * s, 0.14 * s),
        P('box', '#b7a58f', 0, 0.55 * s, 0, 0.1 * s, 0.12 * s, 2.2 * s),
      ]
    case 'shard': {
      // shoreline piece: ice shard on ice, a foam wedge elsewhere
      const c = family === 'ice' ? '#dbeefa' : '#ffffff'
      return [P('octa', c, 0, 0.2 * s, 0, 0.45 * s, 0.35 * s, 0.7 * s, 0, rng() * 3, 0.2)]
    }
  }
}

export interface Placement {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
}

// ---------------------------------------------------------------------------
// Landmark-Artisan props standing in for procedural recipes

/** one prop baked to (colour, indexed position+normal geometry) pieces, in metres, base at y = 0 */
export type PropPieces = { color: string; /** glTF material name, e.g. `ice-landmark-s2-accent` */ name: string; geometry: THREE.BufferGeometry }[]
export type PropLibrary = Map<string, PropPieces>

interface PropUse {
  /** manifest id, e.g. `ice-pine-snow`; several ids are picked by item seed */
  ids: string[]
  /** metres → recipe units, so the prop stands about as tall as the procedural version at scale 1 */
  k: number
}

/** which recipe, in which family, is replaced by which prop */
export const DECOR_PROPS: Partial<Record<Recipe, Partial<Record<BiomeId, PropUse>>>> = {
  pine: { ice: { ids: ['ice-pine-snow'], k: 3.2 } },
  roundTree: { forest: { ids: ['forest-round-tree-large', 'forest-round-tree-small'], k: 2.3 }, meadow: { ids: ['forest-round-tree-large'], k: 2.3 } },
  house: {
    city: { ids: ['city-small-house'], k: 3.2 },
    ice: { ids: ['city-small-house', 'ice-landmark-s1'], k: 3.0 },
    forest: { ids: ['city-small-house'], k: 3.0 },
    sand: { ids: ['city-small-house'], k: 3.0 },
    meadow: { ids: ['city-small-house'], k: 3.0 },
    coast: { ids: ['city-small-house'], k: 3.0 },
    volcanic: { ids: ['city-small-house'], k: 3.0 },
  },
  lamp: {
    city: { ids: ['city-lamp-post'], k: 2.0 },
    ice: { ids: ['city-lamp-post'], k: 2.0 },
    forest: { ids: ['city-lamp-post'], k: 2.0 },
    sand: { ids: ['city-lamp-post'], k: 2.0 },
    meadow: { ids: ['city-lamp-post'], k: 2.0 },
    coast: { ids: ['city-lamp-post'], k: 2.0 },
    volcanic: { ids: ['city-lamp-post'], k: 2.0 },
  },
  fence: {
    city: { ids: ['meadow-fence-segment'], k: 2.2 },
    ice: { ids: ['meadow-fence-segment'], k: 2.2 },
    forest: { ids: ['meadow-fence-segment'], k: 2.2 },
    sand: { ids: ['meadow-fence-segment'], k: 2.2 },
    meadow: { ids: ['meadow-fence-segment'], k: 2.2 },
    coast: { ids: ['meadow-fence-segment'], k: 2.2 },
    volcanic: { ids: ['meadow-fence-segment'], k: 2.2 },
  },
  shard: { ice: { ids: ['ice-ice-block-stack'], k: 1.6 } },
  shrub: { meadow: { ids: ['meadow-bush'], k: 1.5 }, forest: { ids: ['meadow-bush', 'forest-fern-clump'], k: 1.5 } },
  flower: { meadow: { ids: ['meadow-flower-clump-peach', 'meadow-flower-clump-coral', 'meadow-flower-clump-lilac'], k: 2.7 } },
  cactus: { sand: { ids: ['sand-cactus-large', 'sand-cactus-small'], k: 2.0 } },
  rock: {
    forest: { ids: ['forest-rock'], k: 2.7 },
    ice: { ids: ['ice-snow-boulder'], k: 1.7 },
    sand: { ids: ['sand-dune-rock'], k: 3.0 },
    volcanic: { ids: ['volcanic-ember-rock'], k: 2.5 },
    coast: { ids: ['ocean-rock-outcrop'], k: 2.0 },
  },
  crystal: { ice: { ids: ['ice-ice-crystal-cluster'], k: 3.5 } },
  hexColumn: { volcanic: { ids: ['volcanic-basalt-column'], k: 2.5 } },
  geyser: { volcanic: { ids: ['volcanic-geyser-vent'], k: 3.0 } },
}

/** every prop id the decor can use, for loading */
export const DECOR_PROP_IDS: string[] = Array.from(new Set(Object.values(DECOR_PROPS).flatMap((byFamily) => Object.values(byFamily).flatMap((u) => u.ids))))

function propFor(item: DecorItem, family: BiomeId): { id: string; k: number } | null {
  const use = DECOR_PROPS[item.recipe]?.[family]
  if (!use) return null
  const rng = makeRng(item.seed ^ 0x9e3779b9)
  return { id: use.ids[Math.floor(rng() * use.ids.length)], k: use.k }
}

/** Flattens a loaded prop GLB into merge-friendly pieces (indexed, position + normal only, world transforms applied). */
export function bakeProp(scene: THREE.Object3D): PropPieces {
  scene.updateMatrixWorld(true)
  const out: PropPieces = []
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const groups = mesh.geometry.groups.length && Array.isArray(mesh.material) ? mesh.geometry.groups : [{ start: 0, count: Infinity, materialIndex: 0 }]
    for (const grp of groups) {
      const mat = mats[grp.materialIndex ?? 0] as THREE.MeshStandardMaterial
      const color = mat?.color ? '#' + mat.color.getHexString() : '#cccccc'
      let g = mesh.geometry.clone()
      if (grp.count !== Infinity && g.index) {
        const idx = g.index.array.slice(grp.start, grp.start + grp.count)
        g.setIndex(new THREE.BufferAttribute(idx, 1))
      }
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
      g.clearGroups()
      g = g.index ? g : mergeVertices(g)
      if (!g.attributes.normal) g.computeVertexNormals()
      g.applyMatrix4(mesh.matrixWorld)
      out.push({ color, name: mat?.name ?? '', geometry: g })
    }
  })
  return out
}

const _m = new THREE.Matrix4()
const _mp = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _scl = new THREE.Vector3()

/**
 * Bakes every decor item into one mesh per colour. `place` gives each item's foot transform.
 * With a `props` library, recipes that have a matching Landmark-Artisan prop use its geometry
 * (still merged into the same colour buckets); everything else stays procedural.
 */
export function DecorLayer({ items, place, props }: { items: DecorItem[]; place: (item: DecorItem) => Placement; props?: PropLibrary }) {
  const merged = useMemo(() => {
    const unit = unitShapes()
    const buckets = new Map<string, THREE.BufferGeometry[]>()
    for (const item of items) {
      const { position, quaternion } = place(item)
      _m.compose(position, quaternion, _scl.set(1, 1, 1))
      const family = item.topic.course.family
      const prop = props ? propFor(item, family) : null
      const pieces = prop ? props?.get(prop.id) : undefined
      if (prop && pieces) {
        const s = prop.k * item.scale
        _mp.makeScale(s, s, s).premultiply(_m)
        for (const piece of pieces) {
          const g = piece.geometry.clone().applyMatrix4(_mp)
          let list = buckets.get(piece.color)
          if (!list) buckets.set(piece.color, (list = []))
          list.push(g)
        }
        continue
      }
      for (const p of partsFor(item, family)) {
        _mp.compose(_pos.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(p.rx, p.ry, p.rz)), _scl.set(p.sx, p.sy, p.sz))
        const g = unit[p.shape].clone().applyMatrix4(_mp.premultiply(_m))
        let list = buckets.get(p.color)
        if (!list) buckets.set(p.color, (list = []))
        list.push(g)
      }
    }
    const out: { color: string; geometry: THREE.BufferGeometry }[] = []
    for (const [color, list] of buckets) {
      const geometry = mergeGeometries(list, false)
      if (geometry) out.push({ color, geometry })
    }
    return out
  }, [items, place, props])

  useEffect(() => () => merged.forEach((m) => m.geometry.dispose()), [merged])

  return (
    <group>
      {merged.map((m) => (
        <mesh key={m.color} geometry={m.geometry} material={toonMaterial(m.color)} />
      ))}
    </group>
  )
}
