import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ICE_TOWN_PALETTE as P, type BiomeLayout, type DistrictProgress } from '../layout/biome-layout'
import { residentSeats, sampleTerrain, type Seat } from '../layout/terrain'
import { Surf } from '../render/materials'
import type { CatastrophePhase } from '../state'

/** Live resident positions so the camera can follow one without React state churn. */
export const residentPositions: THREE.Vector3[] = []

const ACCENTS = [P.coral, P.mint, P.lilac, P.peach, P.timberTeal, P.light]

/** Height of the modelled creature (hat tip) at scale 1. */
const MODEL_HEIGHT = 1.5

function Resident({
  index,
  apart,
  seat,
  layout,
  sleeping,
  scale,
}: {
  index: number
  apart: React.MutableRefObject<number>
  seat: Seat
  layout: BiomeLayout
  sleeping: boolean
  scale: number
}) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const head = useRef<THREE.Mesh>(null)
  const hat = useRef<THREE.Mesh>(null)
  const accent = ACCENTS[index % ACCENTS.length]
  const last = useRef(new THREE.Vector3())

  useFrame(({ clock }) => {
    if (!group.current || !body.current || !head.current || !hat.current) return
    const t = clock.elapsedTime
    // Wander: a slow figure-of-eight loop inside the cluster, height read from the heightfield.
    const u = sleeping ? seat.phase : t * seat.speed + seat.phase
    const x = seat.center[0] + Math.sin(u) * seat.rx
    const z = seat.center[1] + Math.sin(u * 2 + 0.6) * seat.rz
    const s = sampleTerrain(layout, x, z)
    const y = Math.max(layout.seaLevel + 0.5, s.height)
    const p = group.current.position
    if (!sleeping) group.current.rotation.y = Math.atan2(x - last.current.x, z - last.current.z)
    last.current.set(x, y, z)
    p.set(x, y, z)
    if (!residentPositions[index]) residentPositions[index] = new THREE.Vector3()
    residentPositions[index].copy(p)

    // Walk cycle: hop and lean. Fall apart: parts spring out and the head tumbles, then reassemble.
    const a = apart.current
    const ease = a * a * (3 - 2 * a)
    const bob = sleeping ? 0 : Math.abs(Math.sin(t * 6 + seat.phase * 10)) * 0.12
    body.current.position.set(0, 0.42 + bob - ease * 0.3, 0)
    body.current.rotation.z = sleeping ? 1.4 : Math.sin(t * 6 + seat.phase * 10) * 0.08 + ease * 1.2
    head.current.position.set(ease * 0.9, 0.86 + bob + ease * 0.4, ease * 0.5)
    head.current.rotation.x = ease * 2.4
    hat.current.position.set(-ease * 0.8, 1.25 + bob + ease * 1.1, -ease * 0.3)
    hat.current.rotation.z = ease * 2.0
  })

  return (
    <group ref={group} scale={scale}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 12]} />
        <meshBasicMaterial color={P.ink} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh ref={body} castShadow scale={[1.0, 0.9, 0.95]}>
        <dodecahedronGeometry args={[0.5, 1]} />
        <Surf color={index % 2 ? P.cream : '#dceef2'} />
      </mesh>
      <mesh ref={head} castShadow>
        <icosahedronGeometry args={[0.4, 2]} />
        <Surf color={P.cream} />
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.06, 0.36]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshBasicMaterial color={P.ink} />
          </mesh>
        ))}
      </mesh>
      <mesh ref={hat} castShadow>
        <coneGeometry args={[0.32, 0.52, 7]} />
        <Surf color={accent} />
      </mesh>
    </group>
  )
}

export function Residents({
  layout,
  progress,
  count,
  seed,
  phase,
  night,
}: {
  layout: BiomeLayout
  progress: DistrictProgress
  count: number
  seed: number
  phase: CatastrophePhase
  night: boolean
}) {
  const apart = useRef(0)
  // Scale rule: base height × the per-course creature scale (biome-layout.ts, requiredCreatureScale).
  const scale = (layout.creatureHeight / MODEL_HEIGHT) * layout.creatureScale
  useFrame((_, delta) => {
    const target = phase === 'bang' || phase === 'ruin' ? 1 : 0
    const rate = phase === 'bang' ? 4.5 : 1.6
    apart.current += (target - apart.current) * Math.min(1, delta * rate)
    if (Math.abs(target - apart.current) < 0.005) apart.current = target
  })
  const seats = useMemo(() => residentSeats(layout, progress, count, seed), [layout, progress, count, seed])
  return (
    <group>
      {seats.map((seat, i) => (
        <Resident key={i} index={i} apart={apart} seat={seat} layout={layout} sleeping={night && i % 3 === 0} scale={scale} />
      ))}
    </group>
  )
}
