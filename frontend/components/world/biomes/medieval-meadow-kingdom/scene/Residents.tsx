import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MEADOW_PALETTE as P, type DistrictProgress, type GeneratedKingdom } from '../layout/biome-layout'
import { animalPlacements, residentSeats, sampleTerrain, type AnimalPlacement, type ResidentSeat } from '../layout/terrain'
import { Surf } from '../render/materials'
import type { CatastrophePhase } from '../state'

/** Live resident positions so the camera can follow one without React state churn. */
export const residentPositions: THREE.Vector3[] = []

const ACCENTS = [P.coral, P.ochre, P.rose, P.wheat, P.forestLight, P.light]

/** Height of the modelled creature (hat tip) at scale 1. */
const MODEL_HEIGHT = 1.5

function Animal({ animal }: { animal: AnimalPlacement }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.position.y = animal.position[1] + Math.abs(Math.sin(clock.elapsedTime * 2.1 + animal.position[0])) * 0.06
  })
  const bodyColor = animal.kind === 'cow' ? '#b98055' : animal.kind === 'sheep' ? '#eee6cf' : P.wheat
  const size = animal.kind === 'cow' ? 1.5 : animal.kind === 'sheep' ? 1.05 : 0.48
  return (
    <group ref={group} position={animal.position} rotation={[0, animal.yaw, 0]} scale={animal.scale * size}>
      <mesh position={[0, 0.72, 0]} scale={[1.35, 0.8, 0.78]} castShadow>
        <dodecahedronGeometry args={[0.62, animal.kind === 'sheep' ? 1 : 0]} />
        <Surf color={bodyColor} />
      </mesh>
      <mesh position={[0, 0.73, 0.62]} castShadow>
        <dodecahedronGeometry args={[animal.kind === 'cow' ? 0.34 : 0.28, 0]} />
        <Surf color={animal.kind === 'sheep' ? '#4b4039' : bodyColor} />
      </mesh>
      {[-0.4, 0.4].flatMap((x) => [-0.24, 0.24].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 0.25, z]}>
          <cylinderGeometry args={[0.055, 0.075, 0.5, 5]} />
          <Surf color={animal.kind === 'chicken' ? P.ochre : '#55463b'} />
        </mesh>
      )))}
      {animal.kind === 'cow' && [-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x, 1.02, 0.75]} rotation={[Math.PI / 2, 0, x * 2]}>
          <coneGeometry args={[0.08, 0.42, 5]} />
          <Surf color={P.limestone} />
        </mesh>
      ))}
      {animal.kind === 'chicken' && (
        <mesh position={[0, 1.02, 0.65]}>
          <coneGeometry args={[0.12, 0.28, 5]} />
          <Surf color={P.coral} />
        </mesh>
      )}
    </group>
  )
}

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
  seat: ResidentSeat
  layout: GeneratedKingdom
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
    const u = sleeping ? seat.phase : t * 0.16 + seat.phase
    const x = seat.center[0] + Math.sin(u) * seat.radius
    const z = seat.center[1] + Math.sin(u * 2 + 0.6) * seat.radius * 0.55
    const s = sampleTerrain(layout, x, z)
    const y = Math.max(layout.waterHeight + 0.5, s.height)
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
        <Surf color={index % 2 ? P.limestone : '#e8dec0'} />
      </mesh>
      <mesh ref={head} castShadow>
        <icosahedronGeometry args={[0.4, 2]} />
        <Surf color={P.limestone} />
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
  layout: GeneratedKingdom
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
  const animals = useMemo(() => animalPlacements(layout, seed), [layout, seed])
  return (
    <group>
      {seats.map((seat, i) => (
        <Resident key={i} index={i} apart={apart} seat={seat} layout={layout} sleeping={night && i % 3 === 0} scale={scale} />
      ))}
      {animals.map((animal, index) => <Animal key={`${animal.kind}-${index}`} animal={animal} />)}
    </group>
  )
}
