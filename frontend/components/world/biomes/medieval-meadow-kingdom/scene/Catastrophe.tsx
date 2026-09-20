import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MEADOW_PALETTE as P, type GeneratedKingdom } from '../layout/biome-layout'
import type { CatastropheState } from '../state'
import { ruin } from './Structures'

export function Catastrophe({ layout, state }: { layout: GeneratedKingdom; state: CatastropheState }) {
  const group = useRef<THREE.Group>(null)
  const amount = useRef(0)
  const district = layout.districts.find((candidate) => candidate.id === state.districtId)

  useFrame((_, delta) => {
    const target = state.phase === 'ruin' ? 1 : state.phase === 'bang' ? 0.65 : 0
    amount.current += (target - amount.current) * Math.min(1, delta * (state.phase === 'recovering' ? 1 : 3))
    ruin.districtId = district?.id ?? null
    ruin.amount = amount.current
    group.current?.children.forEach((child) => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      material.opacity = amount.current * 0.85
      child.scale.x = 0.2 + amount.current * 0.8
    })
  })

  if (!district) return null
  return (
    <group ref={group} position={[district.centre[0], district.id === 'castle-court' ? 2.3 : 0.18, district.centre[1]]}>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2 + 0.25
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 7, 0, Math.sin(angle) * 7]}
            rotation={[-Math.PI / 2, 0, -angle]}
          >
            <planeGeometry args={[12, 0.35]} />
            <meshBasicMaterial color={P.ink} transparent opacity={0} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}
