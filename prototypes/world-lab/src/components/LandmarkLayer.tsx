import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { conceptState, type Concept } from '../lib/world'
import { isTopic, type Topic } from '../lib/galaxy'
import { landmarkPlan, landmarkVariant, landmarkYaw, plazaStage, tintAccent, yawToward, type PlazaPlacement, type SpotPlacement, type Stage } from '../lib/landmarks'
import { landmarkUrl, useAssets, useLandmarkManifest } from '../lib/assets'
import { toonMaterial } from '../lib/toon'
import { bakeProp, type PropPieces } from './Decor'
import { landmarkBiome, landmarkId } from './GlbLandmark'
import { ConceptSpot } from './Props'

export interface LandmarkLayerProps {
  spots: SpotPlacement[]
  /** Planet 2-zoom: the topic plazas that carry the grand landmark (layout grammar §a) */
  plazas?: PlazaPlacement[]
  progress: number
  selectedIndex: number | null
  onSelect: (c: Concept) => void
  /** topics whose plaza landmark and concept buildings are hidden (growth hero on the hub, catastrophe ruins) */
  hiddenTopics?: ReadonlySet<number>
}

type Owner = Concept | Topic

/** one thing to bake: a manifest file (or a procedural piece) at a transform, owned by a concept or topic */
interface Instance {
  id: string
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: number
  owner: Owner
  /** material-name suffix → replacement colour (accent tint, recoloured house walls) */
  recolour?: Record<string, string>
  pedestal?: string
}

const _m = new THREE.Matrix4()
const _yaw = new THREE.Quaternion()
const _scl = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)
const STONE = '#b7a58f'
const STEM = '#9a7a55'

// ---------------------------------------------------------------------------
// procedural pieces baked next to the GLBs

let procCache: { disc: THREE.BufferGeometry; ring: THREE.BufferGeometry; stem: THREE.BufferGeometry; bud: THREE.BufferGeometry } | null = null
function proc() {
  if (procCache) return procCache
  const disc = new THREE.CylinderGeometry(1.35, 1.5, 0.12, 24).translate(0, 0.06, 0)
  const ring = new THREE.TorusGeometry(1.42, 0.06, 6, 32).rotateX(Math.PI / 2).translate(0, 0.13, 0)
  const stem = new THREE.CylinderGeometry(0.04, 0.06, 0.24, 6).translate(0, 0.12, 0)
  const bud = new THREE.SphereGeometry(0.18, 10, 8).translate(0, 0.34, 0)
  for (const g of [disc, ring, stem, bud]) g.deleteAttribute('uv')
  procCache = { disc, ring, stem, bud }
  return procCache
}

/** concept "buildings" per biome family (layout grammar §h, biome sheets): [manifest id, scale] */
const CONCEPT_BUILDINGS: Record<ReturnType<typeof landmarkBiome>, [string, number][]> = {
  ice: [['ice-landmark-s1', 0.7], ['city-small-house', 1]],
  city: [['city-small-house', 1]],
  forest: [['city-small-house', 0.95]],
  sand: [['city-small-house', 0.95]],
  meadow: [['city-small-house', 0.95]],
  ocean: [['city-small-house', 0.9]],
  volcanic: [['city-small-house', 0.9]],
}

// ---------------------------------------------------------------------------

/** one merged mesh per colour, with the triangle ranges that map hits back to owners */
interface Bucket {
  color: string
  geometry: THREE.BufferGeometry
  starts: number[]
  owners: Owner[]
}

function recolourFor(p: { name: string; color: string }, rules?: Record<string, string>) {
  if (!rules) return p.color
  for (const suffix of Object.keys(rules)) if (p.name.endsWith(suffix)) return rules[suffix]
  return p.color
}

function buildBuckets(instances: Instance[], sprouts: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number; owner: Concept; accent: string }[], pieces: Map<string, PropPieces>): Bucket[] {
  const lists = new Map<string, { geometries: THREE.BufferGeometry[]; owners: Owner[] }>()
  const push = (color: string, g: THREE.BufferGeometry, owner: Owner) => {
    let b = lists.get(color)
    if (!b) lists.set(color, (b = { geometries: [], owners: [] }))
    b.geometries.push(g)
    b.owners.push(owner)
  }
  const pr = proc()
  for (const it of instances) {
    const parts = pieces.get(it.id)
    if (!parts) continue
    _m.compose(it.position, it.quaternion, _scl.setScalar(it.scale))
    for (const p of parts) push(recolourFor(p, it.recolour), p.geometry.clone().applyMatrix4(_m), it.owner)
    if (it.pedestal) {
      _m.compose(it.position, it.quaternion, _scl.setScalar(it.scale))
      push(STONE, pr.disc.clone().applyMatrix4(_m), it.owner)
      push(it.pedestal, pr.ring.clone().applyMatrix4(_m), it.owner)
    }
  }
  for (const s of sprouts) {
    _m.compose(s.position, s.quaternion, _scl.setScalar(s.scale))
    push(STEM, pr.stem.clone().applyMatrix4(_m), s.owner)
    push(s.accent, pr.bud.clone().applyMatrix4(_m), s.owner)
  }
  const out: Bucket[] = []
  for (const [color, { geometries, owners }] of lists) {
    const starts: number[] = []
    let face = 0
    for (const g of geometries) {
      starts.push(face)
      face += (g.index ? g.index.count : g.attributes.position.count) / 3
    }
    const geometry = mergeGeometries(geometries, false)
    if (geometry) out.push({ color, geometry, starts, owners })
  }
  return out
}

function ownerOf(bucket: Bucket, faceIndex: number): Owner | null {
  let lo = 0
  let hi = bucket.starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (bucket.starts[mid] <= faceIndex) lo = mid
    else hi = mid - 1
  }
  return bucket.owners[lo] ?? null
}

/** which manifest ids a stage may use (s2 ships as s2 / s2b / s2c when the artisan made variants) */
function stageIds(biome: string, stage: Stage, has: (id: string) => boolean): string[] {
  const base = landmarkId(biome as never, stage)
  const ids = [base, base + 'b', base + 'c'].filter(has)
  return ids.length ? ids : [base]
}

// ---------------------------------------------------------------------------

interface Layout {
  instances: Instance[]
  sprouts: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number; owner: Concept; accent: string }[]
  /** primitive fallback per spot (Island / Planet plan) */
  plan: Map<Concept, Stage>
  ids: Set<string>
}

/** turns placements + progress into concrete instances, for either grammar */
function layout(spots: SpotPlacement[], plazas: PlazaPlacement[] | undefined, progress: number, has: (id: string) => boolean, hidden?: ReadonlySet<number>): Layout {
  const instances: Instance[] = []
  const sprouts: Layout['sprouts'] = []
  const ids = new Set<string>()
  const topicMode = spots.length > 0 && isTopic(spots[0].concept.cluster)
  const plan = topicMode ? new Map<Concept, Stage>() : landmarkPlan(spots.map((s) => s.concept), progress)
  const add = (it: Instance) => {
    ids.add(it.id)
    instances.push(it)
  }

  if (!topicMode) {
    for (const s of spots) {
      const stage = plan.get(s.concept)
      if (!stage) continue
      const biome = s.concept.cluster.biome
      const id = stageIds(biome.id, stage, has)[landmarkVariant(biome.id + s.concept.index, 3)]
      const yaw = stage === 2 ? landmarkYaw(s.concept) : 0
      add({
        id,
        position: s.position,
        quaternion: s.quaternion.clone().multiply(_yaw.setFromAxisAngle(UP, yaw)),
        scale: s.scale,
        owner: s.concept,
        recolour: stage === 2 ? { '-accent': tintAccent(biome.accent, biome.ground) } : undefined,
        pedestal: stage === 3 ? biome.accent : undefined,
      })
    }
    return { instances, sprouts, plan, ids }
  }

  // Planet 2-zoom grammar: plaza landmark by d, concept pads carry a sprout (touched) or a building (demonstrated)
  for (const p of plazas ?? []) {
    if (hidden?.has(p.topic.index)) continue
    const stage = plazaStage(p.topic, progress)
    if (!stage) continue
    const biome = p.topic.course.biome
    const fam = landmarkBiome(p.topic.course.family)
    const id = stageIds(fam, stage, has)[landmarkVariant(fam + p.topic.index, 3)]
    const face = p.topic.course.hub && p.topic.course.hub !== p.topic ? p.topic.course.hub.dir : p.topic.course.dir
    const yaw = yawToward(p.topic.dir, p.quaternion, face)
    add({
      id,
      position: p.position,
      quaternion: p.quaternion.clone().multiply(_yaw.setFromAxisAngle(UP, yaw)),
      scale: p.scale,
      owner: p.topic,
      recolour: stage === 2 ? { '-accent': tintAccent(biome.accent, p.topic.biome.ground) } : undefined,
      pedestal: stage === 3 ? biome.accent : undefined,
    })
  }
  for (const s of spots) {
    const st = conceptState(s.concept, progress)
    if (st === 0) continue
    const topic = s.concept.cluster as Topic
    if (st === 2 && hidden?.has(topic.index)) continue
    if (st === 1) {
      sprouts.push({ position: s.position, quaternion: s.quaternion, scale: s.scale, owner: s.concept, accent: topic.biome.accent })
      continue
    }
    const fam = landmarkBiome(topic.course.family)
    const options = CONCEPT_BUILDINGS[fam].filter(([id]) => has(id))
    if (!options.length) continue
    const [id, k] = options[s.concept.index % options.length]
    // the building fronts the road that arrives from the plaza
    const yaw = yawToward(s.concept.dir, s.quaternion, topic.dir)
    add({
      id,
      position: s.position,
      quaternion: s.quaternion.clone().multiply(_yaw.setFromAxisAngle(UP, yaw)),
      scale: s.scale * k * 1.4,
      owner: s.concept,
      // recoloured city houses: walls take the biome ground tint, roof the accent
      recolour: id === 'city-small-house' ? { '-ground': tintAccent(topic.course.biome.ground, '#ffffff', 0.3), '-accent': topic.course.biome.accent } : undefined,
    })
  }
  return { instances, sprouts, plan, ids }
}

function Merged({ lay, entries, selected, onSelect }: { lay: Layout; entries: [string, string][]; selected: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number; big: boolean } | null; onSelect: (c: Concept) => void }) {
  const gltfs = useGLTF(entries.map(([, url]) => url))
  const pieces = useMemo(() => {
    const lib = new Map<string, PropPieces>()
    gltfs.forEach((g, i) => lib.set(entries[i][0], bakeProp(g.scene)))
    return lib
  }, [gltfs, entries])
  const buckets = useMemo(() => buildBuckets(lay.instances, lay.sprouts, pieces), [lay, pieces])
  useEffect(() => () => buckets.forEach((b) => b.geometry.dispose()), [buckets])
  const ringR = selected?.big ? 1.7 : 0.6

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4 || e.faceIndex === undefined || e.faceIndex === null) return
    const bucket = (e.object as THREE.Mesh).userData.bucket as Bucket | undefined
    const owner = bucket ? ownerOf(bucket, e.faceIndex) : null
    if (!owner) return
    e.stopPropagation()
    // plaza landmarks select their first concept (the topic card comes from the topic marker)
    if ('spots' in owner) {
      if (owner.spots[0]) onSelect(owner.spots[0])
      return
    }
    onSelect(owner)
  }

  return (
    <group
      onClick={click}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {buckets.map((b) => (
        <mesh key={b.color} geometry={b.geometry} material={toonMaterial(b.color)} userData={{ bucket: b }} />
      ))}
      {selected && (
        <group position={selected.position} quaternion={selected.quaternion} scale={selected.scale}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[ringR, ringR * 1.15, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        </group>
      )}
    </group>
  )
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[LandmarkLayer] landmark GLBs failed, using primitives', err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Every concept spot (and, on the big planet, every plaza) of a scene in one place. Primitive mode
 * draws a `ConceptSpot` per spot; GLB mode bakes all instances into one merged mesh per colour and
 * maps clicks back to concepts through the hit face index.
 */
export function LandmarkLayer({ spots, plazas, progress, selectedIndex, onSelect, hiddenTopics }: LandmarkLayerProps) {
  const { landmarks } = useAssets()
  const manifest = useLandmarkManifest()
  const has = useMemo(() => (id: string) => manifest.status === 'ready' && manifest.ids.has(id), [manifest])
  const lay = useMemo(() => layout(spots, plazas, progress, has, hiddenTopics), [spots, plazas, progress, has, hiddenTopics])

  const entries = useMemo(() => {
    if (landmarks !== 'glb' || manifest.status !== 'ready') return []
    const out: [string, string][] = []
    for (const id of Array.from(lay.ids).sort()) {
      const url = landmarkUrl(manifest, id)
      if (url) out.push([id, url])
    }
    return out
  }, [landmarks, manifest, lay])

  const selectedSpot = selectedIndex === null ? null : spots.find((s) => s.concept.index === selectedIndex)
  const selected = selectedSpot && conceptState(selectedSpot.concept, progress) > 0 ? { position: selectedSpot.position, quaternion: selectedSpot.quaternion, scale: selectedSpot.scale, big: lay.plan.get(selectedSpot.concept) === 3 } : null

  const primitives = (
    <>
      {spots.map((s) => {
        const stage = lay.plan.get(s.concept) ?? (conceptState(s.concept, progress) as 0 | 1 | 2)
        if (!stage) return null
        return (
          <group key={s.concept.index} position={s.position} quaternion={s.quaternion} scale={s.scale}>
            <ConceptSpot concept={s.concept} state={stage === 1 ? 1 : 2} capstone={stage === 3} selected={selectedIndex === s.concept.index} onSelect={onSelect} />
          </group>
        )
      })}
    </>
  )
  if (!entries.length && !lay.sprouts.length) return primitives
  if (!entries.length) return primitives
  return (
    <Boundary fallback={primitives}>
      <Suspense fallback={primitives}>
        <Merged lay={lay} entries={entries} selected={selected} onSelect={onSelect} />
      </Suspense>
    </Boundary>
  )
}
