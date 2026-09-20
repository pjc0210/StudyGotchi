import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { conceptState, type BiomeId } from '../lib/world'
import { creatureCount, type Course } from '../lib/galaxy'
import { toonMaterial } from '../lib/toon'
import { landmarkUrl, useLandmarkManifest } from '../lib/assets'
import { landmarkBiome } from './GlbLandmark'
import { Creature } from './Creature'
import type { BlobMotion } from './Blob'

/**
 * Level-1 map marker, after the Kirby world-select pedestal: a cake pedestal (1–3 tiers by the
 * course's demonstrated fraction), 2–4 signature props of the biome, a wooden signpost with the
 * course code, and the latest creature of the course idling on top.
 */

/** `?markerGlb=1` swaps the procedural tiers / signpost for the shared GLBs (the user preferred the procedural look) */
export const MARKER_GLB = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('markerGlb') === '1'
/** shared pedestal tiers are 16.13 / 11.78 / 7.92 u wide and 2.8 u tall; scaled into marker units */
const TIER_K = 5.4 / 16.13
export const MARKER_TIER_H = MARKER_GLB ? 2.8 * TIER_K : 1.5
const TIER_R = MARKER_GLB ? [16.13 * TIER_K, 11.78 * TIER_K, 7.92 * TIER_K] : [5.4, 4.2, 3.0]
/** prop metres → marker units */
const PROP_K = 3.4

interface PropSpec {
  id: string
  /** polar placement on the bottom tier: angle (rad, 0 = front) and radius (marker units) */
  a: number
  r: number
  k?: number
}

/** signature props per biome (manifest ids), mostly on the back half so the front stays readable */
const SIGNATURE: Record<ReturnType<typeof landmarkBiome>, PropSpec[]> = {
  ice: [
    { id: 'ice-mountain-cone', a: Math.PI, r: 6.2, k: 3.0 },
    { id: 'ice-pine-snow', a: Math.PI * 0.72, r: 4.6 },
    { id: 'ice-pine-snow', a: Math.PI * 1.3, r: 4.4, k: 2.8 },
    { id: 'ice-ice-crystal-cluster', a: Math.PI * 0.35, r: 4.6, k: 2.6 },
  ],
  city: [
    { id: 'city-small-house', a: Math.PI * 0.8, r: 4.5 },
    { id: 'city-small-house', a: Math.PI * 1.2, r: 4.5, k: 3.0 },
    { id: 'city-lamp-post', a: Math.PI * 0.38, r: 4.6, k: 2.8 },
    { id: 'city-planter-tree', a: Math.PI * 1.62, r: 4.5, k: 2.8 },
  ],
  forest: [
    { id: 'forest-round-tree-large', a: Math.PI * 0.85, r: 4.5 },
    { id: 'forest-round-tree-small', a: Math.PI * 1.25, r: 4.5 },
    { id: 'forest-mushroom', a: Math.PI * 0.35, r: 4.6, k: 3.0 },
    { id: 'forest-rock', a: Math.PI * 1.65, r: 4.6, k: 3.0 },
  ],
  sand: [
    { id: 'sand-cactus-large', a: Math.PI * 0.82, r: 4.5 },
    { id: 'sand-well', a: Math.PI * 1.2, r: 4.5, k: 3.0 },
    { id: 'sand-cactus-small', a: Math.PI * 0.35, r: 4.6, k: 3.0 },
    { id: 'sand-dune-rock', a: Math.PI * 1.65, r: 4.6, k: 3.2 },
  ],
  meadow: [
    { id: 'meadow-hay-bale', a: Math.PI * 0.82, r: 4.5 },
    { id: 'meadow-fence-segment', a: Math.PI * 1.2, r: 4.6, k: 3.2 },
    { id: 'meadow-flower-clump-peach', a: Math.PI * 0.35, r: 4.6, k: 4.0 },
    { id: 'meadow-bush', a: Math.PI * 1.65, r: 4.6, k: 3.0 },
  ],
  ocean: [
    { id: 'ocean-rock-outcrop', a: Math.PI * 0.85, r: 4.5 },
    { id: 'ocean-buoy-small', a: Math.PI * 1.22, r: 4.6, k: 4.0 },
    { id: 'ocean-seaweed-clump', a: Math.PI * 0.35, r: 4.6, k: 3.0 },
    { id: 'ocean-starfish', a: Math.PI * 1.65, r: 4.6, k: 5.0 },
  ],
  volcanic: [
    { id: 'volcanic-basalt-column', a: Math.PI * 0.85, r: 4.5 },
    { id: 'volcanic-geyser-vent', a: Math.PI * 1.22, r: 4.5, k: 3.0 },
    { id: 'volcanic-ember-rock', a: Math.PI * 0.35, r: 4.6, k: 3.2 },
    { id: 'volcanic-dead-tree', a: Math.PI * 1.65, r: 4.6, k: 3.0 },
  ],
}

function toHex(m: THREE.Material): string {
  const c = (m as THREE.MeshStandardMaterial).color
  return c ? '#' + c.getHexString() : '#cccccc'
}

/** a cloned, toon-shaded GLB; `recolour` maps material-name suffixes to family colours */
function Prop({ url, position, scale, yaw, recolour }: { url: string; position: [number, number, number]; scale: number | [number, number, number]; yaw: number; recolour?: Record<string, string> }) {
  const gltf = useGLTF(url)
  const scene = useMemo(() => {
    const s = cloneSkeleton(gltf.scene) as THREE.Group
    s.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const toon = mats.map((m) => {
        const hit = recolour && Object.keys(recolour).find((suffix) => m.name.endsWith(suffix))
        return toonMaterial(hit ? recolour[hit] : toHex(m))
      })
      mesh.material = toon.length === 1 ? toon[0] : toon
    })
    return s
  }, [gltf.scene, recolour])
  return (
    <group position={position} scale={scale} rotation={[0, yaw, 0]}>
      <primitive object={scene} />
    </group>
  )
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

/** demonstrated fraction of a course's concepts */
export function courseFraction(course: Course, progress: number) {
  const spots = course.topics.flatMap((t) => t.spots)
  if (!spots.length) return 0
  return spots.filter((c) => conceptState(c, progress) === 2).length / spots.length
}

export function markerTiers(fraction: number): 1 | 2 | 3 {
  return fraction >= 2 / 3 ? 3 : fraction >= 1 / 3 ? 2 : 1
}

function Signpost({ code, accent, x, z, y, url }: { code: string; accent: string; x: number; z: number; y: number; url?: string | null }) {
  const wood = toonMaterial('#9a7a55')
  const face = toonMaterial('#c9a77a')
  if (url) {
    // shared signpost GLB (1.82 u tall, board ~1.38 u wide near the top), scaled to the marker; the code sits on its board
    const k = 3.3
    return (
      <group position={[x, y, z]} rotation={[0, -0.22, 0]}>
        <Suspense fallback={null}>
          <Quiet>
            <Prop url={url} position={[0, 0, 0]} scale={k} yaw={0} />
          </Quiet>
        </Suspense>
        <Text position={[0, 1.42 * k, 0.24 * k]} fontSize={1.3} color="#3a2f45" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor={accent} fontWeight="bold">
          {code}
        </Text>
      </group>
    )
  }
  return (
    <group position={[x, y, z]} rotation={[0, -0.22, 0]}>
      <mesh position={[0, 2.6, 0]} material={wood}>
        <cylinderGeometry args={[0.22, 0.28, 5.2, 7]} />
      </mesh>
      <group position={[0, 5.0, 0.14]} rotation={[-0.14, 0, 0.04]}>
        <mesh material={face}>
          <boxGeometry args={[5.0, 2.2, 0.26]} />
        </mesh>
        <mesh position={[0, 0, -0.01]} material={wood} scale={[1.06, 1.1, 0.9]}>
          <boxGeometry args={[5.0, 2.2, 0.26]} />
        </mesh>
        <Text position={[0, 0, 0.15]} fontSize={1.4} color="#3a2f45" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor={accent} fontWeight="bold">
          {code}
        </Text>
      </group>
    </group>
  )
}

export function MapMarker({ course, progress, onClick }: { course: Course; progress: number; onClick: (c: Course) => void }) {
  const manifest = useLandmarkManifest()
  const fraction = courseFraction(course, progress)
  const tiers = markerTiers(fraction)
  const creatures = creatureCount(course, progress)
  const biome = course.biome
  // family palette: sides in ground_alt, caps in the charter ground tint (world bible §3.5)
  const side = toonMaterial(biome.alt)
  const top = toonMaterial(biome.ground)
  const rim = toonMaterial(biome.accent)
  const topY = tiers * MARKER_TIER_H
  const topR = TIER_R[tiers - 1]
  // props stand on the top tier, scaled to fit it; the creature is 1.6× the prop scale so it reads first
  const propK = 0.78 * (topR / TIER_R[0]) ** 0.35
  const creatureK = 1.6 * PROP_K * propK

  // the creature on top idles; the shared motion ref only needs its clock to run
  const motion = useRef<BlobMotion>({ moving: false, t: 0 })
  useFrame((_, dt) => {
    motion.current.t += dt
  })

  const props = SIGNATURE[landmarkBiome(biome.id as BiomeId)]

  return (
    <group
      onClick={(e) => {
        if (e.delta > 4) return
        e.stopPropagation()
        onClick(course)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {Array.from({ length: tiers }).map((_, i) => {
        const r = TIER_R[i]
        const y = i * MARKER_TIER_H
        const url = MARKER_GLB ? landmarkUrl(manifest, `shared-pedestal-tier-${i + 1}`) : null
        if (url)
          return (
            <Suspense key={i} fallback={null}>
              <Quiet>
                <Prop url={url} position={[0, y, 0]} scale={TIER_K} yaw={0} recolour={{ '-cream': biome.ground, '-cream2': biome.alt }} />
              </Quiet>
            </Suspense>
          )
        return (
          <group key={i} position={[0, y, 0]}>
            <mesh position={[0, MARKER_TIER_H * 0.5, 0]} material={side}>
              <cylinderGeometry args={[r, r * 1.04, MARKER_TIER_H, 28]} />
            </mesh>
            <mesh position={[0, MARKER_TIER_H - 0.01, 0]} material={top}>
              <cylinderGeometry args={[r * 1.06, r * 1.02, 0.32, 28]} />
            </mesh>
            <mesh position={[0, MARKER_TIER_H * 0.32, 0]} material={rim}>
              <cylinderGeometry args={[r * 1.02, r * 1.05, 0.22, 28]} />
            </mesh>
          </group>
        )
      })}
      <Suspense fallback={null}>
        {props.map((p, i) => {
          const url = landmarkUrl(manifest, p.id)
          if (!url) return null
          const r = topR * (p.r / 6.2) * 0.92
          return (
            <Quiet key={i}>
              <Prop url={url} position={[Math.sin(p.a) * r, topY, Math.cos(p.a) * r]} scale={(p.k ?? PROP_K) * propK} yaw={-p.a} />
            </Quiet>
          )
        })}
      </Suspense>
      <Signpost code={course.code} accent={biome.accent} x={topR * 0.62} z={topR * 0.66} y={topY} url={MARKER_GLB ? landmarkUrl(manifest, 'shared-signpost') : null} />
      {creatures > 0 && (
        <group position={[-topR * 0.3, topY + 0.1, topR * 0.35]} scale={creatureK}>
          <Creature biome={biome} index={creatures - 1} motion={motion} onClick={() => onClick(course)} />
        </group>
      )}
    </group>
  )
}
