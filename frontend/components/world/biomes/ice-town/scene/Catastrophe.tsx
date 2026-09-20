import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ICE_TOWN_PALETTE as P, type BiomeLayout, districtCentre, districtRadius } from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import type { CatastropheState } from '../state'
import { ruin } from './Structures'

/**
 * Fail is loud: every district cracks, shards fly, the snow goes dark.
 * Recovery fades the same marks back.
 */
export function Catastrophe({ layout, state }: { layout: BiomeLayout; state: CatastropheState }) {
  const storm = useRef<THREE.Group>(null)
  const amount = useRef(0)
  const raging = state.phase === 'ruin' || state.phase === 'bang' || state.phase === 'blizzard'

  useFrame((_, delta) => {
    const target = state.phase === 'ruin' ? 1 : state.phase === 'bang' || state.phase === 'blizzard' ? 0.75 : 0
    const rate = state.phase === 'recovering' ? 0.9 : 4
    amount.current += (target - amount.current) * Math.min(1, delta * rate)
    if (Math.abs(target - amount.current) < 0.003) amount.current = target
    ruin.districtId = amount.current > 0.04 ? '*' : null
    ruin.amount = amount.current
    if (!storm.current) return
    storm.current.visible = amount.current > 0.02
    storm.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material?.opacity !== undefined) material.opacity = amount.current * (index % 3 === 0 ? 0.42 : 0.22)
      child.rotation.y += delta * (0.25 + (index % 5) * 0.08)
      child.position.y += Math.sin(amount.current * 5 + index) * delta * 0.18
    })
  })

  const marks = useMemo(() => {
    return layout.districts.flatMap((district, d) => {
      const [cx, cz] = districtCentre(district)
      const size = districtRadius(district)
      const h = sampleTerrain(layout, cx, cz).height
      return Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2 + d * 0.3
        return {
          key: `${district.id}-${i}`,
          x: cx + Math.cos(angle) * size * 0.45,
          y: h + 0.08,
          z: cz + Math.sin(angle) * size * 0.45,
          yaw: -angle,
          w: size * 1.1,
        }
      })
    })
  }, [layout])

  const shards = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: Math.sin(i * 1.7) * (18 + (i % 5) * 6),
        y: 2.2 + (i % 5) * 1.1,
        z: Math.cos(i * 1.1) * (16 + (i % 4) * 5),
        s: 0.55 + (i % 4) * 0.18,
      })),
    [],
  )

  return (
    <group ref={storm} visible={raging}>
      {marks.map((mark) => (
        <mesh key={mark.key} position={[mark.x, mark.y, mark.z]} rotation={[-Math.PI / 2, 0, mark.yaw]}>
          <planeGeometry args={[mark.w, 0.55]} />
          <meshBasicMaterial color={P.waterNight} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {shards.map((shard, i) => (
        <mesh key={`shard-${i}`} position={[shard.x, shard.y, shard.z]} rotation={[0.4, i, 0.2]} scale={shard.s}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshStandardMaterial color="#e7f6ff" emissive="#9fd4ee" emissiveIntensity={0.35} roughness={0.12} transparent opacity={0.8} />
        </mesh>
      ))}
      <IceChunkPop layout={layout} raging={raging} />
    </group>
  )
}

/** Noticeable silly beat: a town ice lump inflates, then pops into flying chunks. */
function IceChunkPop({ layout, raging }: { layout: BiomeLayout; raging: boolean }) {
  const root = useRef<THREE.Group>(null)
  const bits = useRef<THREE.Group>(null)
  const started = useRef<number | null>(null)
  const town = layout.districts.find((district) => district.id === 'town')
  const [cx, cz] = town ? districtCentre(town) : [18, 2]
  const y = sampleTerrain(layout, cx, cz).height + 2.4

  useFrame((state, delta) => {
    if (!raging) {
      started.current = null
      if (root.current) {
        root.current.visible = false
        root.current.scale.setScalar(1)
      }
      if (bits.current) bits.current.visible = false
      return
    }
    if (started.current == null) started.current = state.clock.elapsedTime
    const t = state.clock.elapsedTime - started.current
    if (root.current) {
      const inflate = t < 0.28
      root.current.visible = inflate
      const swell = 1 + t * 4.8
      root.current.scale.setScalar(swell)
      root.current.rotation.y += delta * 3.2
    }
    if (bits.current) {
      bits.current.visible = t >= 0.22
      bits.current.children.forEach((child, index) => {
        const dir = 1 + (index % 5) * 0.35
        child.position.x += Math.sin(index * 1.7) * delta * 28 * dir
        child.position.y += (22 - t * 8) * delta
        child.position.z += Math.cos(index * 1.3) * delta * 24 * dir
        child.rotation.x += delta * (2 + index * 0.2)
        child.rotation.z += delta * (1.6 + index * 0.15)
        const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
        if (material?.opacity !== undefined) material.opacity = Math.max(0, 1 - t * 0.14)
      })
    }
  })

  return (
    <group position={[cx, y, cz]} name="ice-chunk-pop">
      <group ref={root} visible={false}>
        <mesh>
          <dodecahedronGeometry args={[5.2, 0]} />
          <meshStandardMaterial color="#f4fbff" emissive="#8ec8e8" emissiveIntensity={1.2} roughness={0.12} />
        </mesh>
        <mesh position={[0, 3.6, 0]}>
          <sphereGeometry args={[2.1, 10, 10]} />
          <meshStandardMaterial color="#fff6df" emissive="#ffd27a" emissiveIntensity={0.85} />
        </mesh>
      </group>
      <group ref={bits} visible={false}>
        {Array.from({ length: 22 }, (_, index) => (
          <mesh key={index} position={[0, 0.4, 0]}>
            <boxGeometry args={[1.4 + (index % 3) * 0.45, 1.3, 1.3]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? '#e8f6ff' : '#ffe7a3'}
              emissive={index % 3 === 0 ? '#e88a8a' : '#7ec4e8'}
              emissiveIntensity={0.8}
              transparent
              opacity={1}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
