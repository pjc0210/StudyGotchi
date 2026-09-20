import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COASTAL_PALETTE as P, type BiomeLayout, seeded } from '../layout/biome-layout'
import { Surf } from '../render/materials'
import { SmallBoat } from './Props'

export function Clouds({ layout, night }: { layout: BiomeLayout; night: boolean }) {
  const group = useRef<THREE.Group>(null)
  const clouds = useMemo(() => {
    const rng = seeded(91)
    return Array.from({ length: 7 }, () => ({
      x: (rng() - 0.5) * layout.frameRadius * 3,
      z: (rng() - 0.5) * layout.frameRadius * 2.4,
      y: 18 + rng() * 7,
      scale: 2.2 + rng() * 2,
      speed: 0.18 + rng() * 0.22,
    }))
  }, [layout.frameRadius])

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.children.forEach((child, index) => {
      child.position.x += clouds[index].speed * delta
      if (child.position.x > layout.frameRadius * 1.8) child.position.x = -layout.frameRadius * 1.8
    })
  })

  return (
    <group ref={group}>
      {clouds.map((cloud, index) => (
        <group key={index} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.scale}>
          {[[0, 0, 0, 1], [1.1, -0.1, 0.2, 0.72], [-0.9, -0.15, -0.2, 0.62]].map(([x, y, z, radius], part) => (
            <mesh key={part} position={[x, y, z]} scale={[1, 0.5, 1]}>
              <dodecahedronGeometry args={[radius, 0]} />
              <Surf color={night ? '#374d62' : '#f8f2df'} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function routeLengths(points: Array<[number, number]>) {
  const lengths: number[] = [0]
  for (let index = 1; index < points.length; index++) {
    lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]))
  }
  return lengths
}

function pointOnRoute(points: Array<[number, number]>, progress: number) {
  const lengths = routeLengths(points)
  const total = lengths[lengths.length - 1]
  const distance = progress * total
  for (let index = 1; index < points.length; index++) {
    if (distance <= lengths[index]) {
      const segment = lengths[index] - lengths[index - 1]
      const t = (distance - lengths[index - 1]) / segment
      return {
        x: points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t,
        z: points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t,
        yaw: Math.atan2(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]),
      }
    }
  }
  return { x: points[0][0], z: points[0][1], yaw: 0 }
}

/** Hidden for 14 seconds, then a fishing skiff crosses the forum route for 22 seconds. */
export function BoatEvent({ layout, seed, paused }: { layout: BiomeLayout; seed: number; paused: boolean }) {
  const group = useRef<THREE.Group>(null)
  const wakes = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const route = layout.boatRoutes[(seed + 1) % layout.boatRoutes.length]
  useFrame(({ clock }) => {
    const node = group.current
    if (!node) return
    const cycle = (clock.elapsedTime + seed * 2.3) % 36
    if (paused || cycle < 14) {
      node.visible = false
      return
    }
    node.visible = true
    const progress = (cycle - 14) / 22
    const point = pointOnRoute(route.points, progress)
    node.position.set(point.x, layout.seaLevel + 0.04, point.z)
    node.rotation.y = point.yaw
    wakes.forEach((wake, index) => {
      if (!wake.current) return
      const pulse = (clock.elapsedTime * 0.7 + index / 3) % 1
      wake.current.scale.setScalar(0.7 + pulse * 2.4)
      ;(wake.current.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * 0.45
    })
  })

  return (
    <group ref={group} visible={false}>
      <SmallBoat accent={P.cobalt} />
      {wakes.map((wake, index) => (
        <mesh key={index} ref={wake} position={[0, 0.05, -3.2 - index * 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.9, 16]} />
          <meshBasicMaterial color="#f8f2df" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

export function Stars() {
  const positions = useMemo(() => {
    const rng = seeded(23)
    const values = new Float32Array(520 * 3)
    for (let index = 0; index < 520; index++) {
      const angle = rng() * Math.PI * 2
      const elevation = Math.acos(rng() * 0.9)
      const radius = 500
      values[index * 3] = Math.sin(elevation) * Math.cos(angle) * radius
      values[index * 3 + 1] = Math.cos(elevation) * radius * 0.65 + 45
      values[index * 3 + 2] = Math.sin(elevation) * Math.sin(angle) * radius
    }
    return values
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fff8df" size={2} sizeAttenuation={false} transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}
