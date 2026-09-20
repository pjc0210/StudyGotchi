import { useEffect, useMemo, useRef } from 'react'
import { CameraControls, Html, PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clampBiomeYaw } from '../camera/stations'
import type { JungleState } from '../jungle-state'
import {
  JUNGLE_LAYOUT as L,
  JUNGLE_PALETTE as P,
  birdSchedule,
  canopyHorizon,
  courseProgress,
  landmarkStage,
  populationFor,
  seeded,
  seededDistricts,
  type LandmarkStage,
  type SeededDistrict,
} from '../layout/jungle-layout'
import { PixelComposer } from '../render/PixelComposer'
import { Glow, Surf } from '../render/materials'

function ribbonGeometry(points: Array<[number, number]>, width: number, y: number): THREE.BufferGeometry {
  const vertices: number[] = []
  const indices: number[] = []
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i]
    const previous = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const dx = next[0] - previous[0]
    const dz = next[1] - previous[1]
    const length = Math.hypot(dx, dz) || 1
    const nx = (-dz / length) * width * 0.5
    const nz = (dx / length) * width * 0.5
    vertices.push(x + nx, y, z + nz, x - nx, y, z - nz)
    if (i > 0) {
      const a = (i - 1) * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Ribbon({ points, width, y, color }: { points: Array<[number, number]>; width: number; y: number; color: string }) {
  const geometry = useMemo(() => ribbonGeometry(points, width, y), [points, width, y])
  return (
    <mesh geometry={geometry} receiveShadow>
      <Surf color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Ellipse({
  center,
  size,
  y,
  color,
  opacity = 1,
}: {
  center: [number, number]
  size: [number, number]
  y: number
  color: string
  opacity?: number
}) {
  return (
    <mesh position={[center[0], y, center[1]]} scale={[size[0] * 0.5, 1, size[1] * 0.5]} receiveShadow>
      <cylinderGeometry args={[1, 1, 0.16, 32]} />
      <Surf color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

function JungleTree({
  height,
  broad = 1,
  night,
  secondary = false,
  fruit = false,
}: {
  height: number
  broad?: number
  night: boolean
  secondary?: boolean
  fruit?: boolean
}) {
  const canopy = night ? P.canopyNight : secondary ? P.canopyDark : P.canopy
  const crownY = height * 0.78
  return (
    <group>
      <mesh position={[0, height * 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.6 * broad, 1.1 * broad, height * 0.84, 7]} />
        <Surf color={P.bark} />
      </mesh>
      <mesh position={[0, crownY, 0]} scale={[broad * 1.6, 0.52, broad * 1.35]} castShadow>
        <dodecahedronGeometry args={[4.4, 0]} />
        <Surf color={canopy} />
      </mesh>
      <mesh position={[-2.5 * broad, crownY - 0.2, 0.8]} scale={[broad, 0.46, broad * 0.85]} castShadow>
        <dodecahedronGeometry args={[3.2, 0]} />
        <Surf color={secondary ? P.canopyDark : '#3f7f4d'} />
      </mesh>
      <mesh position={[2.3 * broad, crownY + 0.1, -0.6]} scale={[broad * 0.9, 0.42, broad]} castShadow>
        <dodecahedronGeometry args={[3.1, 0]} />
        <Surf color={canopy} />
      </mesh>
      {fruit &&
        Array.from({ length: 5 }, (_, index) => {
          const angle = (index / 5) * Math.PI * 2
          return (
            <mesh key={index} position={[Math.cos(angle) * broad * 3.2, crownY - 1.7, Math.sin(angle) * broad * 2.5]}>
              <sphereGeometry args={[0.26, 6, 5]} />
              <Glow color={P.gold} on={night} intensity={1.1} />
            </mesh>
          )
        })}
    </group>
  )
}

function HorizonCanopy({ fraction, night }: { fraction: number; night: boolean }) {
  const trees = useMemo(() => canopyHorizon(20260920, fraction), [fraction])
  return (
    <group>
      {trees.map((tree, index) => (
        <group key={index} position={[tree.x, 0, tree.z]} scale={tree.s}>
          <JungleTree height={tree.h} broad={tree.row === 1 ? 1 : 0.82} night={night} secondary={tree.row === 2} />
        </group>
      ))}
    </group>
  )
}

function RopeBridge({
  a,
  b,
  y = 3,
  width = 2.2,
}: {
  a: [number, number]
  b: [number, number]
  y?: number
  width?: number
}) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1])
  const count = Math.max(8, Math.round(length / 0.75))
  const center: [number, number, number] = [(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]
  return (
    <group position={center} rotation={[0, yaw, 0]}>
      {Array.from({ length: count }, (_, index) => {
        const t = (index + 0.5) / count
        const z = (t - 0.5) * length
        const sag = Math.sin(t * Math.PI) * -0.9
        return (
          <mesh key={index} position={[0, sag, z]} rotation={[0, 0, (index % 3 - 1) * 0.025]} castShadow>
            <boxGeometry args={[width, 0.16, length / count + 0.06]} />
            <Surf color={index % 2 ? P.deck : '#a27647'} />
          </mesh>
        )
      })}
      {[-width * 0.58, width * 0.58].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.75, 0]}>
            <boxGeometry args={[0.07, 0.07, length]} />
            <Surf color={P.bark} />
          </mesh>
          {Array.from({ length: 7 }, (_, index) => {
            const t = index / 6
            return (
              <mesh key={index} position={[x, 0.2 - Math.sin(t * Math.PI) * 0.9, (t - 0.5) * length]}>
                <cylinderGeometry args={[0.035, 0.035, 1.2, 4]} />
                <Surf color={P.bark} />
              </mesh>
            )
          })}
        </group>
      ))}
    </group>
  )
}

function TreehousePod({ index, lit }: { index: number; lit: boolean }) {
  const wall = index % 3 === 0 ? '#81573d' : index % 3 === 1 ? '#9a6c45' : '#6d4a35'
  const wide = index % 4 === 1
  const tall = index % 3 === 2
  return (
    <group rotation={[0, (index % 3 - 1) * 0.12, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[wide ? 3.6 : 2.8, wide ? 3.9 : 3.1, 0.35, 9]} />
        <Surf color={P.deck} />
      </mesh>
      <mesh position={[wide ? -0.5 : 0, tall ? 2 : 1.55, 0]} castShadow>
        <boxGeometry args={[wide ? 4.1 : 3.1, tall ? 3.6 : 2.7, wide ? 2.5 : 3]} />
        <Surf color={wall} />
      </mesh>
      <mesh position={[wide ? -0.4 : 0, tall ? 4.2 : 3.25, 0]} rotation={[0, Math.PI / 4 + index * 0.11, 0]} castShadow>
        <coneGeometry args={[wide ? 3.2 : 2.6, 1.35, 4]} />
        <Surf color={index % 2 ? '#496f3f' : P.canopyDark} />
      </mesh>
      <mesh position={[wide ? -0.5 : 0, tall ? 2.1 : 1.7, wide ? 1.28 : 1.55]}>
        <boxGeometry args={[0.55, 0.65, 0.08]} />
        <Glow color={P.window} on={lit} intensity={1.3} />
      </mesh>
      {wide && (
        <mesh position={[2.25, 0.4, 0]} castShadow>
          <boxGeometry args={[1.8, 0.18, 2.1]} />
          <Surf color="#c08e50" />
        </mesh>
      )}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (wide ? 3.3 : 2.5), 0.65, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 1.3, 5]} />
          <Surf color={P.bark} />
        </mesh>
      ))}
    </group>
  )
}

function Ladder({ height }: { height: number }) {
  return (
    <group rotation={[0, 0, -0.08]}>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]}>
          <cylinderGeometry args={[0.06, 0.08, height, 5]} />
          <Surf color={P.bark} />
        </mesh>
      ))}
      {Array.from({ length: Math.max(3, Math.floor(height / 0.65)) }, (_, index) => (
        <mesh key={index} position={[0, 0.45 + index * 0.65, 0]}>
          <boxGeometry args={[1, 0.08, 0.08]} />
          <Surf color={P.deck} />
        </mesh>
      ))}
    </group>
  )
}

function HangingVines({ height = 5, spread = 3 }: { height?: number; spread?: number }) {
  return (
    <group>
      {Array.from({ length: 5 }, (_, index) => {
        const x = -spread / 2 + (index / 4) * spread
        const h = height * (0.55 + (index % 3) * 0.18)
        return (
          <group key={index} position={[x, -h / 2, (index % 2 - 0.5) * 1.3]}>
            <mesh>
              <cylinderGeometry args={[0.035, 0.06, h, 5]} />
              <Surf color="#2f6a3a" />
            </mesh>
            <mesh position={[0.22, -h * 0.18, 0]} rotation={[0, 0, -0.55]} scale={[0.5, 0.18, 0.32]}>
              <dodecahedronGeometry args={[0.8, 0]} />
              <Surf color="#4a8b45" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function ElevatedTreehouse({ index, height, lit, night }: { index: number; height: number; lit: boolean; night: boolean }) {
  const trunkRadius = 0.75 + (index % 3) * 0.25
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[trunkRadius * 0.7, trunkRadius, height, 7]} />
        <Surf color={index % 2 ? '#65442f' : P.bark} />
      </mesh>
      <group position={[0, height, 0]} scale={0.82 + (index % 4) * 0.07}>
        <TreehousePod index={index} lit={lit} />
      </group>
      <group position={[trunkRadius + 0.65, 0, 0.7]}>
        <Ladder height={height} />
      </group>
      <group position={[0, height + 3.8, 0]}>
        <HangingVines height={4 + (index % 3)} spread={4} />
      </group>
      <mesh position={[-1.7, height + 3.8, -0.4]} scale={[1.25, 0.42, 1]} castShadow>
        <dodecahedronGeometry args={[2.6, 0]} />
        <Surf color={night ? P.canopyNight : index % 2 ? '#3f7f4d' : P.canopy} />
      </mesh>
    </group>
  )
}

function MotherTree({ night }: { night: boolean }) {
  return (
    <group>
      <mesh position={[0, 9, 0]} castShadow>
        <cylinderGeometry args={[2.8, 4.2, 18, 9]} />
        <Surf color={P.bark} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}:${z}`} position={[x * 3, 3.2, z * 2]} rotation={[z * 0.16, 0, -x * 0.24]} castShadow>
            <cylinderGeometry args={[0.65, 1.25, 8, 7]} />
            <Surf color="#65442f" />
          </mesh>
        )),
      )}
      {[5.5, 10.5, 15].map((y, index) => (
        <group key={y}>
          <mesh position={[0, y, 0]} castShadow>
            <cylinderGeometry args={[6.5 - index * 0.65, 6.8 - index * 0.65, 0.42, 14]} />
            <Surf color={index === 1 ? P.gold : P.deck} />
          </mesh>
          {Array.from({ length: 6 }, (_, lamp) => {
            const angle = (lamp / 6) * Math.PI * 2
            const radius = 5.5 - index * 0.55
            return (
              <mesh key={lamp} position={[Math.cos(angle) * radius, y + 0.35, Math.sin(angle) * radius]}>
                <sphereGeometry args={[0.17, 6, 5]} />
                <Glow color={P.window} on={night} intensity={1.2} />
              </mesh>
            )
          })}
        </group>
      ))}
      <group position={[0, 19, 0]}>
        <mesh scale={[1.45, 0.48, 1.2]} castShadow>
          <dodecahedronGeometry args={[5.2, 0]} />
          <Surf color={night ? P.canopyNight : P.canopy} />
        </mesh>
        <mesh position={[-4, -0.2, 1]} scale={[0.9, 0.35, 0.75]} castShadow>
          <dodecahedronGeometry args={[4.2, 0]} />
          <Surf color={night ? P.canopyNight : '#3f7f4d'} />
        </mesh>
        <HangingVines height={8} spread={8} />
      </group>
    </group>
  )
}

function StiltHome({ index, lit }: { index: number; lit: boolean }) {
  const width = 2.6 + (index % 3) * 0.7
  const depth = 2.2 + ((index + 1) % 3) * 0.55
  const deck = 2.3 + (index % 2) * 0.45
  const wallHeight = 1.9 + (index % 3) * 0.35
  return (
    <group>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}:${sz}`} position={[sx * width * 0.46, deck / 2, sz * depth * 0.46]}>
            <cylinderGeometry args={[0.11, 0.17, deck, 5]} />
            <Surf color={P.bark} />
          </mesh>
        )),
      )}
      <mesh position={[0, deck, 0]} castShadow>
        <boxGeometry args={[width + 1.2, 0.24, depth + 1]} />
        <Surf color={P.deck} />
      </mesh>
      <mesh position={[0, deck + wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[width, wallHeight, depth]} />
        <Surf color={index % 2 ? '#8c6843' : '#aa7d4a'} />
      </mesh>
      <mesh position={[0, deck + wallHeight + 0.7, 0]} rotation={[0, Math.PI / 4 + index * 0.17, 0]} castShadow>
        <coneGeometry args={[Math.max(width, depth) * 0.85, 1.4, 4]} />
        <Surf color={index % 3 === 0 ? '#496f3f' : P.canopyDark} />
      </mesh>
      <mesh position={[0, deck + wallHeight * 0.55, depth / 2 + 0.04]}>
        <boxGeometry args={[0.55, 0.6, 0.07]} />
        <Glow color={P.window} on={lit} />
      </mesh>
      {index % 2 === 0 && (
        <mesh position={[width * 0.72, deck + 0.1, 0]} castShadow>
          <boxGeometry args={[1.5, 0.16, depth * 0.8]} />
          <Surf color="#c08e50" />
        </mesh>
      )}
    </group>
  )
}

function Canoe({ color = P.coral }: { color?: string }) {
  return (
    <group rotation={[0, 0, 0.04]}>
      <mesh scale={[2.6, 0.35, 0.75]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={color} />
      </mesh>
      <mesh position={[0, 0.22, 0]} scale={[2.05, 0.18, 0.48]}>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={P.bark} />
      </mesh>
    </group>
  )
}

function Reeds({ count = 7 }: { count?: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const x = (index % 4) * 0.45
        const z = Math.floor(index / 4) * 0.5
        const h = 1.3 + (index % 3) * 0.35
        return (
          <group key={index} position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]}>
              <cylinderGeometry args={[0.025, 0.04, h, 4]} />
              <Surf color="#356b3c" />
            </mesh>
            <mesh position={[0, h, 0]}>
              <capsuleGeometry args={[0.08, 0.25, 2, 5]} />
              <Surf color="#8b6840" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function GroundCluster({ variant = 0 }: { variant?: number }) {
  return (
    <group rotation={[0, variant * 0.73, 0]}>
      {variant % 3 === 0 && (
        <>
          {[-1.3, 0, 1.25].map((x, index) => (
            <mesh key={x} position={[x, 0.32 + index * 0.08, 0]} rotation={[Math.PI / 2, 0, index * 0.17]}>
              <cylinderGeometry args={[0.22, 0.26, 2.6, 7]} />
              <Surf color={index % 2 ? '#75513a' : P.bark} />
            </mesh>
          ))}
        </>
      )}
      {variant % 3 === 1 &&
        [
          [-1.2, 0.55, 0, 0.85],
          [0.4, 0.38, 0.5, 0.58],
          [1.35, 0.28, -0.35, 0.45],
        ].map(([x, y, z, scale], index) => (
          <mesh key={index} position={[x, y, z]} rotation={[0, index * 0.8, 0]} scale={scale}>
            <dodecahedronGeometry args={[1, 0]} />
            <Surf color={index % 2 ? '#71805d' : '#617454'} />
          </mesh>
        ))}
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={`fern-${index}`} position={[-1.8 + index * 0.8, 0.35, 1 + (index % 2) * 0.5]} rotation={[0, index * 0.9, index % 2 ? 0.3 : -0.3]} scale={[0.55, 0.18, 0.32]}>
          <dodecahedronGeometry args={[1, 0]} />
          <Surf color={index % 2 ? '#3f7f4d' : '#4f8a4a'} />
        </mesh>
      ))}
    </group>
  )
}

function Waterwheel({ night }: { night: boolean }) {
  const wheel = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.z += delta * 0.25
  })
  return (
    <group>
      <mesh position={[-2.6, 2.2, 0]} castShadow>
        <boxGeometry args={[5.2, 4.4, 5.5]} />
        <Surf color="#7a573d" />
      </mesh>
      <mesh position={[-2.6, 4.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.2, 2.2, 4]} />
        <Surf color={P.canopyDark} />
      </mesh>
      <mesh position={[-2.6, 2.3, 2.78]}>
        <boxGeometry args={[0.7, 0.75, 0.08]} />
        <Glow color={P.window} on={night} />
      </mesh>
      <group ref={wheel} position={[1.1, 2.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <torusGeometry args={[3.1, 0.23, 6, 16]} />
          <Surf color={P.bark} />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => (
          <mesh key={index} rotation={[0, 0, (index / 8) * Math.PI]}>
            <boxGeometry args={[6.2, 0.18, 0.18]} />
            <Surf color={P.deck} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function RootGate() {
  return (
    <group>
      {[
        [-5.3, 3.6, 2.3, 7.2],
        [-2.9, 6.6, 1.8, 3],
        [4.8, 4.7, 2.5, 9.4],
        [2.6, 8.2, 2, 2.8],
      ].map(([x, y, w, h], index) => (
        <mesh key={index} position={[x, y, index % 2 ? 0.35 : 0]} rotation={[0, index * 0.08, index % 2 ? -0.08 : 0.05]} castShadow>
          <boxGeometry args={[w, h, 2.6 + (index % 2) * 0.7]} />
          <Surf color={index % 2 ? '#a89880' : P.ruin} />
        </mesh>
      ))}
      {[
        [-3.8, 8.1, 4.6],
        [0.2, 8.7, 3],
        [3.1, 9.1, 2.8],
      ].map(([x, y, w], index) => (
        <mesh key={`lintel-${index}`} position={[x, y, 0]} rotation={[0, 0, index === 1 ? 0.16 : -0.08]} castShadow>
          <boxGeometry args={[w, 1.45, 2.5]} />
          <Surf color={index === 1 ? '#948673' : P.ruin} />
        </mesh>
      ))}
      {[-4.6, 4.5].map((x, index) => (
        <mesh key={`root-${x}`} position={[x, 4, 0.8]} rotation={[0, 0, index ? -0.3 : 0.3]}>
          <cylinderGeometry args={[0.45, 1.05, 9, 6]} />
          <Surf color={P.bark} />
        </mesh>
      ))}
      {[
        [-5.4, 6.1, 1.4, 1.9],
        [-2.9, 7.3, 1.7, 1.2],
        [4.7, 5.7, 1.5, 2.1],
        [0.1, 9.2, 2.4, 0.8],
      ].map(([x, y, width, height], index) => (
        <mesh key={`moss-${index}`} position={[x, y, 1.36]} rotation={[0, 0, index % 2 ? 0.12 : -0.08]} scale={[width, height, 0.16]}>
          <dodecahedronGeometry args={[0.7, 0]} />
          <Surf color={index % 2 ? '#4f7f45' : '#668d4f'} />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <mesh key={`block-${index}`} position={[-8 + (index % 5) * 3.6, 0.35 + (index % 2) * 0.2, -4 + Math.floor(index / 5) * 8]} rotation={[0, index * 0.61, 0]}>
          <boxGeometry args={[2.4, 0.6, 1.8]} />
          <Surf color={index % 3 ? '#a89880' : '#7d8c62'} />
        </mesh>
      ))}
      <group position={[0, 9.2, 0.7]}>
        <HangingVines height={7} spread={10} />
      </group>
    </group>
  )
}

function DistrictScene({
  district,
  progress,
  seed,
  night,
}: {
  district: SeededDistrict
  progress: number
  seed: number
  night: boolean
}) {
  const population = populationFor(district, progress)
  const lit = night
  const rng = seeded(seed * 151 + district.id.length * 37)
  const canopySpots = [
    [-12, -8, 7, 0.45, 1.05],
    [9, -11, 11, -0.7, 0.92],
    [-19, 4, 5.5, 1.15, 0.88],
    [15, 2, 8.5, -1.2, 1.08],
    [-7, 12, 13, 2.45, 0.95],
    [21, 11, 6.5, -2.4, 0.86],
    [-23, -14, 10, 0.2, 0.82],
    [3, -19, 15, -0.15, 0.9],
    [24, -6, 12, -1.7, 0.78],
    [-16, 17, 8, 2.8, 0.86],
  ] as const
  const lagoonSpots = [
    [-15, -8, -0.25, 1.1],
    [-7, 3, 0.45, 0.86],
    [6, -6, -0.75, 1.25],
    [14, 2, 0.2, 0.95],
    [-18, 10, 0.8, 0.8],
    [3, 12, -0.15, 1.05],
    [19, 12, -0.55, 0.82],
    [11, -14, 0.65, 0.9],
  ] as const
  const yaw = (district.yaw * Math.PI) / 180
  return (
    <group position={[district.center[0], 0, district.center[1]]} rotation={[0, yaw, 0]}>
      {district.id === 'canopy' && (
        <>
          <MotherTree night={night} />
          {canopySpots.slice(0, population.primary).map(([x, z, height, rotation, scale], index) => (
            <group key={index} position={[x, 0, z]} rotation={[0, rotation, 0]} scale={scale}>
              <ElevatedTreehouse index={index} height={height} lit={lit} night={night} />
            </group>
          ))}
          {canopySpots.slice(0, population.secondary).map(([x, z, height], index) => {
            const previous = index === 0 ? ([0, 0, 10] as const) : canopySpots[index - 1]
            return (
              <RopeBridge
                key={`span-${index}`}
                a={[previous[0], previous[1]]}
                b={[x, z]}
                y={(previous[2] + height) / 2 + 0.7}
                width={1.55}
              />
            )
          })}
          <group position={[-4, 15.2, 3]} rotation={[0, -0.7, 0]}>
            <RopeBridge a={[-5, 0]} b={[9, 0]} y={0} width={2.1} />
          </group>
          {population.extras && (
            <>
              <group position={[3, 18.5, -3]} rotation={[0, -0.35, 0]} scale={0.72}>
                <TreehousePod index={8} lit={lit} />
                <group position={[0, 4, 0]}>
                  <HangingVines height={5} spread={5} />
                </group>
              </group>
              <RopeBridge a={[-7, 12]} b={[3, -3]} y={18.8} width={1.35} />
            </>
          )}
        </>
      )}
      {district.id === 'falls' && (
        <>
          {[
            [0, 6.3, -20, 13, 4.2],
            [-1.5, 3.6, -11, 17, 3.2],
            [1, 1.5, -2, 21, 2.2],
          ].map(([x, y, z, width, depth], index) => (
            <group key={`shelf-${index}`} position={[x, y, z]}>
              <mesh scale={[width / 2, 1.15, depth / 2]} castShadow>
                <dodecahedronGeometry args={[1, 0]} />
                <Surf color={index % 2 ? '#71895c' : '#85926a'} />
              </mesh>
              <mesh position={[0, 1.05, 0.6]} scale={[width * 0.38, 0.25, depth * 0.35]}>
                <dodecahedronGeometry args={[1, 0]} />
                <Surf color={P.water} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 7.8, -15.3]}>
            <planeGeometry args={[6.5, 7]} />
            <Surf color="#f2fff1" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.4, 3.8, -6.3]}>
            <planeGeometry args={[7.5, 4.8]} />
            <Surf color={P.waterLight} side={THREE.DoubleSide} />
          </mesh>
          {[-2.1, 0, 2.2].map((x, index) => (
            <mesh key={`sheet-${index}`} position={[x, 7.7 - index * 0.25, -15.05 + index * 0.08]} scale={[1, 1, 1]}>
              <planeGeometry args={[1.7 + (index % 2) * 0.5, 8.2]} />
              <meshBasicMaterial color={index === 1 ? '#ffffff' : '#dff9ef'} transparent opacity={0.92} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {[-3.4, -1.2, 1.3, 3.6].map((x, index) => (
            <mesh key={`fall-mist-${index}`} position={[x, 1.4 + (index % 2) * 0.6, -3.8 + (index % 3) * 0.8]} scale={[2.2, 0.8, 1.6]}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#effff2" transparent opacity={0.48} depthWrite={false} />
            </mesh>
          ))}
          <RopeBridge a={[-11, -12]} b={[11, -12]} y={8.6} width={1.8} />
          {[
            [-14, -16, 7.5, 0.5],
            [13, -15, 6, -0.7],
            [-17, -3, 4.5, 1.2],
            [16, 0, 3.2, -1.1],
            [-10, 10, 2.2, 2.4],
          ]
            .slice(0, Math.min(5, population.primary))
            .map(([x, z, height, rotation], index) => (
              <group key={index} position={[x, 0, z]} rotation={[0, rotation, 0]} scale={0.76 + (index % 3) * 0.08}>
                <ElevatedTreehouse index={index + 2} height={height} lit={lit} night={night} />
              </group>
            ))}
          {[
            [-14, 8, 0.2],
            [-8, 12, -0.35],
            [-2, 11, 0.45],
            [6, 14, -0.2],
          ]
            .slice(0, population.secondary)
            .map(([x, z, rotation], index) => (
              <group key={`stall-${index}`} position={[x, 0, z]} rotation={[0, rotation, 0]}>
                <mesh position={[0, 1.05, 0]} castShadow>
                  <boxGeometry args={[3.8 + (index % 2), 2.1, 2.7]} />
                  <Surf color={index % 2 ? P.coral : '#c99754'} />
                </mesh>
                <mesh position={[0, 2.35, 0]} rotation={[0, Math.PI / 4, 0]}>
                  <coneGeometry args={[2.7, 0.9, 4]} />
                  <Surf color={index % 2 ? '#496f3f' : P.canopyDark} />
                </mesh>
              </group>
            ))}
          <group position={[9, 0.2, 10]}>
            <Reeds count={10} />
          </group>
          <group position={[-7, 5.5, -11]} scale={0.75}>
            <JungleTree height={15} broad={0.95} night={night} />
          </group>
        </>
      )}
      {district.id === 'lagoon' && (
        <>
          <group position={[-1, 0, -1]} rotation={[0, 0.18, 0]} scale={[1.75, 1.2, 1.05]}>
            <StiltHome index={0} lit={lit} />
          </group>
          {lagoonSpots.slice(0, population.primary).map(([x, z, rotation, scale], index) => (
            <group key={index} position={[x, 0, z]} rotation={[0, rotation, 0]} scale={scale}>
              <StiltHome index={index + 1} lit={lit} />
            </group>
          ))}
          <Ribbon points={[[-18, -7], [-8, -3], [0, -1], [10, -5], [18, 1]]} width={1.6} y={2.5} color={P.deck} />
          <Ribbon points={[[-7, -3], [-9, 6], [-17, 10]]} width={1.4} y={2.5} color="#b1844d" />
          <Ribbon points={[[4, -2], [5, 7], [4, 14]]} width={1.45} y={2.5} color="#c29250" />
          {Array.from({ length: population.secondary }, (_, index) => (
            <mesh key={`pier-${index}`} position={[-12 + index * 8.5, 2.45, 17 + (index % 2) * 3]} rotation={[0, (index % 2 ? -0.22 : 0.18), 0]} castShadow>
              <boxGeometry args={[1.8, 0.22, 9 + index]} />
              <Surf color={index % 2 ? '#b1844d' : P.deck} />
            </mesh>
          ))}
          <group position={[14, 0.55, 17]} rotation={[0, -0.45, 0]}>
            <Canoe />
          </group>
          <group position={[-18, 0.25, 14]}>
            <Canoe color="#dca34f" />
          </group>
          {[
            [-22, -5],
            [-21, 8],
            [20, 5],
            [15, -11],
          ].map(([x, z], index) => (
            <group key={`reed-${index}`} position={[x, 0.2, z]} rotation={[0, index * 0.8, 0]}>
              <Reeds count={9} />
            </group>
          ))}
          <mesh position={[18, 3.8, -5]} rotation={[0, 0.4, 0]}>
            <torusGeometry args={[2.2, 0.08, 5, 12]} />
            <Surf color="#d8c891" />
          </mesh>
          {[
            [-10, 2.9, -2],
            [1.5, 2.9, 0],
            [9, 2.9, -4],
            [5, 2.8, 10],
          ].map(([x, y, z], index) => (
            <group key={`basket-${index}`} position={[x, y, z]} rotation={[0, index * 0.6, 0]}>
              <mesh>
                <cylinderGeometry args={[0.55, 0.4, 0.7, 8]} />
                <Surf color={index % 2 ? '#9b6b3e' : '#b1844d'} />
              </mesh>
              <mesh position={[0, 0.4, 0]}>
                <torusGeometry args={[0.38, 0.05, 5, 10, Math.PI]} />
                <Surf color={P.bark} />
              </mesh>
            </group>
          ))}
        </>
      )}
      {district.id === 'ruins' && (
        <>
          <RootGate />
          {[
            [-14, 7, -0.2],
            [-8, 13, 0.4],
            [2, 14, -0.5],
            [11, 11, 0.25],
            [15, 3, -0.8],
            [-17, -5, 0.75],
            [7, -9, -0.3],
            [-5, -12, 0.55],
          ]
            .slice(0, population.primary)
            .map(([x, z, rotation], index) => (
              <group key={index} position={[x, 0, z]} rotation={[0, rotation, 0]}>
                <mesh position={[0, 1.2, 0]} castShadow>
                  <boxGeometry args={[4.2 + (index % 3), 2.4, 3.2]} />
                  <Surf color={index % 2 ? '#9b6744' : P.coral} />
                </mesh>
                <mesh position={[0.2, 2.8, 0]} rotation={[0, Math.PI / 4 + index * 0.12, 0]}>
                  <coneGeometry args={[3 + (index % 2) * 0.5, 1.25, 4]} />
                  <Surf color={index % 2 ? '#496f3f' : P.canopy} />
                </mesh>
              </group>
            ))}
          {[
            [-11, -9, 0.5],
            [-4, -11, -0.1],
            [8, -12, 0.25],
            [14, -7, -0.45],
          ]
            .slice(0, population.secondary)
            .map(([x, z, rotation], index) => (
              <group key={`archive-${index}`} position={[x, 0, z]} rotation={[0, rotation, 0]}>
                <mesh position={[0, 1.45, 0]} castShadow>
                  <boxGeometry args={[4.8, 2.9, 3.6]} />
                  <Surf color={index % 2 ? '#948673' : P.ruin} />
                </mesh>
                <mesh position={[index % 2 ? -1.5 : 1.3, 3.5, 0]} castShadow>
                  <boxGeometry args={[1.2, 1.4 + index * 0.3, 3.8]} />
                  <Surf color="#a89880" />
                </mesh>
              </group>
            ))}
        </>
      )}
      {district.id === 'riverworks' && (
        <>
          <Ribbon points={[[-9, -18], [-5, -10], [0, -3], [2, 5], [10, 16]]} width={7} y={0.12} color={P.wet} />
          <Ribbon points={[[-9, -18], [-5, -10], [0, -3], [2, 5], [10, 16]]} width={4.6} y={0.2} color={P.water} />
          <Waterwheel night={night} />
          <group position={[1.2, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            {[1.1, 1.8, 2.5].map((radius, index) => (
              <mesh key={radius}>
                <ringGeometry args={[radius, radius + 0.16, 18]} />
                <meshBasicMaterial color={index === 1 ? '#ffffff' : P.waterLight} transparent opacity={0.72 - index * 0.16} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
          <mesh position={[1, 1, 8]} rotation={[0, -0.12, 0]} castShadow>
            <boxGeometry args={[10, 0.35, 2.3]} />
            <Surf color={P.deck} />
          </mesh>
          {[
            [-17, -11, -0.28, 7, 3.4],
            [-16, -2, 0.18, 5.5, 4.4],
            [-13, 8, -0.5, 8, 3.2],
            [13, -13, 0.38, 6.5, 4],
            [15, -3, -0.15, 8.5, 3.3],
            [16, 8, 0.52, 6, 4.5],
            [-4, 15, -0.32, 7.5, 3.5],
            [9, 17, 0.2, 5.5, 3.8],
          ]
            .slice(0, population.primary)
            .map(([x, z, rotation, width, depth], index) => (
              <group key={`farm-${index}`} position={[x, 0, z]} rotation={[0, rotation, 0]}>
                <mesh position={[0, 0.18, 0]} receiveShadow scale={[width * 0.5, 0.28, depth * 0.5]}>
                  <dodecahedronGeometry args={[1, 0]} />
                  <Surf color={index % 2 ? P.groundAlt : '#7fae54'} />
                </mesh>
                <mesh position={[0, 0.45, -depth * 0.48]} castShadow>
                  <boxGeometry args={[width * 0.9, 0.55, 0.32]} />
                  <Surf color={index % 2 ? '#477947' : '#557f42'} />
                </mesh>
                <mesh position={[width * 0.46, 0.4, 0]} castShadow>
                  <boxGeometry args={[0.3, 0.5, depth * 0.78]} />
                  <Surf color="#4f7f45" />
                </mesh>
                {[-0.3, 0.1, 0.36].map((offset, plant) => (
                  <mesh key={plant} position={[offset * width, 0.75, (plant % 2 - 0.5) * depth * 0.35]}>
                    <coneGeometry args={[0.45, 1.2, 5]} />
                    <Surf color={plant % 2 ? '#356f48' : '#4f8a4a'} />
                  </mesh>
                ))}
              </group>
            ))}
          {[
            [9, -7, 0.35],
            [13, 3, -0.28],
            [-10, 13, 0.5],
            [6, 15, -0.15],
          ]
            .slice(0, population.secondary)
            .map(([x, z, rotation], index) => (
              <group key={`shed-${index}`} position={[x, 0, z]} rotation={[0, rotation, 0]}>
                <mesh position={[0, 1.5, 0]} castShadow>
                  <boxGeometry args={[4.4 + index * 0.4, 3, 3.7]} />
                  <Surf color={index % 2 ? '#75513a' : '#81593e'} />
                </mesh>
                <mesh position={[0, 3.3, 0]} rotation={[0, Math.PI / 4, 0]}>
                  <coneGeometry args={[3.2, 1.35, 4]} />
                  <Surf color={index % 2 ? '#496f3f' : P.canopyDark} />
                </mesh>
              </group>
            ))}
          <group position={[-1, 0.2, 10]}>
            <Reeds count={12} />
          </group>
        </>
      )}
      {population.lamps &&
        [
          [-15, -10],
          [13, -7],
          [-8, 14],
          [16, 12],
        ].map(([x, z], index) => (
          <group key={`lamp-${index}`} position={[x + (rng() - 0.5) * 2, 0, z + (rng() - 0.5) * 2]}>
            <mesh position={[0, 2.2, 0]}>
              <cylinderGeometry args={[0.06, 0.1, 4.4, 5]} />
              <Surf color={P.bark} />
            </mesh>
            <mesh position={[0, 4.5, 0]}>
              <octahedronGeometry args={[0.32, 0]} />
              <Glow color={P.window} on={night} intensity={1.5} />
            </mesh>
          </group>
        ))}
      {[
        [-20, -17, 0.55],
        [20, -16, 0.7],
        [-24, 12, 0.48],
        [23, 15, 0.62],
      ].map(([x, z, scale], index) => (
        <group key={`vegetation-${index}`} position={[x, 0, z]} scale={scale} rotation={[0, index * 1.3, 0]}>
          <JungleTree height={11 + (index % 2) * 3} broad={0.7} night={night} />
        </group>
      ))}
    </group>
  )
}

function RootCrownShrine({ stage, night }: { stage: LandmarkStage; night: boolean }) {
  const s = stage === 'stake' ? 0 : stage === 's1' ? 1 : stage === 's2' ? 2 : 3
  return (
    <group position={[L.headland.center[0], 0.25, L.headland.center[1]]}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[5.7, 6.3, 1.3, 6]} />
        <Surf color={P.ruin} />
      </mesh>
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => (
        <mesh
          key={angle}
          position={[Math.cos(angle) * 3.4, 4.2, Math.sin(angle) * 3.4]}
          rotation={[Math.sin(angle) * 0.2, 0, -Math.cos(angle) * 0.2]}
          castShadow
        >
          <cylinderGeometry args={[0.65, 1.05, 8, 7]} />
          <Surf color={P.bark} />
        </mesh>
      ))}
      {s >= 2 && (
        <>
          <mesh position={[0, 7.4, 0]} castShadow>
            <cylinderGeometry args={[5.9, 6.2, 0.5, 14]} />
            <Surf color={P.deck} />
          </mesh>
          <mesh position={[0, 10.5, 0]} castShadow>
            <cylinderGeometry args={[3.6, 4.1, 6, 7]} />
            <Surf color="#775139" />
          </mesh>
        </>
      )}
      {s >= 3 && (
        <>
          <mesh position={[0, 18, 0]} scale={[1.55, 0.55, 1.2]} castShadow>
            <dodecahedronGeometry args={[5.4, 0]} />
            <Surf color={P.canopy} />
          </mesh>
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index / 12) * Math.PI * 2
            return (
              <mesh key={index} position={[Math.cos(angle) * 5.2, 8.2, Math.sin(angle) * 5.2]}>
                <sphereGeometry args={[0.22, 6, 5]} />
                <Glow color={P.window} on={night} intensity={1.6} />
              </mesh>
            )
          })}
        </>
      )}
    </group>
  )
}

function Terrain({ night }: { night: boolean }) {
  const riverWet = useMemo(() => ribbonGeometry(L.hydrology.river, L.hydrology.wetWidth, 0.02), [])
  const riverCore = useMemo(() => ribbonGeometry(L.hydrology.river, L.hydrology.riverWidth, 0.08), [])
  const vegetation = [
    [-122, -42, 0.75],
    [-108, 42, 0.65],
    [-34, -92, 0.72],
    [61, -72, 0.62],
    [110, -44, 0.7],
    [128, 12, 0.6],
    [-126, 78, 0.58],
  ] as const
  const groundClusters = [
    [-116, -8, 0],
    [-104, 27, 1],
    [-48, -72, 2],
    [53, -63, 3],
    [113, -13, 4],
    [116, 66, 5],
    [-124, 94, 6],
    [34, 92, 7],
  ] as const
  return (
    <group>
      <mesh position={[0, -0.55, 100]} receiveShadow>
        <boxGeometry args={[900, 1.1, 1100]} />
        <Surf color={night ? '#294a38' : P.ground} />
      </mesh>
      <Ribbon points={L.hydrology.river} width={19} y={0.005} color={night ? '#315f43' : '#609b58'} />
      <mesh geometry={riverWet} receiveShadow>
        <Surf color={P.wet} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={riverCore} receiveShadow>
        <Surf color={night ? P.waterNight : P.water} side={THREE.DoubleSide} />
      </mesh>
      {[
        [65, 24, 35, 0.18, 29, P.wet],
        [86, 33, 26, 0.18, 22, P.wet],
        [51, 29, 21, 0.16, 18, P.wet],
        [66, 24, 30, 0.22, 25, night ? P.waterNight : P.water],
        [86, 32, 22, 0.22, 18, night ? P.waterNight : P.water],
        [53, 30, 17, 0.2, 15, night ? P.waterNight : P.water],
        [72, 27, 22, 0.24, 17, night ? '#2c7073' : P.waterLight],
      ].map(([x, z, sx, sy, sz, color], index) => (
        <mesh key={`lagoon-lobe-${index}`} position={[x as number, 0.08 + index * 0.01, z as number]} rotation={[0, index * 0.37, 0]} scale={[sx as number, sy as number, sz as number]} receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <Surf color={color as string} />
        </mesh>
      ))}
      <mesh position={[22, 7.2, -118]} castShadow receiveShadow scale={[16, 4.8, 4]}>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color="#617c55" />
      </mesh>
      <mesh position={[22, 4.2, -108]} castShadow receiveShadow scale={[13, 3.1, 4.5]}>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color="#71895c" />
      </mesh>
      <mesh position={[22, 2, -98]} castShadow receiveShadow scale={[11, 1.5, 4.8]}>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color="#85926a" />
      </mesh>
      <mesh position={[22, 8.2, -113.3]}>
        <planeGeometry args={[10, 12]} />
        <Surf color="#f2fff1" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[22, 4.1, -103.3]}>
        <planeGeometry args={[11, 7]} />
        <Surf color={P.waterLight} side={THREE.DoubleSide} />
      </mesh>
      {[
        [8, -118, 1.3],
        [36, -116, 1.1],
        [7, -103, 0.85],
        [38, -99, 0.9],
      ].map(([x, z, scale], index) => (
        <mesh key={`fall-rock-${index}`} position={[x, 1.1 * scale, z]} rotation={[0, index * 0.8, 0]} scale={scale}>
          <dodecahedronGeometry args={[2.4, 0]} />
          <Surf color={index % 2 ? '#71895c' : '#617c55'} />
        </mesh>
      ))}
      <mesh position={[L.headland.center[0], 0.08, L.headland.center[1]]} rotation={[0, 0.35, 0]} scale={[18, 0.35, 22]} receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={night ? '#3d5b42' : '#8c9361'} />
      </mesh>
      <Ribbon points={[[84, 46], [92, 59], [102, 67]]} width={3.1} y={0.24} color={P.deck} />
      <Ribbon points={[[-82, 54], [-71, 35], [-63, 11], [-54, -12]]} width={6.2} y={0.035} color={night ? '#31563e' : '#609854'} />
      <Ribbon points={[[-45, -22], [-23, -34], [-4, -40], [10, -48]]} width={5.8} y={0.035} color={night ? '#31563e' : '#609854'} />
      <Ribbon points={[[25, 68], [44, 62], [54, 52], [62, 44]]} width={5.8} y={0.035} color={night ? '#31563e' : '#609854'} />
      <Ribbon points={[[-82, 54], [-71, 35], [-63, 11], [-54, -12]]} width={3.8} y={0.1} color={P.path} />
      <Ribbon points={[[-45, -22], [-23, -34], [-4, -40], [10, -48]]} width={3.4} y={0.1} color={P.path} />
      <Ribbon points={[[25, 68], [44, 62], [54, 52], [62, 44]]} width={3.4} y={0.1} color={P.path} />
      {L.bridges.map((bridge) => (
        <RopeBridge key={bridge.id} a={bridge.a} b={bridge.b} y={2.4} />
      ))}
      {vegetation.map(([x, z, scale], index) => (
        <group key={`wild-${index}`} position={[x, 0, z]} scale={scale} rotation={[0, index * 0.9, 0]}>
          <JungleTree height={13 + (index % 3) * 2} broad={0.72} night={night} />
          <group position={[5, 0, 2]}>
            <JungleTree height={9 + (index % 2) * 2} broad={0.55} night={night} />
          </group>
          <group position={[-4, 0.1, 4]}>
            <Reeds count={6} />
          </group>
        </group>
      ))}
      {groundClusters.map(([x, z, variant]) => (
        <group key={`ground-detail-${variant}`} position={[x, 0.08, z]} scale={0.8 + (variant % 3) * 0.12}>
          <GroundCluster variant={variant} />
        </group>
      ))}
      {[
        [48, 49],
        [57, 55],
        [96, 18],
        [102, 30],
      ].map(([x, z], index) => (
        <group key={`lagoon-reed-${index}`} position={[x, 0.2, z]} rotation={[0, index * 0.7, 0]}>
          <Reeds count={10} />
        </group>
      ))}
    </group>
  )
}

function Mist() {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.children.forEach((child, index) => {
      child.position.x += Math.sin(clock.elapsedTime * 0.25 + index) * 0.003
      child.position.y = 3 + index * 1.2 + Math.sin(clock.elapsedTime * 0.4 + index) * 0.5
    })
  })
  return (
    <group ref={group}>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} position={[15 + index * 3.2, 3 + index, -103 + (index % 3) * 2]} scale={[3.6, 1.2, 2.4]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#e5f5e8" transparent opacity={0.24} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function BirdEvent({ seed }: { seed: number }) {
  const group = useRef<THREE.Group>(null)
  const schedule = useMemo(() => birdSchedule(seed), [seed])
  useFrame(({ clock }) => {
    if (!group.current) return
    const cycle = schedule[schedule.length - 1].startAt + schedule[schedule.length - 1].duration
    const time = clock.elapsedTime % cycle
    const event = schedule.find((candidate) => time >= candidate.startAt && time < candidate.startAt + candidate.duration)
    group.current.visible = Boolean(event)
    if (!event) return
    const t = (time - event.startAt) / event.duration
    group.current.position.set(-95 + t * 190, event.altitude + Math.sin(t * Math.PI) * 8, 40 - t * 95)
    group.current.rotation.y = Math.sin(t * Math.PI * 2) * 0.2
  })
  return (
    <group ref={group} visible={false}>
      {Array.from({ length: 11 }, (_, index) => (
        <group key={index} position={[-index * 1.8, (index % 3) * 0.8, Math.abs(index - 5) * 0.7]}>
          <mesh rotation={[0, 0, 0.45]}>
            <coneGeometry args={[0.22, 1.1, 3]} />
            <Surf color={P.ink} />
          </mesh>
          <mesh rotation={[0, 0, -0.45]}>
            <coneGeometry args={[0.22, 1.1, 3]} />
            <Surf color={P.ink} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function WaterEvent() {
  const rings = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!rings.current) return
    rings.current.children.forEach((child, index) => {
      const k = (clock.elapsedTime * 0.35 + index / 3) % 1
      child.scale.setScalar(1 + k * 5)
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      material.opacity = (1 - k) * 0.65
    })
  })
  return (
    <group ref={rings} position={[82, 0.34, 32]} rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: 3 }, (_, index) => (
        <mesh key={index}>
          <ringGeometry args={[0.8, 1.1, 20]} />
          <meshBasicMaterial color="#dff9e9" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function DioramaFog({ mist }: { mist: boolean }) {
  const scene = useThree((store) => store.scene)
  const center = useMemo(() => new THREE.Vector3(0, 4, 0), [])
  useFrame(({ camera }) => {
    const fog = scene.fog as THREE.Fog | null
    if (!fog) return
    const distance = camera.position.distanceTo(center)
    const near = distance + (mist ? 28 : 58)
    const far = distance + (mist ? 190 : 245)
    fog.near += (near - fog.near) * 0.12
    fog.far += (far - fog.far) * 0.12
  })
  return null
}

function Residents({ state, districts }: { state: JungleState; districts: SeededDistrict[] }) {
  const spots = useMemo(() => {
    const rng = seeded(state.seed * 13 + 5)
    return Array.from({ length: state.residents }, (_, index) => {
      const district = districts[index % districts.length]
      const angle = rng() * Math.PI * 2
      const radius = 4 + rng() * 10
      return {
        x: district.center[0] + Math.cos(angle) * radius,
        z: district.center[1] + Math.sin(angle) * radius,
        phase: rng() * Math.PI * 2,
      }
    })
  }, [districts, state.residents, state.seed])
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.children.forEach((child, index) => {
      const spot = spots[index]
      const t = clock.elapsedTime * 0.32 + spot.phase
      child.position.x = spot.x + Math.sin(t) * 4.5
      child.position.z = spot.z + Math.sin(t * 2 + 0.5) * 3.2
      child.position.y = Math.abs(Math.sin(clock.elapsedTime * 5.2 + spot.phase)) * 0.16
      child.rotation.y = Math.atan2(Math.cos(t) * 4.5, Math.cos(t * 2 + 0.5) * 6.4)
    })
  })
  const scale = L.creature.scale
  return (
    <group ref={group}>
      {spots.map((spot, index) => (
        <group key={index} position={[spot.x, 0, spot.z]} scale={scale}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <dodecahedronGeometry args={[0.55, 1]} />
            <Surf color={index % 2 ? '#f5ddb5' : '#d9ead5'} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <icosahedronGeometry args={[0.42, 1]} />
            <Surf color="#f1c99e" />
          </mesh>
          <mesh position={[0, 1.95, 0]}>
            <coneGeometry args={[0.48, 0.8, 7]} />
            <Surf color={index % 3 === 0 ? P.coral : index % 3 === 1 ? P.gold : P.canopy} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Catastrophe({ state, districts }: { state: JungleState; districts: SeededDistrict[] }) {
  const district = districts.find((candidate) => candidate.id === state.catastrophe.districtId)
  const ring = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.y = clock.elapsedTime * 0.55
  })
  if (!district || state.catastrophe.phase === 'calm') return null
  const overgrown = state.catastrophe.phase === 'overgrowth'
  return (
    <group position={[district.center[0], 0, district.center[1]]}>
      <group ref={ring}>
        {Array.from({ length: overgrown ? 18 : 10 }, (_, index) => {
          const angle = (index / (overgrown ? 18 : 10)) * Math.PI * 2
          const radius = overgrown ? 9 + (index % 3) * 4 : 15
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * radius, overgrown ? 4 + (index % 4) * 2 : 12 + (index % 3) * 2, Math.sin(angle) * radius]}
              rotation={[0.2, 0, angle]}
            >
              {overgrown ? <cylinderGeometry args={[0.18, 0.35, 10, 5]} /> : <dodecahedronGeometry args={[1.4, 0]} />}
              <Surf color={overgrown ? '#244c32' : '#527463'} />
            </mesh>
          )
        })}
      </group>
      {!overgrown && (
        <mesh position={[0, 22, 0]} scale={[8, 2, 6]}>
          <dodecahedronGeometry args={[1, 0]} />
          <Surf color="#36534a" />
        </mesh>
      )}
    </group>
  )
}

function JungleCamera({
  state,
  districts,
  onDiveEnd,
}: {
  state: JungleState
  districts: SeededDistrict[]
  onDiveEnd: () => void
}) {
  const controls = useRef<CameraControls>(null)
  const hasPose = useRef(false)
  const camera = useThree((store) => store.camera)
  const focused = districts.find((district) => district.id === state.focusDistrict)
  useEffect(() => {
    const control = controls.current
    if (!control) return
    const station = state.station
    const center: [number, number, number] =
      station === 'district' && focused
        ? [focused.center[0], 5.5, focused.center[1]]
        : station === 'district'
          ? [L.headland.center[0], 8, L.headland.center[1]]
        : station === 'resident' && focused
          ? [focused.center[0], 1.5, focused.center[1]]
          : [0, 4, 0]
    const distance =
      (station === 'resident' ? 10 : station === 'district' ? 74 : station === 'arrival' ? 205 : 270) *
      state.camera.dolly
    const pitch = (Math.min(40, Math.max(34, state.camera.pitchDeg)) * Math.PI) / 180
    const azimuth = (clampBiomeYaw(state.camera.azimuthDeg) * Math.PI) / 180
    const horizontal = Math.cos(pitch) * distance
    const position: [number, number, number] = [
      center[0] + Math.sin(azimuth) * horizontal,
      center[1] + Math.sin(pitch) * distance,
      center[2] + Math.cos(azimuth) * horizontal,
    ]
    if (state.diving) {
      void control.setLookAt(position[0] * 1.45, position[1] * 4.6, position[2] * 1.45, ...center, false)
      const frame = window.requestAnimationFrame(() => {
        void control.setLookAt(...position, ...center, true)
      })
      const timeout = window.setTimeout(onDiveEnd, 1800)
      return () => {
        window.cancelAnimationFrame(frame)
        window.clearTimeout(timeout)
      }
    }
    void control.setLookAt(...position, ...center, hasPose.current)
    hasPose.current = true
  }, [camera, districts, focused, onDiveEnd, state.camera, state.diving, state.station])
  return (
    <>
      <PerspectiveCamera makeDefault fov={state.camera.fov} near={0.3} far={900} position={[100, 90, 140]} />
      <CameraControls
        ref={controls}
        makeDefault
        minDistance={5}
        maxDistance={340}
        minPolarAngle={(50 * Math.PI) / 180}
        maxPolarAngle={(56 * Math.PI) / 180}
        minAzimuthAngle={(-35 * Math.PI) / 180}
        maxAzimuthAngle={(35 * Math.PI) / 180}
        truckSpeed={0}
        smoothTime={0.45}
      />
    </>
  )
}

interface JungleSceneProps {
  state: JungleState
  onDiveEnd: () => void
}

export function JungleScene({ state, onDiveEnd }: JungleSceneProps) {
  const districts = useMemo(() => seededDistricts(state.seed), [state.seed])
  const fraction = courseProgress(state.progress)
  const stage = landmarkStage(fraction)
  const sky = state.night ? P.skyNight : P.sky
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 320, 510]} />
      <DioramaFog mist={state.mist} />
      <hemisphereLight args={[state.night ? '#7fa6a0' : '#efffdc', state.night ? '#284638' : '#487447', state.night ? 1.1 : 1.05]} />
      <directionalLight
        position={state.night ? [-55, 74, 30] : [65, 105, 62]}
        intensity={state.night ? 1.7 : 2.25}
        color={state.night ? '#a6c8c6' : '#fff0c8'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
      />
      <Terrain night={state.night} />
      <HorizonCanopy fraction={fraction} night={state.night} />
      {districts.map((district) => (
        <group key={district.id}>
          <DistrictScene district={district} progress={state.progress[district.id] ?? 0} seed={state.seed} night={state.night} />
          {state.focusDistrict === district.id && (
            <Html position={[district.center[0], 18, district.center[1]]} center distanceFactor={32} className="region-label">
              <span>{district.name}</span>
            </Html>
          )}
        </group>
      ))}
      <RootCrownShrine stage={stage} night={state.night} />
      <Residents state={state} districts={districts} />
      <Catastrophe state={state} districts={districts} />
      {state.mist && <Mist />}
      {state.birds && <BirdEvent seed={state.seed} />}
      {state.waterEvent && <WaterEvent />}
      <JungleCamera state={state} districts={districts} onDiveEnd={onDiveEnd} />
      {state.pixel && <PixelComposer />}
    </>
  )
}
