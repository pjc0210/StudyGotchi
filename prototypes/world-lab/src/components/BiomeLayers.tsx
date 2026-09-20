import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { METRES_TO_UNITS, PLANET_R, groundHeight, orientOnSphere, roadCurve, type Course, type Planet, type Topic } from '../lib/galaxy'
import type { Concept } from '../lib/world'
import { toonMaterial } from '../lib/toon'
import { landmarkUrl, useAssets, useLandmarkManifest } from '../lib/assets'
import { RoadLayer, type RoadPoint } from './Roads'
import { bakeProp, type PropPieces } from './Decor'
import { landmarkBiome } from './GlbLandmark'

/**
 * Level-2 composition on the sphere (layout grammar §a, §b, terrain pieces): plazas with concept
 * pads, the road network as ribbons, and one terrain piece per sub-region. Everything is merged
 * into a handful of meshes; the data (roads, hub) comes from `galaxy.ts`.
 */

const R = PLANET_R
const m = (metres: number) => metres * METRES_TO_UNITS

export const ROAD_MAIN_W = m(1.2)
export const ROAD_MINOR_W = m(0.9)
/** road cores that the art review pinned; every other family is ground darkened 18% L */
const ROAD_CORE_OVERRIDE: Record<string, string> = { '#e6f2fb': '#b9c9d6', '#d9c3d6': '#a89aa6' }
const PLAZA_RIM = '#b7a58f'

export function plazaRadius(topic: Topic) {
  return m(topic.hub ? 4 : 2.2)
}

const _c = new THREE.Color()
const hsl = { h: 0, s: 0, l: 0 }
/** biome road / plaza tints from the charter ground colour (layout grammar: road core L−8, edge L+6, plaza L+4) */
export function roadTints(ground: string) {
  _c.set(ground).getHSL(hsl)
  const core = ROAD_CORE_OVERRIDE[ground.toLowerCase()] ?? '#' + new THREE.Color().setHSL(hsl.h, hsl.s * 0.6, THREE.MathUtils.clamp(hsl.l - 0.18, 0.15, 0.85)).getHexString()
  const edge = '#' + new THREE.Color().setHSL(hsl.h, hsl.s * 0.5, THREE.MathUtils.clamp(hsl.l - 0.06, 0.3, 0.95)).getHexString()
  const plaza = '#' + new THREE.Color().setHSL(hsl.h, hsl.s * 0.45, THREE.MathUtils.clamp(hsl.l - 0.06, 0.25, 0.9)).getHexString()
  const pad = '#' + new THREE.Color().setHSL(hsl.h, hsl.s * 0.5, THREE.MathUtils.clamp(hsl.l - 0.12, 0.2, 0.85)).getHexString()
  return { core, edge, plaza, pad }
}

/** surface point for a direction, on top of the (progress-aware) ground */
export function useSurface(planet: Planet, built: Concept[][]) {
  return useMemo(() => (dir: THREE.Vector3, lift = 0) => dir.clone().multiplyScalar(R + groundHeight(planet, dir, built) + lift), [planet, built])
}

export function BiomeRoads({ planet, built, courseIndex }: { planet: Planet; built: Concept[][]; courseIndex?: number }) {
  const surface = useSurface(planet, built)
  const perCourse = useMemo(() => {
    const out: { course: Course; main: RoadPoint[][]; minor: RoadPoint[][]; tints: ReturnType<typeof roadTints> }[] = []
    for (const course of planet.courses) {
      if (courseIndex !== undefined && course.index !== courseIndex) continue
      const main: RoadPoint[][] = []
      const minor: RoadPoint[][] = []
      const edges = [...course.roads, ...course.topics.flatMap((t) => t.roads)]
      for (const e of edges) {
        const len = Math.acos(THREE.MathUtils.clamp(e.a.dot(e.b), -1, 1)) * R
        // wound centre line shared with the placement code, so lamps and houses hug the same curve
        const dirs = roadCurve(e, course.family, Math.max(4, Math.ceil(len / m(0.6))))
        const pts: RoadPoint[] = dirs.map((d) => ({ position: surface(d, 0.08), normal: d }))
        ;(e.main ? main : minor).push(pts)
      }
      out.push({ course, main, minor, tints: roadTints(course.biome.ground) })
    }
    return out
  }, [planet, surface, courseIndex])
  return (
    <>
      {perCourse.map((c) => (
        <group key={c.course.index}>
          <RoadLayer paths={c.minor} width={ROAD_MINOR_W} lift={0.06} core={c.tints.core} edge={c.tints.edge} />
          <RoadLayer paths={c.main} width={ROAD_MAIN_W} lift={0.08} core={c.tints.core} edge={c.tints.edge} />
        </group>
      ))}
    </>
  )
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()

/** 12-gon plaza per topic (hub 4 m) with a stone rim, plus a 0.6 m pad under every concept spot; 3 draw calls */
export function Plazas({ planet, built, courseIndex }: { planet: Planet; built: Concept[][]; courseIndex?: number }) {
  const surface = useSurface(planet, built)
  const merged = useMemo(() => {
    const buckets = new Map<string, THREE.BufferGeometry[]>()
    const push = (color: string, g: THREE.BufferGeometry) => {
      let l = buckets.get(color)
      if (!l) buckets.set(color, (l = []))
      g.deleteAttribute('uv')
      l.push(g)
    }
    const place = (dir: THREE.Vector3, g: THREE.BufferGeometry, lift: number) => {
      _m.compose(surface(dir, lift), orientOnSphere(dir, 0, _q), _s.set(1, 1, 1))
      return g.rotateX(-Math.PI / 2).applyMatrix4(_m)
    }
    for (const t of planet.topics) {
      if (courseIndex !== undefined && t.course.index !== courseIndex) continue
      const tints = roadTints(t.course.biome.ground)
      const r = plazaRadius(t)
      push(tints.plaza, place(t.dir, new THREE.CircleGeometry(r, 12), 0.16))
      push(PLAZA_RIM, place(t.dir, new THREE.RingGeometry(r, r + m(0.12), 12), 0.18))
      for (const s of t.spots) push(tints.pad, place(s.dir, new THREE.CircleGeometry(m(0.6), 10), 0.14))
    }
    const out: { color: string; geometry: THREE.BufferGeometry }[] = []
    for (const [color, gs] of buckets) {
      const g = mergeGeometries(gs, false)
      if (g) out.push({ color, geometry: g })
    }
    return out
  }, [planet, surface, courseIndex])
  useEffect(() => () => merged.forEach((b) => b.geometry.dispose()), [merged])
  return (
    <group>
      {merged.map((b) => (
        <mesh key={b.color} geometry={b.geometry} material={toonMaterial(b.color)} />
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// one terrain piece per sub-region

/** terrain GLB per biome family (`assets/landmarks/<biome>/terrain/*.glb`) */
const TERRAIN_PIECE: Record<ReturnType<typeof landmarkBiome>, string> = {
  ice: 'ice-mountain-cone',
  city: 'city-plaza-slab-with-fountain',
  forest: 'forest-hill-with-trees',
  sand: 'sand-dune',
  meadow: 'meadow-grassy-knoll',
  ocean: 'ocean-sea-stack',
  volcanic: 'volcanic-caldera-rim',
}

interface PieceInstance {
  id: string
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: number
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[BiomeLayers] terrain pieces failed', err)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function MergedPieces({ entries, items }: { entries: [string, string][]; items: PieceInstance[] }) {
  const gltfs = useGLTF(entries.map(([, url]) => url))
  const buckets = useMemo(() => {
    const lib = new Map<string, PropPieces>()
    gltfs.forEach((g, i) => lib.set(entries[i][0], bakeProp(g.scene)))
    const lists = new Map<string, THREE.BufferGeometry[]>()
    for (const it of items) {
      const parts = lib.get(it.id)
      if (!parts) continue
      _m.compose(it.position, it.quaternion, _s.setScalar(it.scale))
      for (const p of parts) {
        let l = lists.get(p.color)
        if (!l) lists.set(p.color, (l = []))
        l.push(p.geometry.clone().applyMatrix4(_m))
      }
    }
    const out: { color: string; geometry: THREE.BufferGeometry }[] = []
    for (const [color, gs] of lists) {
      const g = mergeGeometries(gs, false)
      if (g) out.push({ color, geometry: g })
    }
    return out
  }, [gltfs, entries, items])
  useEffect(() => () => buckets.forEach((b) => b.geometry.dispose()), [buckets])
  return (
    <group>
      {buckets.map((b) => (
        <mesh key={b.color} geometry={b.geometry} material={toonMaterial(b.color)} />
      ))}
    </group>
  )
}

/**
 * The biome's terrain GLB once per non-water, non-flat sub-region, on the rim away from the course
 * centre, scaled to about a third of the sub-region radius so it reads from the level-2 pose.
 */
export function TerrainPieces({ planet, built }: { planet: Planet; built: Concept[][] }) {
  const { landmarks } = useAssets()
  const manifest = useLandmarkManifest()
  const surface = useSurface(planet, built)
  const items = useMemo<PieceInstance[]>(() => {
    const out: PieceInstance[] = []
    for (const t of planet.topics) {
      if (t.kind.profile === 'water' || t.kind.profile === 'flat') continue
      const id = TERRAIN_PIECE[landmarkBiome(t.course.family)]
      // backdrop ring: on the biome rim (0.8 of the biome radius) along the topic's azimuth from the course centre
      const c = t.course
      const away = t.dir.clone().sub(c.dir).addScaledVector(c.dir, -t.dir.clone().sub(c.dir).dot(c.dir))
      if (away.lengthSq() < 1e-6) away.copy(c.east)
      away.normalize()
      const dir = c.dir.clone().multiplyScalar(Math.cos(c.radius * 0.8)).addScaledVector(away, Math.sin(c.radius * 0.8)).normalize()
      const linear = c.radius * R
      const scale = THREE.MathUtils.clamp((linear * 0.16) / 2.0, 2.4, 6)
      out.push({ id, position: surface(dir, -0.05), quaternion: orientOnSphere(dir, Math.atan2(away.dot(c.east), away.dot(c.north))), scale })
    }
    return out
  }, [planet, surface])
  const entries = useMemo(() => {
    if (landmarks !== 'glb' || manifest.status !== 'ready') return []
    const ids = Array.from(new Set(items.map((i) => i.id))).sort()
    return ids.map((id) => [id, landmarkUrl(manifest, id)] as const).filter((e): e is readonly [string, string] => !!e[1]).map((e) => [e[0], e[1]] as [string, string])
  }, [landmarks, manifest, items])
  if (!entries.length) return null
  return (
    <Boundary>
      <Suspense fallback={null}>
        <MergedPieces entries={entries} items={items} />
      </Suspense>
    </Boundary>
  )
}
