import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COASTAL_PALETTE as P, type BiomeLayout, seeded, seededDistrictPlan } from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import type { CatastropheState } from '../state'
import { ruin } from './Structures'

export function Catastrophe({ layout, seed, state }: { layout: BiomeLayout; seed: number; state: CatastropheState }) {
  const cracks = useRef<THREE.Group>(null)
  const dust = useRef<THREE.Points>(null)
  const amount = useRef(0)
  const district = layout.districts.find((candidate) => candidate.id === state.districtId)
  const center = district ? seededDistrictPlan(layout, seed)[district.id].center : [0, 0] as [number, number]
  const radius = district ? Math.max(...district.catchment.map(([x, z]) => Math.hypot(x - district.nominalCenter[0], z - district.nominalCenter[1]))) : 1
  const base = district ? Math.max(layout.seaLevel + 0.06, sampleTerrain(layout, center[0], center[1]).height + 0.06) : 0
  const dustPositions = useMemo(() => {
    const rng = seeded(seed * 71 + 5)
    const positions = new Float32Array(360 * 3)
    for (let index = 0; index < 360; index++) {
      positions[index * 3] = (rng() - 0.5) * radius * 2
      positions[index * 3 + 1] = rng() * 12
      positions[index * 3 + 2] = (rng() - 0.5) * radius * 2
    }
    return positions
  }, [radius, seed])

  useFrame(({ clock }, delta) => {
    const target = state.phase === 'quake' ? 0.65 : state.phase === 'ruin' ? 1 : 0
    const rate = state.phase === 'recovering' ? 1.1 : 3
    amount.current += (target - amount.current) * Math.min(1, delta * rate)
    ruin.districtId = district?.id ?? null
    ruin.amount = amount.current
    if (cracks.current) {
      cracks.current.children.forEach((child) => {
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        material.opacity = amount.current * 0.8
        child.scale.x = 0.15 + amount.current * 0.85
      })
    }
    if (dust.current) {
      dust.current.visible = state.phase === 'squall'
      dust.current.rotation.y = clock.elapsedTime * 0.7
      const attribute = dust.current.geometry.attributes.position as THREE.BufferAttribute
      const values = attribute.array as Float32Array
      for (let index = 0; index < values.length / 3; index++) {
        values[index * 3] += delta * 5
        values[index * 3 + 1] -= delta * 1.2
        if (values[index * 3] > radius) values[index * 3] = -radius
        if (values[index * 3 + 1] < 0) values[index * 3 + 1] = 12
      }
      attribute.needsUpdate = true
    }
  })

  if (!district) return null
  return (
    <group position={[center[0], base, center[1]]}>
      <group ref={cracks}>
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 8) * Math.PI * 2 + 0.3
          return (
            <mesh key={index} position={[Math.cos(angle) * radius * 0.35, 0, Math.sin(angle) * radius * 0.35]} rotation={[-Math.PI / 2, 0, -angle]}>
              <planeGeometry args={[radius * 0.75, 0.28]} />
              <meshBasicMaterial color={P.ink} transparent opacity={0} depthWrite={false} />
            </mesh>
          )
        })}
      </group>
      <points ref={dust} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={P.ground} size={0.55} transparent opacity={0.75} depthWrite={false} />
      </points>
    </group>
  )
}
