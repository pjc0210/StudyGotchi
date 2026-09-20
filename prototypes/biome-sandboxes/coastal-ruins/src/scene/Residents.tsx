import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COASTAL_PALETTE as P, type BiomeLayout, type DistrictProgress } from '../layout/biome-layout'
import { residentSeats, sampleTerrain, type ResidentSeat } from '../layout/terrain'
import { Surf } from '../render/materials'
import type { CatastrophePhase } from '../state'

export const residentPositions: THREE.Vector3[] = []
const MODEL_HEIGHT = 1.65

function Resident({
  index,
  seat,
  layout,
  apart,
  sleeping,
  scale,
}: {
  index: number
  seat: ResidentSeat
  layout: BiomeLayout
  apart: React.MutableRefObject<number>
  sleeping: boolean
  scale: number
}) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const head = useRef<THREE.Group>(null)
  const satchel = useRef<THREE.Mesh>(null)
  const previous = useRef(new THREE.Vector3())

  useFrame(({ clock }) => {
    if (!group.current || !body.current || !head.current || !satchel.current) return
    const time = sleeping ? seat.phase : clock.elapsedTime * 0.28 + seat.phase
    const x = seat.center[0] + Math.sin(time) * seat.radius
    const z = seat.center[1] + Math.sin(time * 2 + 0.4) * seat.radius * 0.45
    const terrain = sampleTerrain(layout, x, z)
    const y = Math.max(layout.seaLevel + 0.25, terrain.height)
    group.current.position.set(x, y, z)
    if (!sleeping) group.current.rotation.y = Math.atan2(x - previous.current.x, z - previous.current.z)
    previous.current.set(x, y, z)
    if (!residentPositions[index]) residentPositions[index] = new THREE.Vector3()
    residentPositions[index].copy(group.current.position)

    const amount = apart.current
    const bob = sleeping ? 0 : Math.abs(Math.sin(clock.elapsedTime * 5.5 + index)) * 0.12
    body.current.position.set(0, 0.56 + bob - amount * 0.25, 0)
    body.current.rotation.z = (sleeping ? 1.2 : Math.sin(clock.elapsedTime * 5.5 + index) * 0.08) + amount * (index % 2 ? -1 : 1)
    head.current.position.set(amount * 0.8, 1.22 + bob + amount * 0.5, amount * 0.35)
    head.current.rotation.z = amount * 1.7
    satchel.current.position.set(-0.42 - amount * 0.7, 0.55 + amount * 0.3, 0.12)
  })

  return (
    <group ref={group} scale={scale}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.48, 12]} />
        <meshBasicMaterial color={P.ink} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh ref={body} castShadow scale={[0.8, 1, 0.75]}>
        <dodecahedronGeometry args={[0.6, 1]} />
        <Surf color={index % 3 === 1 ? '#e2cfaa' : P.plaster} />
      </mesh>
      <group ref={head}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.45, 1]} />
          <Surf color={P.ground} />
        </mesh>
        {[-0.23, 0.23].map((x) => (
          <mesh key={x} position={[x, 0.34, -0.03]} rotation={[0, 0, x * -0.7]}>
            <coneGeometry args={[0.17, 0.45, 5]} />
            <Surf color={P.cliff} />
          </mesh>
        ))}
        {[-0.14, 0.14].map((x) => (
          <mesh key={`eye-${x}`} position={[x, 0.05, 0.4]}>
            <sphereGeometry args={[0.045, 6, 5]} />
            <meshBasicMaterial color={P.ink} />
          </mesh>
        ))}
      </group>
      <mesh ref={satchel} castShadow>
        <boxGeometry args={[0.42, 0.48, 0.22]} />
        <Surf color={index % 2 ? P.cobalt : P.violet} />
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
  const scale = (layout.creatureHeight / MODEL_HEIGHT) * layout.creatureScale
  useFrame((_, delta) => {
    const target = phase === 'quake' || phase === 'ruin' ? 1 : 0
    const rate = phase === 'quake' ? 4.5 : 1.8
    apart.current += (target - apart.current) * Math.min(1, delta * rate)
  })
  const seats = useMemo(() => residentSeats(layout, progress, count, seed), [count, layout, progress, seed])
  return (
    <group>
      {seats.map((seat, index) => (
        <Resident
          key={index}
          index={index}
          seat={seat}
          layout={layout}
          apart={apart}
          sleeping={night && index % 4 === 0}
          scale={scale}
        />
      ))}
    </group>
  )
}
