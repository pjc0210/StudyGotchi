import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Biome } from '../lib/world'
import { toonGradient, toonMaterial } from '../lib/toon'
import { tripoToonMaterial } from '../lib/tripo-materials'
import { Blob, type BlobMotion } from './Blob'
import { ROSTER_IDS, creatureMeta, creatureUrl } from '../data/roster'
import { GUEST_BY_ID, isGuestId } from '../data/guest-pack'
import { isTripoId } from '../data/tripo-assets'

/** Preload the whole roster once so creatures pop in without a fetch gap. */
let preloaded = false
export function preloadRoster() {
  if (preloaded) return
  preloaded = true
  for (const id of ROSTER_IDS) useGLTF.preload(creatureUrl(id))
}

type ClipName = 'idle' | 'walk' | 'happy' | 'sad' | 'sleep'
const FADE = 0.15
/** a `sleepy` creature dozes off after standing still this long */
const SLEEP_AFTER = 6

export interface GlbCreatureProps {
  id: string
  biome: Biome
  variant: number
  motion: React.RefObject<BlobMotion>
  onClick?: () => void
  selected?: boolean
  /** topic under stress (no such flag exists in world-lab yet; wired for the real app) */
  sad?: boolean
}

interface Requests {
  /** set by the click handler, consumed by the model's frame loop */
  happy: boolean
}

function toHex(m: THREE.Material): string {
  const c = (m as THREE.MeshStandardMaterial).color
  return c ? '#' + c.getHexString() : '#cccccc'
}

/**
 * One animated GLB creature. The loaded scene is cloned per instance and re-skinned with the
 * shared toon materials (one material per colour across the whole roster). `Root` is never
 * animated: the parent group moves the creature exactly as it does with `Blob`.
 *
 * Clip state machine: walk while `motion.moving`, else idle; `happy` once on click (LoopOnce +
 * clampWhenFinished, then back); `sleep` for sleepy personalities after 6 s of standing still;
 * `sad` while the `sad` prop is set. Every transition is a 0.15 s crossfade.
 */
function GlbCreatureModel({ id, motion, variant, sad, requests }: Pick<GlbCreatureProps, 'id' | 'motion' | 'variant' | 'sad'> & { requests: React.RefObject<Requests> }) {
  const gltf = useGLTF(creatureUrl(id))
  const root = useRef<THREE.Group>(null)
  const scene = useMemo(() => {
    const s = cloneSkeleton(gltf.scene) as THREE.Group
    s.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        // Guest / Tripo bodies carry painted faces or vertex colours; the generic toon swap would drop them.
        const painted = isTripoId(id) || isGuestId(id)
        const toon = mats.map((m) => (painted ? tripoToonMaterial(m, toonGradient()) : toonMaterial(toHex(m))))
        mesh.material = toon.length === 1 ? toon[0] : toon
      }
    })
    return s
  }, [gltf.scene, id])

  const { actions, mixer } = useAnimations(gltf.animations, root)
  const state = useRef<{ current: ClipName | null; idleFor: number; happy: boolean }>({ current: null, idleFor: 0, happy: false })
  const sleepy = creatureMeta(id)?.personality === 'sleepy'

  useEffect(() => {
    const happy = actions.happy
    if (happy) {
      happy.setLoop(THREE.LoopOnce, 1)
      happy.clampWhenFinished = true
    }
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === happy) state.current.happy = false
    }
    mixer.addEventListener('finished', onFinished)
    const idle = actions.idle
    if (idle) {
      idle.play()
      // stagger loop phases so a crowd does not breathe in unison
      idle.time = (variant * 0.37) % (idle.getClip().duration || 1)
      state.current.current = 'idle'
    }
    return () => {
      mixer.removeEventListener('finished', onFinished)
      mixer.stopAllAction()
    }
  }, [actions, mixer, variant])

  const pop = useRef(0)
  const guestScale = GUEST_BY_ID[id]?.scale ?? 1
  const hasClips = (gltf.animations?.length ?? 0) > 0
  useFrame((_, dt) => {
    const m = motion.current
    const s = state.current
    if (!m) return
    pop.current = Math.min(1, pop.current + dt * 2.5)
    const k = pop.current
    const popScale = k < 1 ? 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2) : 1
    if (root.current) {
      root.current.scale.setScalar(Math.max(0.001, popScale) * guestScale)
      if (!hasClips) {
        root.current.position.y = m.moving ? Math.abs(Math.sin(m.t * 12)) * 0.08 : Math.sin(m.t * 2) * 0.02
        if (m.moving) root.current.rotation.y += dt * 0.4
      }
    }

    if (requests.current?.happy) {
      requests.current.happy = false
      s.happy = true
      s.current = null // force a fresh play even if happy was already the current clip
    }
    if (m.moving) s.idleFor = 0
    else s.idleFor += dt

    let next: ClipName
    if (s.happy) next = 'happy'
    else if (sad) next = 'sad'
    else if (m.moving) next = 'walk'
    else if (sleepy && s.idleFor >= SLEEP_AFTER) next = 'sleep'
    else next = 'idle'

    if (next === s.current) return
    const to = actions[next]
    if (!to) {
      s.current = next
      return
    }
    const from = s.current ? actions[s.current] : null
    to.reset().setEffectiveWeight(1).play()
    if (from && from !== to) from.crossFadeTo(to, FADE, false)
    else if (!from) for (const a of Object.values(actions)) if (a && a !== to && a.isRunning()) a.crossFadeTo(to, FADE, false)
    s.current = next
  })

  return (
    <group ref={root} scale={0.001}>
      <primitive object={scene} />
    </group>
  )
}

/** Falls back to the primitive Blob if the GLB fails to load or parse. */
class CreatureBoundary extends Component<{ fallback: ReactNode; children: ReactNode; id: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn(`[GlbCreature] ${this.props.id} failed, using primitive Blob`, err)
  }
  componentDidUpdate(prev: { id: string }) {
    if (prev.id !== this.props.id && this.state.failed) this.setState({ failed: false })
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function GlbCreature({ id, biome, variant, motion, onClick, selected, sad }: GlbCreatureProps) {
  const requests = useRef<Requests>({ happy: false })

  return (
    <CreatureBoundary id={id} fallback={<Blob biome={biome} variant={variant} motion={motion} onClick={onClick} selected={selected} />}>
      <group
        onClick={(e) => {
          e.stopPropagation()
          requests.current.happy = true
          onClick?.()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <Suspense fallback={null}>
          <GlbCreatureModel id={id} motion={motion} variant={variant} sad={sad} requests={requests} />
        </Suspense>
        {selected && (
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.6, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        )}
        {/* the same shadow blob the primitive creature carries */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.32, 20]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.16} />
        </mesh>
      </group>
    </CreatureBoundary>
  )
}
