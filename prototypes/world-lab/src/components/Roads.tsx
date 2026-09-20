import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { toonMaterial } from '../lib/toon'

/** one sample along a road: foot position on the terrain and the local up */
export interface RoadPoint {
  position: THREE.Vector3
  normal: THREE.Vector3
}

export const ROAD_CORE = '#b7a58f'
export const ROAD_EDGE = '#dcd2c3'

const roadMats = new Map<string, THREE.MeshToonMaterial>()
/** two-sided toon material so a ribbon reads whichever way its strip happens to wind on a curved surface */
function roadMaterial(color: string) {
  let m = roadMats.get(color)
  if (!m) {
    m = toonMaterial(color).clone()
    m.side = THREE.DoubleSide
    m.polygonOffset = true
    m.polygonOffsetFactor = -2
    roadMats.set(color, m)
  }
  return m
}

const _t = new THREE.Vector3()
const _s = new THREE.Vector3()
const _p = new THREE.Vector3()

/** a flat quad strip along the polyline, `width` wide, lifted `lift` along each point's normal */
function strip(path: RoadPoint[], width: number, lift: number): THREE.BufferGeometry | null {
  const n = path.length
  if (n < 2) return null
  const pos = new Float32Array(n * 2 * 3)
  const nor = new Float32Array(n * 2 * 3)
  const idx: number[] = []
  for (let i = 0; i < n; i++) {
    const prev = path[Math.max(0, i - 1)].position
    const next = path[Math.min(n - 1, i + 1)].position
    const up = path[i].normal
    _t.subVectors(next, prev)
    _t.addScaledVector(up, -_t.dot(up)).normalize()
    _s.crossVectors(up, _t).normalize()
    for (let k = 0; k < 2; k++) {
      _p.copy(path[i].position).addScaledVector(_s, (k === 0 ? -0.5 : 0.5) * width).addScaledVector(up, lift)
      const o = (i * 2 + k) * 3
      pos[o] = _p.x
      pos[o + 1] = _p.y
      pos[o + 2] = _p.z
      nor[o] = up.x
      nor[o + 1] = up.y
      nor[o + 2] = up.z
    }
    if (i < n - 1) {
      const a = i * 2
      // counter-clockwise seen from `up`, so the strip faces the sky
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setIndex(idx)
  return g
}

/** Builds the two-tone ribbons (stone core over a lighter, wider edge) for a set of paths. */
export function buildRoads(paths: RoadPoint[][], width: number, lift = 0.1) {
  const cores: THREE.BufferGeometry[] = []
  const edges: THREE.BufferGeometry[] = []
  for (const p of paths) {
    const c = strip(p, width, lift + 0.04)
    const e = strip(p, width * 1.5, lift)
    if (c) cores.push(c)
    if (e) edges.push(e)
  }
  return {
    core: cores.length ? mergeGeometries(cores, false) : null,
    edge: edges.length ? mergeGeometries(edges, false) : null,
  }
}

/** Two draw calls for any number of roads. */
export function RoadLayer({ paths, width, lift, core = ROAD_CORE, edge = ROAD_EDGE }: { paths: RoadPoint[][]; width: number; lift?: number; core?: string; edge?: string }) {
  const geo = useMemo(() => buildRoads(paths, width, lift), [paths, width, lift])
  const coreMat = useMemo(() => roadMaterial(core), [core])
  const edgeMat = useMemo(() => roadMaterial(edge), [edge])
  useEffect(
    () => () => {
      geo.core?.dispose()
      geo.edge?.dispose()
    },
    [geo],
  )
  return (
    <group>
      {geo.edge && <mesh geometry={geo.edge} material={edgeMat} frustumCulled={false} />}
      {geo.core && <mesh geometry={geo.core} material={coreMat} frustumCulled={false} />}
    </group>
  )
}

/** great-circle arc between two unit directions, `segments` samples inclusive */
export function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segments: number, surface: (dir: THREE.Vector3) => THREE.Vector3): RoadPoint[] {
  const q = new THREE.Quaternion().setFromUnitVectors(a, b)
  const out: RoadPoint[] = []
  const qi = new THREE.Quaternion()
  for (let i = 0; i <= segments; i++) {
    qi.identity().slerp(q, i / segments)
    const dir = a.clone().applyQuaternion(qi).normalize()
    out.push({ position: surface(dir), normal: dir })
  }
  return out
}
