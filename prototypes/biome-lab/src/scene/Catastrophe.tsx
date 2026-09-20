import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ICE_TOWN_PALETTE as P, type BiomeLayout, districtCentre, districtRadius } from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import type { CatastropheState } from '../state'
import { ruin } from './Structures'

/**
 * Ruin state for one district (plan §3): the district's lights go out (handled by `darkDistrict`),
 * a subset of its props is knocked over (driven through the shared `ruin` amount), and dark
 * crack seams open in the snow around it. The ground never moves. Recovery fades it all back.
 */
export function Catastrophe({ layout, state }: { layout: BiomeLayout; state: CatastropheState }) {
  const seams = useRef<THREE.Group>(null)
  const amount = useRef(0)
  const district = layout.districts.find((c) => c.id === state.districtId)

  useFrame((_, delta) => {
    const target = state.phase === 'ruin' ? 1 : state.phase === 'bang' ? 0.6 : 0
    const rate = state.phase === 'recovering' ? 0.9 : 3
    amount.current += (target - amount.current) * Math.min(1, delta * rate)
    if (Math.abs(target - amount.current) < 0.003) amount.current = target
    ruin.districtId = district?.id ?? null
    ruin.amount = amount.current
    if (seams.current) {
      seams.current.children.forEach((child) => {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        m.opacity = amount.current * 0.85
        child.scale.x = 0.2 + amount.current * 0.8
      })
    }
  })

  if (!district) return null
  const [cx, cz] = districtCentre(district)
  const size = districtRadius(district)
  const h = sampleTerrain(layout, cx, cz).height

  return (
    <group ref={seams} position={[cx, h + 0.06, cz]}>
      {Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2 + 0.4
        return (
          <mesh key={i} position={[Math.cos(angle) * size * 0.4, 0, Math.sin(angle) * size * 0.4]} rotation={[-Math.PI / 2, 0, -angle]}>
            <planeGeometry args={[size * 0.8, 0.2]} />
            <meshBasicMaterial color={P.waterNight} transparent opacity={0} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}
