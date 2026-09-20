import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Glow, Surf } from '../render/materials'
import type { PropCount } from '../state'
import { BOUQUET_PLACEMENTS, outwardRotation } from './bouquetGeometry'

const P = {
  snow: '#eef4f7',
  white: '#ffffff',
  cliff: '#8fbfdc',
  rock: '#c9bfd0',
  pine: '#5f8f78',
  cream: '#f4e9d2',
  red: '#c8524a',
  teal: '#5f9ea8',
  timber: '#4a3c36',
  ink: '#3a2f45',
  light: '#ffe9a8',
} as const

const placement = (id: (typeof BOUQUET_PLACEMENTS)[number]['id']) => BOUQUET_PLACEMENTS.find((entry) => entry.id === id)!

function BouquetMountain() {
  const place = placement('mountain')
  const snowHeight = place.height * 0.48
  const sidePeakHeight = place.height * 0.72
  const rightPeakHeight = place.height * 0.62
  const sideCapHeight = sidePeakHeight * 0.42
  const rightCapHeight = rightPeakHeight * 0.42
  return (
    <group position={place.position} rotation={outwardRotation(place)}>
      <mesh position={[0, place.height / 2, 0]} scale={[1, 1, 0.82]} castShadow>
        <coneGeometry args={[8, place.height, 7]} />
        <Surf color={P.rock} />
      </mesh>
      <mesh position={[-0.9, place.height - snowHeight / 2, -1.2]} scale={[1, 1, 0.84]} castShadow>
        <coneGeometry args={[5.25, snowHeight, 7]} />
        <Surf color={P.snow} />
      </mesh>
      <mesh position={[-6.6, sidePeakHeight / 2, -1.3]} rotation={[0, 0.18, -0.18]} scale={[0.78, 1, 0.76]} castShadow>
        <coneGeometry args={[5.4, sidePeakHeight, 6]} />
        <Surf color={P.cliff} />
      </mesh>
      <mesh position={[-6.85, sidePeakHeight - sideCapHeight / 2, -1.55]} rotation={[0, 0.18, -0.18]} scale={[0.72, 1, 0.72]} castShadow>
        <coneGeometry args={[3.45, sideCapHeight, 6]} />
        <Surf color={P.white} />
      </mesh>
      <mesh position={[6.6, rightPeakHeight / 2, -2.4]} rotation={[0, -0.16, 0.14]} scale={[0.84, 1, 0.8]} castShadow>
        <coneGeometry args={[5.1, rightPeakHeight, 6]} />
        <Surf color={P.rock} />
      </mesh>
      <mesh position={[6.85, rightPeakHeight - rightCapHeight / 2, -2.7]} rotation={[0, -0.16, 0.14]} scale={[0.77, 1, 0.76]} castShadow>
        <coneGeometry args={[3.2, rightCapHeight, 6]} />
        <Surf color={P.snow} />
      </mesh>
      <mesh position={[4.2, 4.2, 4.7]} scale={[2.5, 3.7, 1.1]} rotation={[0.1, -0.55, -0.16]} castShadow>
        <dodecahedronGeometry args={[1.45, 0]} />
        <Surf color={P.rock} />
      </mesh>
    </group>
  )
}

function BouquetLighthouse({ night }: { night: boolean }) {
  const place = placement('lighthouse')
  const scale = place.height / 15
  const sweep = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (sweep.current) sweep.current.rotation.y = clock.elapsedTime * 0.9
  })

  return (
    <group position={place.position} rotation={outwardRotation(place)}>
      <group scale={scale}>
      <mesh position={[0, 0.7, 0]} scale={[3.1, 0.95, 2.7]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={P.cliff} />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow>
        <cylinderGeometry args={[1.35, 2.05, 11, 10]} />
        <Surf color={P.cream} />
      </mesh>
      {[2.1, 5, 7.9].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[1.98 - y * 0.055, 2.08 - y * 0.055, 0.8, 10]} />
          <Surf color={P.cliff} />
        </mesh>
      ))}
      <mesh position={[0, 10.75, 0]} castShadow>
        <cylinderGeometry args={[2.05, 1.85, 0.36, 10]} />
        <Surf color={P.ink} />
      </mesh>
      <mesh position={[0, 11.85, 0]} castShadow>
        <cylinderGeometry args={[1.42, 1.42, 1.5, 8]} />
        <Glow color={P.light} on={night} />
      </mesh>
      <mesh position={[0, 14, 0]} castShadow>
        <coneGeometry args={[2.75, 2, 8]} />
        <Surf color={P.red} />
      </mesh>
      <group ref={sweep} position={[0, 11.85, 0]}>
        {night && (
          <mesh position={[0, 0, 7]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[1.9, 14, 8, 1, true]} />
            <meshBasicMaterial color={P.light} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
      </group>
    </group>
  )
}

function Pine({ position, height, lean = 0 }: { position: [number, number, number]; height: number; lean?: number }) {
  return (
    <group position={position} rotation={[0, 0, lean]}>
      <mesh position={[0, height * 0.16, 0]} castShadow>
        <cylinderGeometry args={[height * 0.045, height * 0.06, height * 0.32, 6]} />
        <Surf color={P.timber} />
      </mesh>
      {[0.36, 0.57, 0.77].map((fraction, index) => (
        <group key={fraction}>
          <mesh position={[0, height * fraction, 0]} castShadow>
            <coneGeometry args={[height * (0.22 - index * 0.028), height * 0.4, 7]} />
            <Surf color={P.pine} />
          </mesh>
          <mesh position={[0, height * fraction + height * 0.12, 0]} scale={[1, 0.3, 1]} castShadow>
            <coneGeometry args={[height * (0.205 - index * 0.027), height * 0.28, 7]} />
            <Surf color={P.snow} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function BouquetPines() {
  const place = placement('pines')
  const scale = place.height / 14
  return (
    <group position={place.position} rotation={outwardRotation(place)}>
      <group scale={scale}>
      <Pine position={[0, 0, 0]} height={14} lean={-0.08} />
      <Pine position={[-4.1, 0, 0.7]} height={11.6} lean={0.12} />
      <Pine position={[4, 0, 1.5]} height={10.2} lean={-0.16} />
      <Pine position={[2.2, 0, -2.8]} height={8.8} lean={-0.04} />
      </group>
    </group>
  )
}

function House({
  position,
  height,
  color,
  night,
  lean,
}: {
  position: [number, number, number]
  height: number
  color: string
  night: boolean
  lean: number
}) {
  const wallHeight = height * 0.55
  const roofHeight = height * 0.45
  const width = height * 0.5
  const depth = height * 0.42
  const roofAngle = 0.58
  return (
    <group position={position} rotation={[0, lean * 1.7, lean]}>
      <mesh position={[0, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[width, wallHeight, depth]} />
        <Surf color={color} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh
            position={[side * width * 0.22, wallHeight + roofHeight * 0.42, 0]}
            rotation={[0, 0, -side * roofAngle]}
            castShadow
          >
            <boxGeometry args={[width * 0.74, height * 0.1, depth * 1.16]} />
            <Surf color={P.timber} />
          </mesh>
          <mesh
            position={[side * width * 0.22, wallHeight + roofHeight * 0.49, 0]}
            rotation={[0, 0, -side * roofAngle]}
            castShadow
          >
            <boxGeometry args={[width * 0.78, height * 0.075, depth * 1.2]} />
            <Surf color={P.snow} />
          </mesh>
        </group>
      ))}
      {[-0.2, 0.2].map((fraction) => (
        <mesh key={fraction} position={[width * fraction, wallHeight * 0.58, depth / 2 + 0.05]}>
          <boxGeometry args={[width * 0.18, height * 0.16, 0.1]} />
          <Glow color={P.light} on={night} intensity={1.5} />
        </mesh>
      ))}
      <mesh position={[-width * 0.25, wallHeight * 0.25, depth / 2 + 0.06]}>
        <boxGeometry args={[height * 0.11, height * 0.28, 0.09]} />
        <Surf color={P.ink} />
      </mesh>
      <mesh position={[0, wallHeight + roofHeight * 0.28, depth / 2 + 0.08]}>
        <dodecahedronGeometry args={[height * 0.08, 0]} />
        <Glow color={P.light} on={night} intensity={1.2} />
      </mesh>
      <mesh position={[width * 0.27, wallHeight + roofHeight * 0.72, -depth * 0.1]} castShadow>
        <boxGeometry args={[width * 0.13, roofHeight * 0.58, width * 0.13]} />
        <Surf color={P.timber} />
      </mesh>
      <mesh position={[width * 0.27, wallHeight + roofHeight, -depth * 0.1]} castShadow>
        <boxGeometry args={[width * 0.16, height * 0.1, width * 0.16]} />
        <Surf color={P.snow} />
      </mesh>
    </group>
  )
}

function BouquetHouses({ night }: { night: boolean }) {
  const place = placement('houses')
  const scale = place.height / 11
  return (
    <group position={place.position} rotation={outwardRotation(place)}>
      <group scale={scale}>
      <House position={[0, 0, 0]} height={11} color={P.red} night={night} lean={-0.07} />
      <House position={[-4.8, 0, 1.4]} height={8.8} color={P.teal} night={night} lean={0.1} />
      </group>
    </group>
  )
}

export function IceProps({ propCount, night }: { propCount: PropCount; night: boolean }) {
  return (
    <group>
      <BouquetMountain />
      <BouquetLighthouse night={night} />
      {propCount >= 3 && <BouquetPines />}
      {propCount >= 4 && <BouquetHouses night={night} />}
    </group>
  )
}
