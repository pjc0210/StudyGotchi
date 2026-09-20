import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MEADOW_PALETTE as P, type DistrictId } from '../layout/biome-layout'
import { Glow, Surf } from '../render/materials'

function Window({ position, lit }: { position: [number, number, number]; lit: boolean }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.55, 0.65, 0.07]} />
      <Glow color={P.light} on={lit} intensity={1.5} />
    </mesh>
  )
}

export function House({ variant, lit }: { variant: number; lit: boolean }) {
  const wall = [P.limestone, '#ead8ad', '#cfa86b', '#d5c49d'][variant % 4]
  const roof = [P.roof, P.coral, '#475463', P.ochre][variant % 4]
  const width = 4.4 + (variant % 2) * 1.1
  const depth = 3.6 + ((variant + 1) % 3) * 0.45
  const height = 3.1 + (variant % 3) * 0.55
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[width, height, depth]} />
        <Surf color={wall} />
      </mesh>
      <mesh position={[0, height + 1.15, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.max(width, depth) * 0.72, 2.7 + (variant % 2) * 0.5, 4]} />
        <Surf color={roof} />
      </mesh>
      <mesh position={[width * 0.25, height + 1.2, -0.8]} castShadow>
        <boxGeometry args={[0.55, 2.0, 0.55]} />
        <Surf color={P.timberDark} />
      </mesh>
      <Window position={[-1.2, 1.9, depth / 2 + 0.04]} lit={lit} />
      <Window position={[1.2, 1.9, depth / 2 + 0.04]} lit={lit} />
      <mesh position={[0, 1.0, depth / 2 + 0.05]}>
        <boxGeometry args={[0.8, 1.8, 0.08]} />
        <Surf color={P.timber} />
      </mesh>
      {[[-width / 2 - 0.05, 1.3], [width / 2 + 0.05, 1.3]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]} castShadow>
          <boxGeometry args={[0.18, height, 0.18]} />
          <Surf color={P.timber} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.68, depth / 2 + 0.06]}>
        <boxGeometry args={[width, 0.18, 0.12]} />
        <Surf color={P.timberDark} />
      </mesh>
      {[-width * 0.28, width * 0.28].map((x) => (
        <mesh key={x} position={[x, height * 0.55, depth / 2 + 0.065]}>
          <boxGeometry args={[0.16, height * 0.85, 0.12]} />
          <Surf color={P.timberDark} />
        </mesh>
      ))}
    </group>
  )
}

export function RoundTree({ scale = 1, oak = false }: { scale?: number; oak?: boolean }) {
  return (
    <group scale={scale}>
      <mesh position={[0, oak ? 2.8 : 2.1, 0]} castShadow>
        <cylinderGeometry args={[oak ? 0.48 : 0.3, oak ? 0.7 : 0.42, oak ? 5.6 : 4.2, 7]} />
        <Surf color={P.timber} />
      </mesh>
      {oak ? (
        [[0, 6.2, 0, 2.7], [-2, 5.7, 0.3, 2], [2, 5.8, -0.3, 2.1], [0.4, 6.7, -1.5, 1.8]].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <dodecahedronGeometry args={[r, 1]} />
            <Surf color={i % 2 ? P.forestLight : P.forest} />
          </mesh>
        ))
      ) : (
        <>
          <mesh position={[0, 4.6, 0]} castShadow>
            <dodecahedronGeometry args={[2, 1]} />
            <Surf color={P.forest} />
          </mesh>
          <mesh position={[0.7, 5.1, -0.3]} castShadow>
            <dodecahedronGeometry args={[1.3, 1]} />
            <Surf color={P.forestLight} />
          </mesh>
        </>
      )}
    </group>
  )
}

export function Wheel({ radius = 2.4 }: { radius?: number }) {
  const wheel = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.z += delta * 0.35
  })
  return (
    <group ref={wheel}>
      <mesh>
        <torusGeometry args={[radius, 0.22, 6, 16]} />
        <Surf color={P.timberDark} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh key={index} rotation={[0, 0, (index / 8) * Math.PI]}>
          <boxGeometry args={[radius * 2, 0.14, 0.2]} />
          <Surf color={P.timber} />
        </mesh>
      ))}
    </group>
  )
}

export function Mill({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[7, 4.4, 5]} />
        <Surf color={P.timber} />
      </mesh>
      <mesh position={[0, 5.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[5.2, 2.8, 4]} />
        <Surf color={P.roof} />
      </mesh>
      <Window position={[-1.4, 2.4, 2.53]} lit={lit} />
      <group position={[4, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Wheel />
      </group>
    </group>
  )
}

export function Windmill() {
  const sails = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (sails.current) sails.current.rotation.z += delta * 0.22
  })
  return (
    <group>
      <mesh position={[0, 4.5, 0]} castShadow>
        <cylinderGeometry args={[1.7, 2.7, 9, 8]} />
        <Surf color={P.limestone} />
      </mesh>
      <mesh position={[0, 9.4, 0]} castShadow>
        <coneGeometry args={[2.5, 2.2, 8]} />
        <Surf color={P.roof} />
      </mesh>
      <group ref={sails} position={[0, 7.1, 2.0]}>
        {[0, Math.PI / 2].map((rotation) => (
          <group key={rotation} rotation={[0, 0, rotation]}>
            <mesh>
              <boxGeometry args={[12, 0.22, 0.14]} />
              <Surf color={P.timberDark} />
            </mesh>
            {[-3.8, 3.8].map((x) => (
              <mesh key={x} position={[x, 0.55, 0]}>
                <boxGeometry args={[3.2, 1.0, 0.1]} />
                <Surf color="#eee2bf" />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  )
}

export function GreatOak() {
  return <RoundTree scale={1.7} oak />
}

export function MarketAnchor({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <cylinderGeometry args={[7, 7.4, 0.36, 12]} />
        <Surf color={P.court} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 1.0, 10]} />
        <Surf color={P.limestoneShade} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[1.35, 1.35, 0.1, 10]} />
        <Surf color={P.water} />
      </mesh>
      {[0, 1, 2].map((index) => {
        const angle = (index / 3) * Math.PI * 2
        return (
          <group key={index} position={[Math.cos(angle) * 5, 0, Math.sin(angle) * 5]} rotation={[0, -angle, 0]}>
            <mesh position={[0, 1.6, 0]} castShadow>
              <coneGeometry args={[2.2, 1.6, 4]} />
              <Surf color={[P.coral, P.wheat, P.rose][index]} />
            </mesh>
            <mesh position={[0, 0.8, 0]} castShadow>
              <boxGeometry args={[3.4, 0.18, 2.2]} />
              <Surf color={P.timber} />
            </mesh>
            {lit && <pointLight position={[0, 1.1, 0]} color={P.light} intensity={2} distance={8} />}
          </group>
        )
      })}
    </group>
  )
}

export function MarketStall({ index, lit }: { index: number; lit: boolean }) {
  const color = [P.coral, P.wheat, P.rose, P.ochre][index % 4]
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[4.2, 0.22, 2.8]} />
        <Surf color={P.timber} />
      </mesh>
      {[-1.7, 1.7].flatMap((x) => [-1.05, 1.05].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 1.3, z]}>
          <cylinderGeometry args={[0.07, 0.09, 2.6, 5]} />
          <Surf color={P.timberDark} />
        </mesh>
      )))}
      <mesh position={[0, 2.65, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.0, 1.5, 4]} />
        <Surf color={color} />
      </mesh>
      {lit && <pointLight position={[0, 1.8, 0]} color={P.light} intensity={2.2} distance={7} />}
    </group>
  )
}

export function WorkShed({ index = 0 }: { index?: number }) {
  return (
    <group>
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[5.5, 2.9, 4]} />
        <Surf color={index % 2 ? '#9a714c' : P.timber} />
      </mesh>
      <mesh position={[0, 3.25, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.2, 2.0, 4]} />
        <Surf color="#475463" />
      </mesh>
      <mesh position={[0, 1.0, 2.04]}>
        <boxGeometry args={[1.5, 2, 0.1]} />
        <Surf color={P.timberDark} />
      </mesh>
    </group>
  )
}

export function TimberYard() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[14, 0.32, 9]} />
        <Surf color="#b79b6d" />
      </mesh>
      {[-1.2, 0, 1.2].map((x, index) => (
        <mesh key={x} position={[x - 3.4, 0.55 + index * 0.35, 1.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 5.4, 8]} />
          <Surf color={P.timber} />
        </mesh>
      ))}
      <mesh position={[2.6, 2.7, -1.4]} castShadow>
        <boxGeometry args={[7.2, 0.28, 4.4]} />
        <Surf color={P.roof} />
      </mesh>
      {[-0.3, 5.5].flatMap((x) => [-3.1, 0.3].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 1.35, z]}>
          <cylinderGeometry args={[0.12, 0.16, 2.7, 6]} />
          <Surf color={P.timberDark} />
        </mesh>
      )))}
      <group position={[5.8, 2.4, 0.4]} rotation={[0, Math.PI / 2, 0]}>
        <Wheel radius={2.2} />
      </group>
    </group>
  )
}

export function GuildHall({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 2.8, 0]} castShadow>
        <boxGeometry args={[11, 5.6, 6.5]} />
        <Surf color="#e1d4b4" />
      </mesh>
      <mesh position={[0, 6.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[8.0, 3.5, 4]} />
        <Surf color="#475463" />
      </mesh>
      {[-3.2, 0, 3.2].map((x) => <Window key={x} position={[x, 3.2, 3.28]} lit={lit} />)}
      <mesh position={[0, 1.4, 3.3]}>
        <boxGeometry args={[1.8, 2.8, 0.12]} />
        <Surf color={P.timberDark} />
      </mesh>
      {[-4.3, 4.3].map((x) => (
        <mesh key={x} position={[x, 2.8, 3.32]}>
          <boxGeometry args={[0.28, 5.3, 0.18]} />
          <Surf color={P.timber} />
        </mesh>
      ))}
    </group>
  )
}

export function Hedge({ length = 6 }: { length?: number }) {
  return (
    <mesh position={[0, 0.65, 0]} castShadow>
      <boxGeometry args={[length, 1.3, 1.1]} />
      <Surf color={P.forest} />
    </mesh>
  )
}

export function OrchardTree({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 2, 6]} />
        <Surf color={P.timber} />
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <dodecahedronGeometry args={[1.25, 1]} />
        <Surf color={P.forestLight} />
      </mesh>
      <mesh position={[0.5, 2.5, 0.2]}>
        <dodecahedronGeometry args={[0.65, 0]} />
        <Surf color={P.wheat} />
      </mesh>
    </group>
  )
}

export function GardenPlot({ accent = P.coral }: { accent?: string }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.16, 4.2]} />
        <Surf color="#806c49" />
      </mesh>
      {[-1.2, 0, 1.2].map((z, row) => (
        <group key={z} position={[0, 0, z]}>
          {[-2.2, -1.1, 0, 1.1, 2.2].map((x, index) => (
            <mesh key={x} position={[x, 0.32, 0]}>
              <dodecahedronGeometry args={[0.23, 0]} />
              <Surf color={(row + index) % 3 === 0 ? accent : P.forestLight} />
            </mesh>
          ))}
        </group>
      ))}
      {[-3.3, 3.3].map((x) => <group key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}><Hedge length={4.8} /></group>)}
    </group>
  )
}

export function Landing() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[7.5, 0.35, 3.2]} />
        <Surf color={P.timber} />
      </mesh>
      {[-3.2, 3.2].flatMap((x) => [-1.25, 1.25].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, -0.45, z]}>
          <cylinderGeometry args={[0.13, 0.18, 1.6, 6]} />
          <Surf color={P.timberDark} />
        </mesh>
      )))}
      <mesh position={[0, 0.65, -0.8]} scale={[1.8, 0.35, 0.65]}>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={P.coral} />
      </mesh>
    </group>
  )
}

export function Barn({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[8, 4.2, 5]} />
        <Surf color={P.ochre} />
      </mesh>
      <mesh position={[0, 5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[5.8, 2.7, 4]} />
        <Surf color={P.roof} />
      </mesh>
      <Window position={[-1.8, 2.5, 2.53]} lit={lit} />
      <mesh position={[1.4, 1.6, 2.54]}>
        <boxGeometry args={[2.8, 3.2, 0.08]} />
        <Surf color={P.timberDark} />
      </mesh>
    </group>
  )
}

export function Bridge({ length, width = 5 }: { length: number; width?: number }) {
  const count = Math.max(8, Math.round(length / 1.2))
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const t = (index + 0.5) / count
        const x = (t - 0.5) * length
        const y = 0.35 + Math.sin(t * Math.PI) * 1.1
        return (
          <mesh key={index} position={[x, y, 0]} castShadow>
            <boxGeometry args={[length / count + 0.08, 0.28, width]} />
            <Surf color={index % 2 ? P.road : '#c7ad7c'} />
          </mesh>
        )
      })}
      {[-width / 2, width / 2].map((z) => (
        <mesh key={z} position={[0, 1.55, z]} castShadow>
          <boxGeometry args={[length * 0.92, 0.22, 0.22]} />
          <Surf color={P.limestoneShade} />
        </mesh>
      ))}
    </group>
  )
}

export function FlowerPatch({ index = 0 }: { index?: number }) {
  return (
    <group>
      {Array.from({ length: 9 }, (_, i) => {
        const angle = i * 2.4
        const radius = 0.25 + (i % 4) * 0.32
        return (
          <group key={i} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.025, 0.035, 0.4, 5]} />
              <Surf color={P.forest} />
            </mesh>
            <mesh position={[0, 0.43, 0]}>
              <octahedronGeometry args={[0.12, 0]} />
              <Surf color={[P.wheat, P.coral, '#f0e8f1'][index % 3]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function DistrictAnchor({ id, lit }: { id: DistrictId; lit: boolean }) {
  switch (id) {
    case 'forest-hamlet':
      return <GreatOak />
    case 'river-village':
      return <Mill lit={lit} />
    case 'bridge-market':
      return null
    case 'farm-common':
      return <Windmill />
    case 'castle-court':
      return null
  }
}
