import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { PROP_SCALE, groundHeight, orientOnSphere, PLANET_R, type Course, type Planet, type Topic } from '../lib/galaxy'
import type { Concept } from '../lib/world'
import { toonMaterial } from '../lib/toon'
import { landmarkBiome } from './GlbLandmark'
import { courseFraction } from './MapMarker'
import { landmarkUrl, useLandmarkManifest } from '../lib/assets'
import { playSfx } from '../lib/audio'

/**
 * Growth hero and catastrophe choreography (docs/design/catalog/growth-and-catastrophe.md), generic
 * across families: the hero at the biome's main plaza steps g0→g3 by the course's demonstrated
 * fraction; a catastrophe gathers a storm cloud, booms, leaves a crater + rubble, saddens the
 * topic's creatures, then scaffolds and rebuilds.
 */

const GROWTH_FAMILIES = new Set(['forest', 'city', 'ice', 'sand', 'meadow', 'ocean', 'volcanic'])

export function growthStage(fraction: number): 0 | 1 | 2 | 3 {
  return fraction >= 0.75 ? 3 : fraction >= 0.5 ? 2 : fraction >= 0.25 ? 1 : 0
}

function toHex(m: THREE.Material): string {
  const c = (m as THREE.MeshStandardMaterial).color
  return c ? '#' + c.getHexString() : '#cccccc'
}

/** a GLB from assets/growth, cloned and toon-shaded */
function GrowthModel({ url, scale = 1 }: { url: string; scale?: number }) {
  const gltf = useGLTF(url)
  const scene = useMemo(() => {
    const s = cloneSkeleton(gltf.scene) as THREE.Group
    s.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const toon = mats.map((m) => toonMaterial(toHex(m)))
      mesh.material = toon.length === 1 ? toon[0] : toon
    })
    return s
  }, [gltf.scene])
  return <primitive object={scene} scale={scale} />
}

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** 1.2 s ease-in-out with a 4% squash at the start and 3% overshoot at the end (catalogue timing) */
function useGrowPop(key: number, duration = 1.2) {
  const ref = useRef<THREE.Group>(null)
  const t = useRef(duration)
  const last = useRef(key)
  useEffect(() => {
    if (last.current !== key) {
      last.current = key
      t.current = 0
    }
  }, [key])
  useFrame((_, dt) => {
    if (!ref.current) return
    t.current = Math.min(duration, t.current + dt)
    const k = t.current / duration
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
    const s = k >= 1 ? 1 : 0.04 + 0.96 * e + Math.sin(k * Math.PI) * 0.03
    ref.current.scale.set(s * (1 + (1 - e) * 0.04), s, s * (1 + (1 - e) * 0.04))
  })
  return ref
}

/** the biome's growth hero at the hub plaza, stage by the course's demonstrated fraction */
export function GrowthHero({ planet, course, progress, built }: { planet: Planet; course: Course; progress: number; built: Concept[][] }) {
  const fam = landmarkBiome(course.family)
  const stage = growthStage(courseFraction(course, progress))
  const hub = course.hub
  const ref = useGrowPop(stage)
  const manifest = useLandmarkManifest()
  // assets/growth ships the seven original families; the landmark manifest's `hero` entries cover the rest
  const url = GROWTH_FAMILIES.has(fam) ? `/assets/growth/${fam}/${fam}-g${stage}.glb` : landmarkUrl(manifest, `${fam}-g${stage}`)
  const placement = useMemo(() => {
    if (!hub) return null
    return { position: hub.dir.clone().multiplyScalar(PLANET_R + groundHeight(planet, hub.dir, built) + 0.2), quaternion: orientOnSphere(hub.dir) }
  }, [planet, hub, built])
  if (!hub || !placement || !url) return null
  return (
    <group position={placement.position} quaternion={placement.quaternion}>
      <group ref={ref}>
        <Quiet>
          <Suspense fallback={null}>
            <GrowthModel key={url} url={url} scale={PROP_SCALE * 1.5} />
          </Suspense>
        </Quiet>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// catastrophe

export type CatastrophePhase = 'gather' | 'bang' | 'ruin' | 'scaffold' | 'done'

export interface CatastropheState {
  topic: Topic
  startedAt: number
}

/** phase timeline (s): gather 0–2, bang 2–2.6, ruin until 10, scaffold until 13, then rebuilt */
export function catastrophePhase(elapsed: number): CatastrophePhase {
  if (elapsed < 2) return 'gather'
  if (elapsed < 2.6) return 'bang'
  if (elapsed < 10) return 'ruin'
  if (elapsed < 13) return 'scaffold'
  return 'done'
}

const played = new Set<string>()
function sfx(name: string, key: string) {
  if (played.has(key)) return
  played.add(key)
  playSfx(name, 0.7)
}

/** grows in 0.15 s, then expands and fades over 0.5 s */
function Boom({ url, offset, scale, t0, now }: { url: string; offset: [number, number, number]; scale: number; t0: number; now: number }) {
  const k = now - t0
  if (k < 0 || k > 0.7) return null
  const grow = Math.min(1, k / 0.15)
  const expand = 1 + Math.max(0, k - 0.15) * 1.2
  return (
    <group position={offset} scale={scale * grow * expand}>
      <GrowthModel url={url} />
    </group>
  )
}

export function Catastrophe({
  planet,
  state,
  built,
  onPhase,
}: {
  planet: Planet
  state: CatastropheState
  built: Concept[][]
  onPhase: (p: CatastrophePhase) => void
}) {
  const { topic } = state
  const fam = landmarkBiome(topic.course.family)
  const manifest = useLandmarkManifest()
  const ruinUrl = landmarkUrl(manifest, `${fam}-ruin`)
  const scaffoldUrl = landmarkUrl(manifest, `${fam}-scaffold`)
  const [now, setNow] = useState(0)
  const phaseRef = useRef<CatastrophePhase>('gather')
  useFrame(() => {
    const t = (performance.now() - state.startedAt) / 1000
    setNow(t)
    const p = catastrophePhase(t)
    if (p !== phaseRef.current) {
      phaseRef.current = p
      onPhase(p)
      if (p === 'bang') sfx('explode-comic', state.startedAt + ':boom')
      if (p === 'done') sfx('recover-chime', state.startedAt + ':chime')
    }
  })
  const placement = useMemo(
    () => ({ position: topic.dir.clone().multiplyScalar(PLANET_R + groundHeight(planet, topic.dir, built) + 0.2), quaternion: orientOnSphere(topic.dir) }),
    [planet, topic, built],
  )
  const phase = catastrophePhase(now)
  // screen-space rule at topic snap (viewport ≈ 25.7 units tall): boom ≥ 20%, cloud ≥ 15%, ruin ≥ 12%
  const S = PROP_SCALE
  const cloudK = Math.min(1, now / 2)
  const cloudY = 9 - 3 * cloudK
  const tinted = ['forest', 'city', 'ice', 'sand'].includes(fam)
  const crater = tinted ? `/assets/growth/catastrophe/tinted/crater-m-${fam}.glb` : '/assets/growth/catastrophe/crater-m.glb'
  const scorch = tinted ? `/assets/growth/catastrophe/tinted/scorch-${fam}.glb` : '/assets/growth/catastrophe/scorch.glb'
  // family ruin / scaffold GLBs (landmarks v4), kit pieces when a family has none
  const scaffold = scaffoldUrl ?? (fam === 'city' ? '/assets/growth/city/city-build-1.glb' : '/assets/growth/catastrophe/recovery-sprout.glb')
  const ruin = ruinUrl ?? '/assets/growth/catastrophe/rubble-pile.glb'
  // ruin ≥ 12% of the viewport at topic snap (≈ 3.1 u): 0.72 m ruin × S × 2.2 ≈ 3.5 u
  const ruinScale = ruinUrl ? S * 2.2 : S * 2.8
  return (
    <group position={placement.position} quaternion={placement.quaternion}>
      <Quiet>
        <Suspense fallback={null}>
          {(phase === 'gather' || phase === 'bang') && (
            <group position={[0, cloudY, 0]} scale={S * 2.8 * (0.2 + 0.8 * cloudK)}>
              <GrowthModel url="/assets/growth/catastrophe/storm-cloud.glb" />
            </group>
          )}
          {phase === 'bang' && (
            <>
              <group position={[0, 5.5, 0]} scale={S * 1.6}>
                <GrowthModel url="/assets/growth/catastrophe/lightning-bolt.glb" />
              </group>
              <Boom url="/assets/growth/catastrophe/boom-2.glb" offset={[0, 1.5, 0]} scale={S * 2.2} t0={2.0} now={now} />
              <Boom url="/assets/growth/catastrophe/boom-1.glb" offset={[2.5, 1.0, 1.5]} scale={S * 1.6} t0={2.1} now={now} />
              <Boom url="/assets/growth/catastrophe/boom-3.glb" offset={[-2.4, 1.2, -1.0]} scale={S * 1.6} t0={2.2} now={now} />
            </>
          )}
          {(phase === 'ruin' || phase === 'scaffold') && (
            <>
              <group scale={S * 3.2}>
                <GrowthModel url={crater} />
              </group>
              <group position={[0, 0.02, 0]} scale={S * 3.6}>
                <GrowthModel url={scorch} />
              </group>
              {phase === 'ruin' && (
                <group position={[0, 0.05, 0]} scale={ruinScale}>
                  <GrowthModel url={ruin} />
                </group>
              )}
              {phase === 'scaffold' && (
                <group position={[0, 0.05, 0]} scale={scaffoldUrl ? S * 1.7 : S * 2.2}>
                  <GrowthModel url={scaffold} />
                </group>
              )}
              {[0, 1, 2].map((i) => (
                <group key={i} position={[Math.cos(i * 2.1) * 3.2, 0.05, Math.sin(i * 2.1) * 3.2]} scale={S * 1.6} rotation={[0, i * 1.3, 0]}>
                  <GrowthModel url={`/assets/growth/catastrophe/debris-${i + 1}.glb`} />
                </group>
              ))}
            </>
          )}
        </Suspense>
      </Quiet>
    </group>
  )
}
