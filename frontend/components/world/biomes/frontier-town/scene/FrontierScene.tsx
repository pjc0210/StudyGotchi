import { useEffect, useMemo, useRef } from 'react'
import { Stars as DreiStars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  FRONTIER_LAYOUT as L,
  FRONTIER_PALETTE as P,
  courseProgress,
  dioramaCameraPose,
  generateLayout,
  landmarkStage,
  populationFor,
  seeded,
  skylineProfile,
} from '../layout/biome-layout'
import { PixelComposer } from '../render/PixelComposer'
import { Glow, Surf } from '../render/materials'
import type { LabState } from '../state'

const rad = (degrees: number) => (degrees * Math.PI) / 180

function Box({ position, size, color, rotation = [0, 0, 0], glow = false }: {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  rotation?: [number, number, number]
  glow?: boolean
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      {glow ? <Glow color={color} on intensity={1.5} /> : <Surf color={color} />}
    </mesh>
  )
}

function Post({ x, y, z, h, color = P.timberDark, r = 0.16 }: { x: number; y: number; z: number; h: number; color?: string; r?: number }) {
  return (
    <mesh position={[x, y + h / 2, z]} castShadow>
      <cylinderGeometry args={[r, r * 1.15, h, 6]} />
      <Surf color={color} />
    </mesh>
  )
}

function StarBadge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><cylinderGeometry args={[0.42, 0.42, 0.16, 10]} /><Surf color={P.mustard} /></mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <Box key={i} position={[0, 0, 0]} size={[0.15, 1.15, 0.12]} color={P.mustard} rotation={[0, 0, (i * Math.PI) / 5]} />
      ))}
    </group>
  )
}

function FalseFront({ position, color, variant = 'store', night = false }: {
  position: [number, number, number]
  color: string
  variant?: 'store' | 'saloon' | 'sheriff' | 'hotel'
  night?: boolean
}) {
  const tall = variant === 'saloon' || variant === 'hotel'
  const h = tall ? 8.2 : variant === 'sheriff' ? 5.2 : 5.7
  const w = variant === 'hotel' ? 9 : variant === 'sheriff' ? 6.4 : 7.6
  const facadeTop = h + (variant === 'saloon' ? 1.35 : 0.9)
  return (
    <group position={position}>
      <Box position={[0, h / 2, 0]} size={[w, h, 5.4]} color={color} />
      <Box position={[0, facadeTop, 0.08]} size={[w + 0.8, variant === 'saloon' ? 2.7 : 1.8, 0.55]} color={color} />
      <Box position={[0, h + 0.55, -0.6]} size={[w + 0.15, 0.45, 6.2]} color={P.timberDark} rotation={[0.04, 0, 0]} />
      <Box position={[-w * 0.32, facadeTop + 1.1, 0.12]} size={[w * 0.22, 0.85, 0.62]} color={color} />
      <Box position={[w * 0.32, facadeTop + 1.1, 0.12]} size={[w * 0.22, 0.85, 0.62]} color={color} />
      <Box position={[0, 0.28, 3.55]} size={[w + 1.2, 0.56, 2.5]} color={P.timber} />
      <Box position={[0, 3.45, 3.3]} size={[w + 1.1, 0.28, 2.8]} color={variant === 'saloon' ? P.oxblood : P.timber} rotation={[0.13, 0, 0]} />
      {[-w * 0.4, 0, w * 0.4].map((x) => <Post key={x} x={x} y={0} z={3.25} h={3.35} r={0.19} />)}
      {[-w * 0.4, w * 0.4].map((x) => (
        <Box key={`brace${x}`} position={[x * 0.92, 2.8, 3.28]} size={[1.3, 0.17, 0.17]} color={P.timberDark} rotation={[0, 0, x > 0 ? -0.68 : 0.68]} />
      ))}
      {[-w * 0.27, w * 0.27].map((x) => <Box key={x} position={[x, tall ? 5.4 : 2.7, 2.73]} size={[1.25, 1.35, 0.14]} color={night ? P.lamp : '#40545a'} glow={night} />)}
      <Box position={[0, 1.35, 2.64]} size={[1.3, 2.7, 0.14]} color={P.timberDark} />
      <Box position={[0, h + 0.7, 0.4]} size={[w * 0.55, 0.55, 0.18]} color={variant === 'saloon' ? P.canvas : P.timberDark} />
      <Box position={[0, h + 0.7, 0.52]} size={[w * 0.38, 0.12, 0.12]} color={P.mustard} />
      {variant === 'saloon' && (
        <>
          <Box position={[0, 4.45, 3.15]} size={[w + 0.2, 0.35, 2.2]} color={P.timber} />
          {[-w * 0.43, w * 0.43].map((x) => <Post key={x} x={x} y={4.2} z={3.7} h={2.5} />)}
          <Box position={[0, 5.1, 2.76]} size={[w * 0.78, 0.18, 0.18]} color={P.mustard} />
        </>
      )}
      {variant === 'hotel' && <>
        <Box position={[w / 2 + 0.7, 4.3, 0.4]} size={[1.1, 8.3, 1.1]} color={P.timberDark} />
        <Box position={[w / 2 + 0.7, 8.9, 0.4]} size={[2.2, 0.55, 0.35]} color={P.canvas} />
      </>}
      {variant === 'sheriff' && <>
        <StarBadge position={[1.9, 3.8, 2.92]} />
        {[-2.3, -1.9, -1.5].map((x) => <Box key={x} position={[x, 2.65, 2.82]} size={[0.09, 1.55, 0.09]} color={P.ink} />)}
      </>}
      <Box position={[w * 0.3, h + 1.8, -1.4]} size={[0.8, 3.2, 0.8]} color={P.timberDark} />
    </group>
  )
}

function WaterTower({ night }: { night: boolean }) {
  return (
    <group>
      {[-2, 2].flatMap((x) => [-2, 2].map((z) => <Post key={`${x}:${z}`} x={x} y={0} z={z} h={9} r={0.25} />))}
      {[2.5, 5.5, 8].map((y) => <Box key={y} position={[0, y, 0]} size={[5.2, 0.22, 5.2]} color={P.timber} />)}
      <mesh position={[0, 10, 0]} castShadow>
        <cylinderGeometry args={[3.2, 3.2, 4.2, 12]} />
        <Surf color={P.teal} />
      </mesh>
      <mesh position={[0, 12.4, 0]} castShadow>
        <coneGeometry args={[3.6, 1.2, 12]} />
        <Surf color={P.oxblood} />
      </mesh>
      <Box position={[0, 10, 3.23]} size={[0.8, 1.3, 0.1]} color={night ? P.lamp : P.mustard} glow={night} />
    </group>
  )
}

function Cactus({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Post x={0} y={0} z={0} h={5} r={0.42} color={P.cactus} />
      <Post x={1.2} y={2.1} z={0} h={2.2} r={0.3} color={P.cactus} />
      <Box position={[0.62, 2.25, 0]} size={[1.25, 0.55, 0.55]} color={P.cactus} />
      <Post x={-1} y={1.2} z={0} h={1.7} r={0.27} color={P.cactus} />
      <Box position={[-0.5, 1.35, 0]} size={[1, 0.5, 0.5]} color={P.cactus} />
    </group>
  )
}

function PricklyPear({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[
        [-0.8, 0.7, 0, 0.75],
        [0, 1.0, 0, 1],
        [0.8, 0.65, 0.2, 0.7],
        [0.25, 1.8, -0.1, 0.62],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s, s * 1.3, 0.28]} castShadow>
          <sphereGeometry args={[0.7, 7, 5]} />
          <Surf color={i === 3 ? '#5a934f' : P.cactus} />
        </mesh>
      ))}
    </group>
  )
}

function Scrub({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[-0.7, 0, 0.7].map((x, i) => (
        <mesh key={x} position={[x, 0.45 + i * 0.12, (i % 2) * 0.5]} castShadow>
          <dodecahedronGeometry args={[0.72, 0]} />
          <Surf color={i % 2 ? '#78904d' : '#6e8245'} />
        </mesh>
      ))}
    </group>
  )
}

function RockOutcrop({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.0, 0]} scale={[1.8, 1, 1.1]} castShadow><dodecahedronGeometry args={[1, 0]} /><Surf color="#90745d" /></mesh>
      <mesh position={[1.5, 0.6, 0.5]} scale={[1.1, 0.7, 0.8]} castShadow><dodecahedronGeometry args={[1, 0]} /><Surf color={P.strata} /></mesh>
      <mesh position={[-1.2, 0.45, 0.8]} scale={[0.8, 0.5, 0.7]} castShadow><dodecahedronGeometry args={[1, 0]} /><Surf color="#7f6654" /></mesh>
    </group>
  )
}

function HayBale({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[1.2, 1.2, 2.2, 10]} />
      <Surf color="#e8c96a" />
    </mesh>
  )
}

function WindPump() {
  const wheel = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.z += delta * 0.65
  })
  return (
    <group>
      {[-1.5, 1.5].flatMap((x) => [-1.5, 1.5].map((z) => <Post key={`${x}:${z}`} x={x} y={0} z={z} h={9} r={0.13} />))}
      {[2.5, 5, 7.5].map((y) => <Box key={y} position={[0, y, 0]} size={[3.3 - y * 0.18, 0.14, 3.3 - y * 0.18]} color={P.timber} />)}
      <group ref={wheel} position={[0, 9, 1.5]}>
        <mesh>
          <torusGeometry args={[2.3, 0.16, 6, 16]} />
          <Surf color={P.canvas} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <Box key={i} position={[0, 0, 0]} size={[0.12, 4.5, 0.1]} color={P.timberDark} rotation={[0, 0, (i * Math.PI) / 8]} />
        ))}
      </group>
    </group>
  )
}

function Corral({ position, radius }: { position: [number, number, number]; radius: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.13, 5, 32]} />
        <Surf color={P.timber} />
      </mesh>
      <mesh position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.13, 5, 32]} />
        <Surf color={P.timber} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return <Post key={i} x={Math.cos(a) * radius} y={0} z={Math.sin(a) * radius} h={2.5} r={0.12} />
      })}
    </group>
  )
}

function FenceRun({ position, length, yaw = 0 }: { position: [number, number, number]; length: number; yaw?: number }) {
  const posts = Math.max(2, Math.ceil(length / 4))
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {Array.from({ length: posts + 1 }, (_, i) => <Post key={i} x={-length / 2 + (i / posts) * length} y={0} z={0} h={2.2} r={0.11} />)}
      {[0.8, 1.55].map((y) => <Box key={y} position={[0, y, 0]} size={[length, 0.14, 0.14]} color={P.timber} />)}
    </group>
  )
}

function Animal({ position, color = '#8a6045', horned = false }: { position: [number, number, number]; color?: string; horned?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]} scale={[1.7, 0.85, 0.85]} castShadow><dodecahedronGeometry args={[1, 0]} /><Surf color={color} /></mesh>
      <mesh position={[1.55, 1.7, 0]} castShadow><dodecahedronGeometry args={[0.55, 0]} /><Surf color={color} /></mesh>
      {[-0.9, 0.9].flatMap((x) => [-0.42, 0.42].map((z) => <Post key={`${x}:${z}`} x={x} y={0} z={z} h={1.25} r={0.11} color={P.timberDark} />))}
      {horned && [-1, 1].map((s) => <mesh key={s} position={[1.65, 2.15, s * 0.45]} rotation={[0, 0, s * 0.7]}><coneGeometry args={[0.1, 0.85, 5]} /><Surf color={P.canvas} /></mesh>)}
    </group>
  )
}

function Depot({ night }: { night: boolean }) {
  return (
    <group>
      <Box position={[31, 0.35, 0]} size={[9, 0.7, 42]} color={P.timber} />
      {Array.from({ length: 18 }, (_, i) => <Box key={i} position={[31, 0.76, -19.5 + i * 2.3]} size={[8.8, 0.12, 0.12]} color={i % 2 ? P.timberDark : P.mustard} />)}
      <Box position={[17, 4.4, -3]} size={[24, 8.8, 14]} color={P.teal} />
      <mesh position={[17, 10, -3]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[14.8, 3.1, 4]} /><Surf color={P.oxblood} /></mesh>
      <Box position={[17, 2, 4.08]} size={[3, 4, 0.18]} color={P.timberDark} />
      {[-7.5, -2.5, 2.5, 7.5].map((x) => <Box key={x} position={[17 + x, 5, 4.12]} size={[1.5, 1.8, 0.16]} color={night ? P.lamp : '#40545a'} glow={night} />)}
      <Box position={[26, 6.2, 0]} size={[16, 0.42, 38]} color={P.sage} rotation={[0, 0, -0.06]} />
      {[-17, -11, -5, 1, 7, 13, 19].map((z) => <Post key={z} x={30} y={0} z={z} h={6.2} r={0.24} />)}
      {[-17, -11, -5, 1, 7, 13, 19].map((z) => <Box key={`brace${z}`} position={[28.5, 5.05, z]} size={[3.4, 0.22, 0.22]} color={P.timberDark} rotation={[0, 0, -0.65]} />)}
      <Box position={[17, 9.5, 4.24]} size={[13, 1.2, 0.22]} color={P.canvas} />
      <Box position={[17, 9.5, 4.38]} size={[9.5, 0.16, 0.16]} color={P.oxblood} />
      <Box position={[-3, 3.8, 10]} size={[18, 7.6, 12]} color={P.timber} />
      <Box position={[-3, 8.2, 10]} size={[19, 1.2, 13]} color={P.timberDark} rotation={[0.08, 0, 0]} />
      <Box position={[-3, 3.1, 16.08]} size={[7, 4.8, 0.18]} color={P.ink} />
      {[-8, -3, 2].map((x) => <Box key={x} position={[x, 0.7, -14]} size={[4.2, 1.4, 3.2]} color={P.mustard} />)}
    </group>
  )
}

function WaterCrane() {
  return (
    <group>
      <Post x={0} y={0} z={0} h={10} r={0.35} />
      <Box position={[2.5, 9.2, 0]} size={[5.2, 0.4, 0.5]} color={P.timberDark} />
      <Post x={5} y={5.8} z={0} h={3.5} r={0.18} color={P.timberDark} />
      <mesh position={[0, 2.8, 0]}><cylinderGeometry args={[2.4, 2.7, 5.6, 12]} /><Surf color={P.teal} /></mesh>
    </group>
  )
}

function SignalMast({ night }: { night: boolean }) {
  return (
    <group>
      <Post x={0} y={0} z={0} h={11} r={0.18} />
      <Box position={[1.8, 9.5, 0]} size={[3.8, 0.3, 0.3]} color={P.timberDark} />
      {[0.8, 2.6].map((x, i) => (
        <mesh key={x} position={[x, 9.5, 0.25]}><sphereGeometry args={[0.48, 8, 6]} /><Glow color={i ? '#b24c38' : P.mustard} on={night} intensity={1.6} /></mesh>
      ))}
    </group>
  )
}

function Train({ active, night }: { active: boolean; night: boolean }) {
  const train = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (train.current && active) train.current.position.z = ((clock.elapsedTime * 9 + 70) % 270) - 135
  })
  return (
    <group ref={train} position={[59, 0.9, active ? -100 : -56]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[2.1, 2.1, 8, 12]} /><Surf color={P.ink} /></mesh>
      <Box position={[0, 3, -5]} size={[4.8, 6, 5]} color={P.oxblood} />
      <Post x={0} y={4.5} z={2.2} h={4} color={P.ink} r={0.65} />
      {[-2.2, 2.2].flatMap((x) => [-4, 1.5].map((z) => <mesh key={`${x}:${z}`} position={[x, 0.8, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.15, 1.15, 0.45, 12]} /><Surf color={P.ink} /></mesh>))}
      <Box position={[0, 6, 1.5]} size={[1.8, 0.6, 1.8]} color={night ? P.lamp : P.mustard} glow={night} />
      {[-10, -19].map((z, i) => <group key={z}><Box position={[0, 2.6, z]} size={[5, 5.2, 8]} color={i ? P.mustard : P.teal} />{[-2.3, 2.3].flatMap((x) => [-2, 2].map((q) => <mesh key={`${x}:${q}`} position={[x, 0.7, z + q]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1, 1, 0.4, 12]} /><Surf color={P.ink} /></mesh>))}</group>)}
    </group>
  )
}

function Headframe() {
  return (
    <group>
      {[-1, 1].flatMap((side) => [-1, 1].map((depth) => (
        <Box key={`${side}:${depth}`} position={[side * 2.8, 11, depth * 2.8]} size={[0.62, 23, 0.62]} color={P.timberDark} rotation={[depth * -0.045, 0, side * -0.16]} />
      )))}
      {[4, 9, 14, 19].map((y) => <Box key={y} position={[0, y, 0]} size={[7.6 - y * 0.12, 0.38, 6.5 - y * 0.08]} color={P.timber} />)}
      {[-1, 1].flatMap((side) => [5.2, 11.2, 17.2].map((y) => (
        <Box key={`${side}:${y}`} position={[side * 1.4, y, 3.02]} size={[6.8, 0.32, 0.32]} color={P.copper} rotation={[0, 0, side * 0.98]} />
      )))}
      <Box position={[0, 22, 0]} size={[7.8, 1.2, 7]} color={P.timberDark} />
      <mesh position={[-1.9, 21.8, 3.7]}><torusGeometry args={[2.35, 0.34, 7, 18]} /><Surf color={P.copper} /></mesh>
      <mesh position={[2.6, 21.8, 3.7]}><torusGeometry args={[2.35, 0.34, 7, 18]} /><Surf color={P.copper} /></mesh>
      {[-1.9, 2.6].flatMap((x) => [0, Math.PI / 3, -Math.PI / 3].map((r) => (
        <Box key={`${x}:${r}`} position={[x, 21.8, 3.72]} size={[0.18, 4.6, 0.18]} color={P.copper} rotation={[0, 0, r]} />
      )))}
      <Box position={[0, 0.4, 0]} size={[9.5, 0.8, 7.5]} color={P.strata} />
      <Box position={[0, 1.3, 0]} size={[4.2, 2.6, 4.2]} color={P.ink} />
      <Post x={0.2} y={2.4} z={2.8} h={19} r={0.11} color={P.copper} />
    </group>
  )
}

function Landmark({ stage, night }: { stage: ReturnType<typeof landmarkStage>; night: boolean }) {
  return (
    <group position={[118, 3, 65]}>
      <mesh position={[0, -1.5, 0]} castShadow><cylinderGeometry args={[8, 10, 3, 12]} /><Surf color={P.redRock} /></mesh>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[8.1, 8.4, 0.24, 12]} /><Surf color={P.sand} /></mesh>
      {[0, 0.7, 1.3].map((y, i) => <mesh key={y} position={[-3.5, y + 0.3, 2]}><dodecahedronGeometry args={[1.2 - i * 0.2, 0]} /><Surf color={i % 2 ? P.strata : '#8b6a4a'} /></mesh>)}
      <Post x={-1} y={0} z={2.2} h={3} />
      {[-0.9, 0.9].map((x) => <Box key={x} position={[x, 1.5, -1]} size={[0.16, 3.5, 0.16]} color={P.timber} rotation={[0, 0, x > 0 ? -0.2 : 0.2]} />)}
      <Box position={[0, 3, -1]} size={[2.2, 0.22, 0.22]} color={P.oxblood} />
      {stage !== 'stake' && <Box position={[0, 3.5, -1]} size={[3.5, 0.18, 0.18]} color={P.timberDark} />}
      {(stage === 's2' || stage === 's3') && (
        <>
          {[-2.5, 2.5].flatMap((x) => [-2.5, 2.5].map((z) => <Post key={`${x}:${z}`} x={x} y={0} z={z} h={stage === 's3' ? 14 : 9} r={0.25} />))}
          <Box position={[0, stage === 's3' ? 13.5 : 8.5, 0]} size={[6.6, 0.5, 6.6]} color={P.timber} />
          <mesh position={[0, stage === 's3' ? 14.8 : 9.8, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[4.7, 2.2, 4]} /><Surf color={P.sage} /></mesh>
        </>
      )}
      {stage === 's3' && (
        <>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2
            return <Post key={i} x={Math.cos(a) * 6.2} y={0} z={Math.sin(a) * 6.2} h={4.2} r={0.22} />
          })}
          <Box position={[0, 14, 2.72]} size={[1.4, 1.2, 0.12]} color={night ? P.lamp : P.mustard} glow={night} />
          <Box position={[5, 1.8, 2]} size={[4.5, 3.6, 3.2]} color={P.teal} />
          <Post x={-5.5} y={0} z={0} h={12} />
          {night && <pointLight position={[0, 14, 3]} color={P.lamp} intensity={16} distance={40} />}
        </>
      )}
    </group>
  )
}

function BackdropSkyline({ night, fraction }: { night: boolean; fraction: number }) {
  const profile = skylineProfile(fraction)
  const segments = 28
  return (
    <group>
      {[0, 1].flatMap((row) =>
        Array.from({ length: segments }, (_, i) => {
          const x = -205 + i * (410 / (segments - 1))
          const z = row ? -166 - Math.cos((i / segments) * Math.PI) * 3 : -142 + Math.sin(i * 1.7) * 3
          const base = row ? profile.far : profile.near
          const h = base + Math.sin(i * 1.9 + row) * 4 + (i % 6 === 0 ? 5 : 0)
          const width = 18
          return (
            <group key={`${row}:${i}`} position={[x, h / 2, z]}>
              <Box position={[0, 0, 0]} size={[width, h, row ? 18 : 24]} color={night ? (row ? '#3a2f45' : '#6f3f38') : row ? P.farRock : P.redRock} />
              <Box position={[0, h / 2 - 1.1, 0]} size={[width + 0.5, 2.2, row ? 18.5 : 24.5]} color={night ? '#8f684e' : P.sand} />
              {!row && [0.24, 0.5, 0.72].map((k) => <Box key={k} position={[0, -h / 2 + h * k, 12.15]} size={[width + 0.15, 0.7, 0.35]} color={P.strata} />)}
            </group>
          )
        }),
      )}
      {[-1, 1].flatMap((side) =>
        Array.from({ length: 8 }, (_, i) => {
          const x = side * (174 + i * 5)
          const z = -120 + i * 22
          const h = Math.max(30, profile.near - i * 6.2)
          return (
            <mesh key={`${side}:${i}`} position={[x, h / 2, z]} rotation={[0, side * -0.16, 0]}>
              <boxGeometry args={[16, h, 28]} />
              <Surf color={night ? '#6f3f38' : P.redRock} transparent opacity={Math.max(0.18, 0.82 - i * 0.09)} />
            </mesh>
          )
        }),
      )}
      {profile.spire > 0 && (
        <group position={[-150, 0, -150]}>
          <mesh position={[0, profile.spire / 2, 0]} castShadow><cylinderGeometry args={[5, 11, profile.spire, 8]} /><Surf color={night ? '#6f3f38' : P.redRock} /></mesh>
          <Box position={[0, profile.spire, 0]} size={[15, 2.2, 12]} color={night ? '#8f684e' : P.sand} />
        </group>
      )}
    </group>
  )
}

function Arroyo() {
  const points = generateLayout(1).fixed.arroyo
  return (
    <group>
      {points.slice(1).map((p, i) => {
        const a = points[i]
        const dx = p[0] - a[0]
        const dz = p[1] - a[1]
        const len = Math.hypot(dx, dz)
        return <Box key={i} position={[(a[0] + p[0]) / 2, 0.08, (a[1] + p[1]) / 2]} size={[9, 0.16, len + 1]} color={P.paleGravel} rotation={[0, Math.atan2(dx, dz), 0]} />
      })}
      <mesh position={[-95, 0.18, 84]} scale={[11, 1, 8]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1, 32]} /><Surf color={P.water} /></mesh>
    </group>
  )
}

function Rails() {
  return (
    <group>
      {[56, 62].map((x) => <Box key={x} position={[x, 0.28, 0]} size={[0.38, 0.38, 270]} color="#55483f" />)}
      {Array.from({ length: 54 }, (_, i) => <Box key={i} position={[59, 0.12, -132 + i * 5]} size={[11, 0.24, 0.6]} color={P.timberDark} />)}
      {Array.from({ length: 9 }, (_, i) => <Post key={i} x={72 + i * 6.8} y={0} z={-112 + i * 28} h={8} />)}
    </group>
  )
}

function Wagon({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Box position={[0, 1.2, 0]} size={[4.2, 1.4, 2.4]} color={P.timber} />
      {[-1.5, 1.5].flatMap((x) => [-1.2, 1.2].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 0.7, z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.85, 0.14, 6, 12]} /><Surf color={P.timberDark} /></mesh>
      )))}
      {[-0.8, 0.8].map((x) => <Box key={x} position={[3.2, 0.9, x]} size={[2.7, 0.16, 0.16]} color={P.timberDark} rotation={[0, 0, -0.08]} />)}
    </group>
  )
}

function Trough({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Box position={[0, 0.55, 0]} size={[4.5, 1.1, 1.7]} color={P.timber} />
      <Box position={[0, 1.02, 0]} size={[3.9, 0.12, 1.2]} color={P.water} />
    </group>
  )
}

function Tumbleweed({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[0, Math.PI / 3, -Math.PI / 3].map((r) => (
        <mesh key={r} rotation={[r, r * 0.7, r]}><torusGeometry args={[1.05, 0.09, 4, 9]} /><Surf color="#8f6848" /></mesh>
      ))}
    </group>
  )
}

function CivicHall({ night }: { night: boolean }) {
  return (
    <group>
      <Box position={[0, 4, 0]} size={[10, 8, 8]} color={P.canvas} />
      <Box position={[0, 8.8, 0]} size={[11, 1.6, 8.8]} color={P.oxblood} />
      <Box position={[0, 11.2, 0]} size={[4.6, 3.6, 4.6]} color={P.teal} />
      <mesh position={[0, 13.8, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.5, 2.2, 4]} /><Surf color={P.timberDark} /></mesh>
      <mesh position={[0, 11.4, 2.36]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.9, 0.9, 0.15, 16]} /><Surf color={night ? P.lamp : P.mustard} emissive={night ? P.lamp : '#000'} emissiveIntensity={night ? 1.2 : 0} /></mesh>
      {[-3.2, 3.2].map((x) => <Post key={x} x={x} y={0} z={4.2} h={4.4} r={0.2} />)}
      <Box position={[0, 4.3, 4.1]} size={[9, 0.28, 2.4]} color={P.timber} />
    </group>
  )
}

function Town({ count, night }: { count: number; night: boolean }) {
  const slots: Array<[number, number, number, string, 'store' | 'saloon' | 'sheriff' | 'hotel']> = [
    [-24, 0, -13, P.oxblood, 'saloon'], [-13, 0, -13, P.teal, 'store'], [-2, 0, -13, P.sage, 'hotel'], [10, 0, -13, P.timber, 'store'], [22, 0, -13, P.teal, 'store'], [34, 0, -13, P.sage, 'store'],
    [-24, Math.PI, 13, P.sage, 'sheriff'], [-13, Math.PI, 13, P.timber, 'store'], [-2, Math.PI, 13, P.teal, 'store'], [10, Math.PI, 13, P.sage, 'store'], [22, Math.PI, 13, P.timber, 'store'], [34, Math.PI, 13, P.teal, 'store'],
  ]
  return (
    <group>
      <group position={[-39, 0, 0]}><WaterTower night={night} /></group>
      <Box position={[1, 0.1, 0]} size={[82, 0.2, 10]} color="#cfae78" />
      <Box position={[3, 0.25, -9.3]} size={[78, 0.5, 5.2]} color={P.timber} />
      <Box position={[3, 0.25, 9.3]} size={[78, 0.5, 5.2]} color={P.timber} />
      {slots.slice(0, count).map(([x, yaw, z, color, variant], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, yaw, 0]}>
          <FalseFront position={[0, 0, 0]} color={color} variant={variant} night={night} />
        </group>
      ))}
      {count >= 6 && <><Wagon position={[5, 0, 2]} yaw={0.2} /><Trough position={[-18, 0, 4]} /></>}
      {count >= 10 && <><Wagon position={[27, 0, -2]} yaw={-0.18} /><Trough position={[20, 0, 4]} /></>}
      {count >= 12 && <>
        <group position={[-37, 0, -21]} scale={0.88}><CivicHall night={night} /></group>
        {[-28, -17, -6, 7, 20, 32].map((x, i) => <Box key={`shed${x}`} position={[x, 1.7, i % 2 ? 23 : -23]} size={[5.4, 3.4, 4.6]} color={i % 3 ? P.timber : P.sage} />)}
        {[-30, -14, 2, 18, 34].map((x) => <group key={`hitch${x}`} position={[x, 0, 5.8]}><Post x={-1.3} y={0} z={0} h={1.3} r={0.1} /><Post x={1.3} y={0} z={0} h={1.3} r={0.1} /><Box position={[0, 1.05, 0]} size={[2.8, 0.14, 0.14]} color={P.timberDark} /></group>)}
        {[-34, -10, 14, 38].map((x) => <group key={`lamp${x}`} position={[x, 0, -6]}><Post x={0} y={0} z={0} h={3.7} r={0.09} /><Box position={[0, 3.8, 0]} size={[0.7, 0.7, 0.7]} color={night ? P.lamp : P.mustard} glow={night} /></group>)}
        {[-27, 30].map((x) => <Animal key={`horse${x}`} position={[x, 0, 4]} color={x < 0 ? '#6a4632' : '#b78a64'} />)}
        <Tumbleweed position={[39, 1.2, 1]} scale={1.1} />
        <Tumbleweed position={[-7, 0.9, -2]} scale={0.8} />
        {[-31, -8, 15, 34].map((x) => <Post key={x} x={x} y={0} z={7} h={1.6} r={0.1} />)}
      </>}
    </group>
  )
}

function RailwayDistrict({ count, night }: { count: number; night: boolean }) {
  return (
    <group>
      <Depot night={night} />
      <group position={[31, 0, -14]}><WaterCrane /></group>
      <group position={[30, 0, 15]}><SignalMast night={night} /></group>
      {count >= 1 && Array.from({ length: 8 }, (_, i) => <Box key={i} position={[17 + (i % 4) * 2.2, 0.65 + Math.floor(i / 4) * 1.2, 11 + (i % 2) * 2]} size={[1.9, 1.3, 1.9]} color={i % 3 ? P.timber : P.mustard} />)}
      {count >= 2 && <Wagon position={[2, 0, -12]} yaw={Math.PI / 2} />}
      {count >= 3 && <>
        <Box position={[-14, 2.8, -10]} size={[12, 5.6, 9]} color={P.sage} />
        <Box position={[-14, 6.2, -10]} size={[13, 1, 10]} color={P.timberDark} />
      </>}
      {count >= 5 && <Box position={[28, 1.8, 25]} size={[5.2, 3.6, 9]} color={P.mustard} />}
    </group>
  )
}

function Ranch({ count }: { count: number }) {
  return (
    <group>
      <group position={[30, 0, -18]}><WindPump /></group>
      <Corral position={[-23, 0, 9]} radius={9} />
      {count >= 2 && <Corral position={[0, 0, 13]} radius={8} />}
      {count >= 3 && <Corral position={[23, 0, 8]} radius={7} />}
      {count >= 1 && <group position={[-25, 0, -19]} scale={1.15}><FalseFront position={[0, 0, 0]} color={P.sage} variant="store" /></group>}
      {count >= 2 && <>
        <Box position={[3, 4.8, -21]} size={[16, 9.6, 12]} color={P.timber} />
        <mesh position={[3, 10.8, -21]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[10.5, 3.6, 4]} /><Surf color={P.oxblood} /></mesh>
        <Box position={[3, 4.2, -14.92]} size={[6.4, 7.2, 0.22]} color={P.ink} />
        <Box position={[3, 4.2, -14.78]} size={[0.25, 7.2, 0.25]} color={P.canvas} />
        <Box position={[3, 4.2, -14.76]} size={[6.4, 0.25, 0.25]} color={P.canvas} rotation={[0, 0, 0.75]} />
        <Box position={[3, 4.2, -14.74]} size={[6.4, 0.25, 0.25]} color={P.canvas} rotation={[0, 0, -0.75]} />
      </>}
      {count >= 2 && <><FenceRun position={[-3, 0, -2]} length={68} /><FenceRun position={[-3, 0, 28]} length={68} /></>}
      {count >= 3 && <><FenceRun position={[-36, 0, 13]} length={30} yaw={Math.PI / 2} /><FenceRun position={[30, 0, 13]} length={30} yaw={Math.PI / 2} /></>}
      {count >= 2 && [-29, -23, -16, -8, 0].map((x, i) => <Animal key={x} position={[x, 0, 3 + (i % 2) * 10]} color={i % 2 ? '#d8c3a5' : '#8a6045'} horned />)}
      {count >= 3 && [8, 15, 22, 28].map((x, i) => <Animal key={x} position={[x, 0, 3 + (i % 3) * 6]} color={i % 2 ? '#9a765c' : '#6d4c39'} />)}
      {count >= 4 && <>
        <Wagon position={[29, 0, -4]} yaw={-0.7} />
        <Trough position={[-8, 0, 1]} />
        {[-18, -14, 14, 18].map((x) => <HayBale key={x} position={[x, 1.2, -8]} />)}
        <FenceRun position={[-21, 0, 20]} length={20} yaw={0.25} />
        <FenceRun position={[15, 0, 24]} length={24} yaw={-0.18} />
        <group position={[-31, 0, -9]}><Box position={[0, 1.6, 0]} size={[7, 3.2, 5]} color={P.sage} /><Box position={[0, 3.5, 0]} size={[7.8, 0.7, 5.8]} color={P.timberDark} /></group>
      </>}
    </group>
  )
}

function Mine({ count, night }: { count: number; night: boolean }) {
  return (
    <group>
      <Box position={[-31, 7, -10]} size={[18, 14, 20]} color={P.redRock} />
      <mesh position={[-21.8, 3.6, -2]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[4.2, 1.8, 6, 14, Math.PI]} /><Surf color={P.ink} /></mesh>
      <group position={[-8, 0, -5]}><Headframe /></group>
      <Box position={[-8, 0.22, 13]} size={[2.8, 0.25, 32]} color={P.timberDark} />
      <Box position={[-3.5, 0.22, 13]} size={[0.25, 0.25, 32]} color={P.copper} />
      <Box position={[-12.5, 0.22, 13]} size={[0.25, 0.25, 32]} color={P.copper} />
      {Array.from({ length: 9 }, (_, i) => <Box key={i} position={[-8, 0.17, -1 + i * 4]} size={[10, 0.18, 0.5]} color={P.timberDark} />)}
      {count >= 2 && <>
        <mesh position={[13, 4.5, -8]}><cylinderGeometry args={[3, 3.3, 9, 12]} /><Surf color={P.copper} /></mesh>
        <Post x={13} y={8} z={-8} h={7} r={0.6} color={P.ink} />
        <Box position={[27, 3.2, -6]} size={[13, 6.4, 10]} color={P.timber} />
      </>}
      {count >= 4 && [-8, -3.5, 1].map((x, i) => <Box key={x} position={[x, 1.2, 11 + i * 6]} size={[4.2, 2.4, 3.2]} color={P.copper} />)}
      {count >= 4 && [14, 22, 30].map((x, i) => <mesh key={x} position={[x, 1.4 + i * 0.3, 14 + i * 3]}><coneGeometry args={[4.8, 2.8 + i * 0.6, 8]} /><Surf color={i % 2 ? P.strata : '#9e724b'} /></mesh>)}
      {count >= 6 && [-30, -20, -10, 0].map((x) => <group key={x} position={[x, 0, 27]}><mesh position={[0, 1.8, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.8, 3.6, 4]} /><Surf color={P.canvas} /></mesh>{night && <pointLight position={[0, 2, 2]} intensity={2} color={P.lamp} />}</group>)}
      {count >= 8 && <Box position={[30, 2.8, 16]} size={[10, 5.6, 8]} color={P.sage} />}
    </group>
  )
}

function Foundation({ position, size, buried = false }: { position: [number, number, number]; size: [number, number]; buried?: boolean }) {
  const [w, d] = size
  const y = buried ? 0.35 : 0.7
  return (
    <group position={position}>
      <Box position={[0, 0.06, 0]} size={[w - 1, 0.12, d - 1]} color="#9a704d" />
      <Box position={[0, y, -d / 2]} size={[w, y * 2, 0.8]} color={P.strata} />
      <Box position={[0, y, d / 2]} size={[w, y * 2, 0.8]} color={P.strata} />
      <Box position={[-w / 2, y, 0]} size={[0.8, y * 2, d]} color={P.redRock} />
      <Box position={[w / 2, y, 0]} size={[0.8, y * 2, d]} color={P.redRock} />
      {w > 13 && <Box position={[0, y, 0]} size={[0.7, y * 2, d]} color={P.strata} />}
    </group>
  )
}

function ExcavationTrench({ position, size }: { position: [number, number, number]; size: [number, number] }) {
  const [w, d] = size
  return (
    <group position={position}>
      <Box position={[0, 0.08, 0]} size={[w, 0.16, d]} color="#6f4f39" />
      <Box position={[0, 0.23, 0]} size={[w - 1.4, 0.12, d - 1.4]} color="#b1845b" />
      {[-w / 2, w / 2].map((x) => <Box key={x} position={[x, 0.7, 0]} size={[0.55, 1.4, d]} color={P.strata} />)}
      {[-d / 2, d / 2].map((z) => <Box key={z} position={[0, 0.7, z]} size={[w, 1.4, 0.55]} color={P.redRock} />)}
      {[-w / 2, 0, w / 2].map((x) => <Post key={x} x={x} y={0} z={-d / 2 - 0.5} h={2.3} r={0.07} />)}
      {[-d / 2, 0, d / 2].map((z) => <Box key={z} position={[0, 2.05, z]} size={[w + 1.2, 0.05, 0.05]} color={P.canvas} />)}
      {[-w / 3, w / 3].map((x) => <Box key={x} position={[x, 2.05, 0]} size={[0.05, 0.05, d + 1.2]} color={P.canvas} />)}
      <Box position={[-w * 0.22, 0.42, 0]} size={[w * 0.45, 0.16, 0.8]} color={P.canvas} />
      <mesh position={[w * 0.2, 0.48, d * 0.12]}><torusGeometry args={[0.55, 0.16, 5, 8, Math.PI * 1.45]} /><Surf color={P.copper} /></mesh>
    </group>
  )
}

function Dig({ count }: { count: number }) {
  return (
    <group>
      <Foundation position={[-15, 0, -7]} size={[18, 11]} />
      {[[-23, 9, 13, 5], [-4, 10, 15, 6], [17, 8, 12, 5]].map(([x, z, w, d], i) => <ExcavationTrench key={i} position={[x, 0, z]} size={[w, d]} />)}
      {count >= 2 && [-29, 0].map((x, i) => <group key={x} position={[x, 0, -22 + i * 2]}><mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[5, 4.4, 4]} /><Surf color={P.canvas} /></mesh><Post x={0} y={0} z={0} h={5.5} r={0.1} /></group>)}
      {count >= 4 && <Foundation position={[14, 0, -7]} size={[18, 13]} />}
      {count >= 4 && <>
        <Box position={[8, 1.2, 22]} size={[10, 2.4, 4]} color={P.timber} />
        {[-22, -14, 20, 28].map((x) => <Box key={x} position={[x, 0.65, 22]} size={[3, 1.3, 2.2]} color={P.timber} />)}
      </>}
      {count >= 6 && <group position={[22, 0, 3]}>{[-5, 5].flatMap((x) => [-3, 3].map((z) => <Post key={`${x}:${z}`} x={x} y={0} z={z} h={7} />))}<Box position={[0, 6.7, 0]} size={[11, 0.35, 7]} color={P.timber} />{[2, 4].map((y) => <Box key={y} position={[0, y, 3]} size={[10, 0.16, 0.16]} color={P.timberDark} />)}</group>}
      {count >= 8 && <Foundation position={[0, 0, 1]} size={[24, 16]} buried />}
      {count >= 8 && <>
        {[15, 21, 27].map((x, i) => <mesh key={x} position={[x, 1 + i * 0.25, 15]}><coneGeometry args={[3.2, 2 + i * 0.5, 8]} /><Surf color="#a87952" /></mesh>)}
        <group position={[-9, 0, 20]}><Box position={[0, 1.2, 0]} size={[4.8, 0.28, 3.4]} color={P.timber} />{[-1.7, 1.7].flatMap((x) => [-1.1, 1.1].map((z) => <Post key={`${x}:${z}`} x={x} y={0} z={z} h={1.2} r={0.1} />))}</group>
        {[-18, -12, -6, 0, 6].map((x, i) => <mesh key={x} position={[x, 0.55, 18 + (i % 2) * 2]}><cylinderGeometry args={[0.45 + i * 0.04, 0.32, 1.1, 8]} /><Surf color={i % 2 ? P.oxblood : P.copper} /></mesh>)}
        <Wagon position={[27, 0, -16]} yaw={-0.5} />
      </>}
    </group>
  )
}

function Reserve({ seed, count, wildlife }: { seed: number; count: number; wildlife: boolean }) {
  const items = useMemo(() => {
    const rng = seeded(seed * 73)
    return Array.from({ length: 72 }, (_, i) => ({ x: -34 + rng() * 68, z: -112 + rng() * 224, s: 0.55 + rng() * 1.05, kind: i % 9 }))
  }, [seed])
  return (
    <group>
      {[-22, 4, 25, -5].map((x, i) => <Cactus key={x} position={[x, 0, -78 + i * 52]} scale={[1.25, 0.92, 1.1, 0.78][i]} />)}
      {items.map((c, i) => {
        if (c.kind === 0 && count >= 2) return <Cactus key={i} position={[c.x, 0, c.z]} scale={c.s} />
        if ((c.kind === 1 || c.kind === 2) && count >= 1) return <PricklyPear key={i} position={[c.x, 0, c.z]} scale={c.s} />
        if ((c.kind === 3 || c.kind === 4) && count >= 2) return <Scrub key={i} position={[c.x, 0, c.z]} scale={c.s} />
        if ((c.kind === 5 || c.kind === 6) && count >= 3) return <RockOutcrop key={i} position={[c.x, 0, c.z]} scale={c.s * 0.8} />
        if ((c.kind === 7 || c.kind === 8) && count >= 4) return <Tumbleweed key={i} position={[c.x, c.s, c.z]} scale={c.s * 0.7} />
        return null
      })}
      <group position={[17, 0, 20]}>
        <mesh position={[0, 5, 0]}><cylinderGeometry args={[5, 5.6, 8, 12]} /><Surf color={P.timber} /></mesh>
        {[-3.5, 3.5].flatMap((x) => [-3.5, 3.5].map((z) => <Post key={`${x}:${z}`} x={x} y={0} z={z} h={5} r={0.2} />))}
      </group>
      {[-92, -58, -24, 10, 44, 78].map((z) => <group key={z} position={[-28, 0, z]}><Post x={0} y={0} z={0} h={9} /><Box position={[0, 8.3, 0]} size={[5.2, 0.28, 0.28]} color={P.timberDark} /></group>)}
      {[-1.3, 0, 1.3].map((x) => <Box key={x} position={[-28 + x, 8.5, -7]} size={[0.08, 0.08, 170]} color={P.timberDark} />)}
      {wildlife && count >= 1 && [[-4, -60], [13, -22], [-10, 37], [18, 83]].map(([x, z], i) => <Animal key={i} position={[x, 0, z]} color={i % 2 ? '#d19b5f' : '#a87048'} />)}
      {wildlife && count >= 1 && <Animal position={[-2, 0, 9]} color="#c18a54" />}
      {count >= 3 && [[-14, 56], [11, 78], [24, -48], [-6, -92]].map(([x, z], i) => <mesh key={i} position={[x, 0.12, z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.3, 3.2, 12]} /><Surf color="#79583e" /></mesh>)}
      {count >= 4 && <>
        <group position={[23, 0, -84]}>
          <mesh position={[-4, 6, 0]} scale={[2.8, 6, 2.2]}><dodecahedronGeometry args={[1, 0]} /><Surf color={P.redRock} /></mesh>
          <mesh position={[4, 7.5, 0]} scale={[2.5, 7.5, 2]}><dodecahedronGeometry args={[1, 0]} /><Surf color={P.strata} /></mesh>
          <Box position={[0, 10.8, 0]} size={[7.5, 2.1, 3.2]} color={P.redRock} />
        </group>
        <group position={[-18, 0, 68]}>
          {[0, 4, 8].map((y, i) => <mesh key={y} position={[0, y * 0.8 + 1.5, 0]} scale={[5 - i * 0.7, 1.5, 4 - i * 0.5]}><dodecahedronGeometry args={[1, 0]} /><Surf color={i % 2 ? P.strata : P.redRock} /></mesh>)}
        </group>
        {[-72, -12, 48, 96].map((z, i) => <group key={z} position={[-19 + (i % 2) * 31, 0, z]}><Box position={[0, 0.09, 0]} size={[13, 0.18, 4.2]} color={P.paleGravel} /><PricklyPear position={[-4, 0, 1]} scale={0.8} /><Scrub position={[4, 0, -1]} scale={0.9} /></group>)}
      </>}
    </group>
  )
}

function FrontierWalker({
  index,
  center,
  night,
}: {
  index: number
  center: [number, number]
  night: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const phase = index * 1.7
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime * 0.35 + phase
    const x = center[0] + Math.sin(t) * 8
    const z = center[1] + Math.sin(t * 2 + 0.4) * 6
    group.current.position.set(x, 0, z)
    group.current.rotation.y = Math.atan2(Math.cos(t) * 8, Math.cos(t * 2 + 0.4) * 12)
  })
  return (
    <group ref={group} scale={L.creatureScale}>
      <mesh position={[0, 0.65, 0]} castShadow><dodecahedronGeometry args={[0.52, 0]} /><Surf color={index % 2 ? P.canvas : P.teal} /></mesh>
      <mesh position={[0, 1.32, 0]} castShadow><icosahedronGeometry args={[0.38, 1]} /><Surf color={P.canvas} /></mesh>
      <mesh position={[0, 1.7, 0]} castShadow><cylinderGeometry args={[0.52, 0.42, 0.25, 10]} /><Surf color={index % 3 ? P.oxblood : P.mustard} /></mesh>
      <mesh position={[0, 1.93, 0]} castShadow><cylinderGeometry args={[0.31, 0.38, 0.5, 8]} /><Surf color={index % 3 ? P.oxblood : P.mustard} /></mesh>
      {night && <pointLight position={[0, 1.4, 0.7]} intensity={0.4} color={P.lamp} />}
    </group>
  )
}

function Creatures({ generated, residents, night }: { generated: ReturnType<typeof generateLayout>; residents: number; night: boolean }) {
  return (
    <group>
      {Array.from({ length: residents }, (_, i) => {
        const d = generated.districts[i % generated.districts.length]
        return <FrontierWalker key={i} index={i} center={d.center} night={night} />
      })}
    </group>
  )
}

function Dust({ dense = false }: { dense?: boolean }) {
  const particles = useMemo(() => {
    const rng = seeded(144)
    return Array.from({ length: dense ? 180 : 80 }, () => [rng() * 330 - 165, rng() * 16 + 1, rng() * 260 - 130] as [number, number, number])
  }, [dense])
  return (
    <group>
      {particles.map((p, i) => <mesh key={i} position={p} scale={0.2 + (i % 3) * 0.12}><dodecahedronGeometry args={[1, 0]} /><meshBasicMaterial color={P.paleGravel} transparent opacity={0.35} /></mesh>)}
    </group>
  )
}

function CameraRig({ state, generated }: { state: LabState; generated: ReturnType<typeof generateLayout> }) {
  const camera = useThree((s) => s.camera)
  const district = generated.districts.find((d) => d.id === state.focusDistrict)
  useEffect(() => {
    const yawDeg = Math.max(-35, Math.min(35, state.camera.azimuthDeg))
    const yaw = rad(yawDeg)
    const pitchDeg = Math.max(34, Math.min(40, state.camera.pitchDeg))
    const pitch = rad(pitchDeg)
    const kingdom = dioramaCameraPose(yawDeg, state.camera.dolly, pitchDeg)
    let target = kingdom.target
    let position = kingdom.position
    if (state.station === 'district' && district) {
      const focusOffsetX = district.id === 'railway-station' ? 12 : district.id === 'mine-works' ? -5 : 0
      target = [district.center[0] + focusOffsetX, 3, district.center[1]]
      const groundDistance = (
        district.id === 'outskirts-reserve'
          ? 140
          : Math.max(100, Math.max(...district.footprint) * 1.65)
      ) * state.camera.dolly
      const x = target[0] + Math.sin(yaw) * groundDistance * 0.55
      const z = target[2] + groundDistance
      position = [x, target[1] + Math.tan(pitch) * Math.hypot(x - target[0], z - target[2]), z]
    } else if (state.station === 'landmark') {
      target = [118, 9, 65]
      const d = 68 * state.camera.dolly
      position = [target[0] + Math.sin(yaw) * d * 0.5, target[1] + Math.tan(pitch) * d, target[2] + d]
    } else if (state.station === 'resident' && generated.districts[0]) {
      target = [generated.districts[0].center[0] + 7, 3, generated.districts[0].center[1]]
      const d = 18 * state.camera.dolly
      position = [target[0] + Math.sin(yaw) * 5, target[1] + Math.tan(pitch) * d, target[2] + d]
    } else if (state.station === 'arrival') {
      target = [-22, 4, -5]
      const d = 100 * state.camera.dolly
      position = [target[0] + Math.sin(yaw) * 34, target[1] + Math.tan(pitch) * d, target[2] + d]
    } else if (state.station === 'horizon') {
      target = kingdom.target
      position = kingdom.position
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = state.camera.fov
      camera.near = 0.5
      camera.far = 900
      camera.updateProjectionMatrix()
    }
    camera.position.set(...position)
    camera.lookAt(...target)
    camera.updateMatrixWorld()
  }, [camera, district, generated, state.camera, state.focusDistrict, state.station])
  return null
}

export function FrontierScene({ state, onPickDistrict }: { state: LabState; onPickDistrict: (id: string) => void }) {
  const generated = useMemo(() => generateLayout(state.seed), [state.seed])
  const fraction = courseProgress(state.progress)
  const ruin = state.catastrophe.phase === 'ruin' || state.catastrophe.phase === 'impact'
  const sky = state.night ? P.skyNight : state.catastrophe.phase === 'dust' ? '#b69062' : P.sky
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, state.catastrophe.phase === 'dust' ? 70 : 190, state.catastrophe.phase === 'dust' ? 210 : 420]} />
      <hemisphereLight args={[state.night ? '#59618a' : '#fff0ce', state.night ? '#281d28' : '#9f5c3d', state.night ? 0.7 : 0.9]} />
      <directionalLight position={state.night ? [-80, 75, 40] : [95, 88, 125]} intensity={state.night ? 1.2 : 2.5} color={state.night ? '#91a7d8' : '#ffe4b5'} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-190} shadow-camera-right={190} shadow-camera-top={170} shadow-camera-bottom={-170} />

      <mesh position={[0, -0.35, 150]} receiveShadow><boxGeometry args={[520, 0.7, 800]} /><Surf color={state.night ? '#7f5f4d' : P.sand} /></mesh>
      <BackdropSkyline night={state.night} fraction={fraction} />
      <Arroyo />
      <Rails />
      <Train active={state.train} night={state.night} />

      {generated.districts.map((district) => {
        const pop = populationFor(district, state.progress[district.id] ?? 0)
        const broken = ruin && state.catastrophe.districtId === district.id
        return (
          <group
            key={district.id}
            position={[district.center[0], broken ? -0.6 : 0, district.center[1]]}
            rotation={[broken ? 0.05 : 0, district.yaw, broken ? 0.06 : 0]}
            onClick={(event) => { event.stopPropagation(); onPickDistrict(district.id) }}
          >
            {district.id === 'main-town' && <Town count={pop.buildings} night={state.night && !broken} />}
            {district.id === 'railway-station' && <RailwayDistrict count={pop.buildings} night={state.night && !broken} />}
            {district.id === 'outskirts-reserve' && <Reserve seed={state.seed} count={pop.buildings} wildlife={state.wildlife} />}
            {district.id === 'broad-ranch' && <Ranch count={pop.buildings} />}
            {district.id === 'mine-works' && <Mine count={pop.buildings} night={state.night && !broken} />}
            {district.id === 'archaeology-dig' && <Dig count={pop.buildings} />}
          </group>
        )
      })}

      <Landmark stage={landmarkStage(fraction)} night={state.night} />
      <Creatures generated={generated} residents={state.residents} night={state.night} />
      {state.dust && <Dust dense={state.catastrophe.phase === 'dust'} />}
      {state.night && <DreiStars radius={280} depth={80} count={2500} factor={4} saturation={0.25} fade speed={0.2} />}
      {ruin && state.catastrophe.districtId && <pointLight position={[0, 12, 0]} color="#c34e32" intensity={6} distance={70} />}
      <CameraRig state={state} generated={generated} />
      {state.pixel && <PixelComposer />}
    </>
  )
}
