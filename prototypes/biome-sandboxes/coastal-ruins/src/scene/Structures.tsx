import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  COASTAL_PALETTE as P,
  type BiomeLayout,
  type DistrictDef,
  type DistrictProgress,
  populationFor,
  seededDistrictPlan,
} from '../layout/biome-layout'
import {
  districtSlots,
  localPaths,
  propPlacements,
  visibleProps,
  type LocalPath,
  type Placement,
} from '../layout/terrain'
import { Surf } from '../render/materials'
import { Building, Prop } from './Props'

export const ruin = { districtId: null as string | null, amount: 0 }

function ribbonGeometry(points: Array<[number, number, number]>, width: number): THREE.BufferGeometry {
  const vertices: number[] = []
  const indices: number[] = []
  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]
    const dx = next[0] - previous[0]
    const dz = next[2] - previous[2]
    const length = Math.hypot(dx, dz) || 1
    const nx = (-dz / length) * width * 0.5
    const nz = (dx / length) * width * 0.5
    vertices.push(point[0] + nx, point[1], point[2] + nz, point[0] - nx, point[1], point[2] - nz)
    if (index > 0) {
      const start = (index - 1) * 2
      indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function PathRibbon({ path }: { path: LocalPath }) {
  const geometry = useMemo(() => ribbonGeometry(path.points, path.width), [path])
  const color = path.kind === 'submerged' ? P.cobalt : path.kind === 'quay' ? P.ruinDark : path.kind === 'stairs' ? P.road : P.roadEdge
  return (
    <mesh geometry={geometry} receiveShadow>
      <Surf color={color} transparent={path.kind === 'submerged'} opacity={path.kind === 'submerged' ? 0.72 : 1} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function Paths({ layout, seed }: { layout: BiomeLayout; seed: number }) {
  const paths = useMemo(() => localPaths(layout, seed), [layout, seed])
  return <group>{paths.map((path) => <PathRibbon key={path.districtId} path={path} />)}</group>
}

function WallLine({ points, height = 1.2, color = P.ruin }: { points: Array<[number, number]>; height?: number; color?: string }) {
  return (
    <group>
      {points.slice(1).map(([x, z], index) => {
        const previous = points[index]
        const dx = x - previous[0]
        const dz = z - previous[1]
        const length = Math.hypot(dx, dz)
        return (
          <mesh key={index} position={[(x + previous[0]) / 2, height / 2, (z + previous[1]) / 2]} rotation={[0, Math.atan2(dx, dz), 0]} castShadow receiveShadow>
            <boxGeometry args={[0.75, height, length + 0.4]} />
            <Surf color={color} />
          </mesh>
        )
      })}
    </group>
  )
}

function CivicStairs({ district, center }: { district: DistrictDef; center: [number, number] }) {
  return (
    <group position={[center[0], 2.4, center[1]]} rotation={[0, district.laneYaw, 0]}>
      {[
        { position: [-3, 0.15, 12], size: [41, 0.3, 9], color: '#ddd1ad' },
        { position: [2, 0.95, 0], size: [38, 1.6, 10], color: '#d5c39c' },
        { position: [-2, 1.75, -12], size: [34, 3.2, 10], color: '#cbb58b' },
      ].map((pad, index) => (
        <group key={index}>
          <mesh position={pad.position as [number, number, number]} castShadow receiveShadow>
            <boxGeometry args={pad.size as [number, number, number]} />
            <Surf color={pad.color} />
          </mesh>
          <mesh position={[pad.position[0], pad.position[1] + pad.size[1] / 2 + 0.12, pad.position[2] + pad.size[2] / 2 - 0.3]} castShadow>
            <boxGeometry args={[pad.size[0] + 0.8, 0.45, 0.65]} />
            <Surf color={P.ruin} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 15 }, (_, index) => {
        const x = (index % 3 === 1 ? 1 : -1) * (2.3 + (index % 2) * 0.6)
        const z = (index - 7) * 2.15
        return (
          <mesh key={index} position={[x, 0.22 + index * 0.16, z]} castShadow receiveShadow>
            <boxGeometry args={[5.8, 0.42, 1.9]} />
            <Surf color={index % 4 === 0 ? '#dfe8e6' : P.road} />
          </mesh>
        )
      })}
      <WallLine points={[[-18, 8], [-12, 5], [-5, 7], [3, 5], [12, 7], [18, 4]]} height={1.1} />
      <WallLine points={[[-15, -5], [-8, -7], [0, -5], [8, -8], [15, -6]]} height={1.4} color={P.roadEdge} />
      <group position={[-11, 1.8, 8]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <boxGeometry args={[10, 0.28, 5.5]} />
          <Surf color={P.vine} />
        </mesh>
        {[-4.3, 4.3].flatMap((x) => [-2.2, 2.2].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.9, z]}>
            <cylinderGeometry args={[0.1, 0.14, 1.8, 5]} />
            <Surf color={P.ruinDark} />
          </mesh>
        )))}
      </group>
    </group>
  )
}

function ExcavationRidge({ center, yaw }: { center: [number, number]; yaw: number }) {
  const columns = [
    [-16, -2, 6.8, -0.08], [-10, 0, 4.5, 0.16], [-2, -1, 7.8, -0.04], [8, 1, 3.2, 0.24], [15, -2, 6.1, -0.13],
  ] as const
  return (
    <group position={[center[0], 2.4, center[1]]} rotation={[0, yaw, 0]}>
      <mesh position={[-1, 0.35, 0]} rotation={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[40, 0.7, 13]} />
        <Surf color={P.roadEdge} />
      </mesh>
      <mesh position={[-2, 0.75, -0.8]} receiveShadow>
        <boxGeometry args={[30, 0.35, 7]} />
        <Surf color="#ddd0ad" />
      </mesh>
      {columns.map(([x, z, height, lean], index) => (
        <group key={index} position={[x, 0.9, z]} rotation={[0, index * 0.16, lean]}>
          <mesh position={[0, height / 2, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.86, height, 8]} />
            <Surf color={index % 2 ? P.roadEdge : P.ruin} />
          </mesh>
          {index !== 3 && (
            <mesh position={[0, height + 0.2, 0]} rotation={[0, index * 0.37, 0]}>
              <boxGeometry args={[2.2, 0.45, 1.7]} />
              <Surf color={P.roadEdge} />
            </mesh>
          )}
        </group>
      ))}
      {[-12, 2, 12].map((x, index) => (
        <mesh key={x} position={[x, 1.1, 5 + index * 0.6]} rotation={[0, 0, Math.PI / 2 + index * 0.1]} castShadow>
          <cylinderGeometry args={[0.72, 0.72, 3.1 - index * 0.35, 8]} />
          <Surf color={P.ruin} />
        </mesh>
      ))}
      {[[-13, -7, 10, 3.2], [2, -7, 8, 2.7], [13, 6, 7, 2.4]].map(([x, z, width, depth], index) => (
        <mesh key={index} position={[x, 0.56, z]} receiveShadow>
          <boxGeometry args={[width, 0.5, depth]} />
          <Surf color={index % 2 ? '#bcae8c' : P.ruinDark} />
        </mesh>
      ))}
      <group position={[-6, 0, 8]}>
        {[-4.2, 4.2].flatMap((x) => [-2.2, 2.2].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 2, z]}>
            <cylinderGeometry args={[0.08, 0.11, 4, 5]} />
            <Surf color={P.ruinDark} />
          </mesh>
        )))}
        <mesh position={[0, 3.8, 0]} rotation={[0, 0, -0.08]} castShadow>
          <boxGeometry args={[9.6, 0.18, 5.4]} />
          <Surf color={P.cobalt} />
        </mesh>
      </group>
      <group position={[13, 0, -8]}>
        {[-2.2, 0, 2.2].map((x) => (
          <mesh key={x} position={[x, 2.4, 0]}>
            <boxGeometry args={[0.13, 4.8, 0.13]} />
            <Surf color={P.ruinDark} />
          </mesh>
        ))}
        {[1.1, 2.6, 4.1].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[5.2, 0.13, 0.13]} />
            <Surf color={P.ruinDark} />
          </mesh>
        ))}
      </group>
      <mesh position={[19, 0.45, 4]} rotation={[0, 0.5, 0]}>
        <dodecahedronGeometry args={[1.3, 0]} />
        <Surf color={P.ruinDark} />
      </mesh>
    </group>
  )
}

function ContourTerraces({ center, yaw }: { center: [number, number]; yaw: number }) {
  return (
    <group position={[center[0], 3.35, center[1]]} rotation={[0, yaw, 0]}>
      <WallLine points={[[-22, 10], [-15, 6], [-7, 8], [1, 5], [10, 7], [20, 2]]} height={1.5} color={P.cliff} />
      <WallLine points={[[-18, 0], [-12, -4], [-2, -2], [7, -6], [17, -4], [22, -9]]} height={1.35} color={P.ruin} />
      <WallLine points={[[-14, -10], [-5, -13], [4, -11], [12, -15], [18, -13]]} height={1.15} color={P.roadEdge} />
      {[
        [-13, 0, 7, 5], [3, -5, 9, 5], [11, 7, 8, 4.5],
      ].map(([x, z, width, depth], index) => (
        <mesh key={index} position={[x, -0.05 - index * 0.18, z]} receiveShadow>
          <boxGeometry args={[width, 0.32, depth]} />
          <Surf color={index === 1 ? '#cdb98f' : '#ddd0aa'} />
        </mesh>
      ))}
      <group position={[5, 1.2, -2]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[2.8, 3.2, 2.2, 12]} />
          <Surf color={P.cobalt} />
        </mesh>
        <mesh position={[0, 2.25, 0]}>
          <torusGeometry args={[2.15, 0.25, 6, 16]} />
          <Surf color={P.plaster} />
        </mesh>
      </group>
      <group position={[-10, 0, 7]}>
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[2.1, 2.8, 3.6, 10]} />
          <Surf color={P.ochre} />
        </mesh>
        <mesh position={[0, 2, 2.05]}>
          <boxGeometry args={[1.1, 1.2, 0.2]} />
          <Surf color={P.ruinDark} />
        </mesh>
      </group>
      {[
        [-17, 1, 0.85], [-8, 3, 0.7], [0, -8, 0.8], [10, -2, 0.72], [16, 7, 0.82], [2, 9, 0.68],
      ].map(([x, z, scale], index) => (
        <group key={index} position={[x, 0, z]} scale={scale}>
          <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.12, 0.2, 2.2, 6]} /><Surf color={P.ruinDark} /></mesh>
          <mesh position={[0, 2.3, 0]} scale={[1.2, 0.65, 1]}><dodecahedronGeometry args={[1.2, 0]} /><Surf color={P.olive} /></mesh>
        </group>
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <mesh key={index} position={[-14 + (index % 5) * 6, 0.3, -6 + Math.floor(index / 5) * 8]} rotation={[0, index * 0.4, 0]}>
          <boxGeometry args={[3.8, 0.25, 0.45]} />
          <Surf color={index % 2 ? '#7f8a65' : '#92966f'} />
        </mesh>
      ))}
    </group>
  )
}

function DrownedForum({ center, yaw }: { center: [number, number]; yaw: number }) {
  return (
    <group position={[center[0], 0.02, center[1]]} rotation={[0, yaw, 0]}>
      {Array.from({ length: 25 }, (_, index) => {
        const x = (index % 5 - 2) * 4.2
        const z = (Math.floor(index / 5) - 2) * 4.2
        return (
          <mesh key={`pave-${index}`} position={[x, -0.48 + (index % 3) * 0.025, z]} rotation={[-Math.PI / 2, 0, (index % 4) * 0.03]}>
            <planeGeometry args={[3.7, 3.7]} />
            <meshBasicMaterial color={index % 4 === 0 ? '#7ebdc0' : index % 3 === 0 ? '#a89d85' : '#b9ae91'} transparent opacity={0.82} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
      {[
        [0.08, 1.2],
        [1.55, 1.0],
        [2.8, 1.15],
        [4.25, 0.85],
      ].map(([start, arc], index) => (
        <mesh key={index} position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, start]}>
          <torusGeometry args={[14, 1.15, 7, 24, arc]} />
          <Surf color={index % 2 ? P.ruinDark : P.ruin} />
        </mesh>
      ))}
      {[[-11, 7, 5.8, 0.1], [-4, -9, 3.4, -0.2], [8, -7, 6.6, 0.15], [12, 5, 2.8, -0.28]].map(([x, z, height, lean], index) => (
        <group key={index} position={[x, -0.35, z]} rotation={[0, index * 0.6, lean]}>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[1.4, 1.7, 0.6, 8]} /><Surf color={P.ruinDark} /></mesh>
          <mesh position={[0, height / 2 + 0.4, 0]}><cylinderGeometry args={[0.55, 0.78, height, 8]} /><Surf color={P.ruin} /></mesh>
        </group>
      ))}
      <group position={[-14, -0.2, -5]} rotation={[0, 0.3, 0]}>
        <mesh position={[0, 4.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[4.1, 0.65, 7, 16, Math.PI]} />
          <Surf color={P.ruin} />
        </mesh>
        <mesh position={[-4.1, 2, 0]}><boxGeometry args={[1.2, 4, 1.2]} /><Surf color={P.ruinDark} /></mesh>
        <mesh position={[4.1, 1.4, 0]} rotation={[0, 0, 0.18]}><boxGeometry args={[1.2, 2.8, 1.2]} /><Surf color={P.ruinDark} /></mesh>
      </group>
      <mesh position={[17, 0.5, 7]} rotation={[0, -0.45, 0]} castShadow>
        <boxGeometry args={[13, 0.7, 3.4]} />
        <Surf color={P.roadEdge} />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * 1.7
        return (
          <group key={`grass-${index}`} position={[Math.cos(angle) * (7 + index % 5), -0.2, Math.sin(angle) * (8 + index % 4)]} rotation={[0, angle, 0]}>
            {[0, 0.25, -0.25].map((x) => (
              <mesh key={x} position={[x, 0.55, 0]} rotation={[0, 0, x * 1.4]}><coneGeometry args={[0.12, 1.1, 4]} /><Surf color="#4f8878" /></mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

function WorkingQuay({ center, yaw, night }: { center: [number, number]; yaw: number; night: boolean }) {
  return (
    <group position={[center[0], 0, center[1]]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[42, 2, 6.5]} />
        <Surf color={P.ruinDark} />
      </mesh>
      <mesh position={[17.5, 1, 15]} castShadow receiveShadow>
        <boxGeometry args={[7, 2, 30]} />
        <Surf color={P.ruinDark} />
      </mesh>
      <mesh position={[-11, 0.75, 10]} castShadow receiveShadow>
        <boxGeometry args={[13, 1.5, 5]} />
        <Surf color={P.roadEdge} />
      </mesh>
      {Array.from({ length: 7 }, (_, index) => (
        <group key={index} position={[-17 + index * 5.7, 0, 0]}>
          <mesh position={[0, 2.7, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 5.4, 6]} />
            <Surf color={P.ink} />
          </mesh>
          {night && index % 2 === 0 && <pointLight position={[0, 4.8, 0]} color={P.window} intensity={2} distance={8} />}
        </group>
      ))}
      <group position={[-12, 1.8, 7]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 4.2, 0]}><boxGeometry args={[0.55, 8.4, 0.55]} /><Surf color={P.ruinDark} /></mesh>
        <mesh position={[3.8, 7.7, 0]} rotation={[0, 0, -0.62]}><boxGeometry args={[8.8, 0.45, 0.45]} /><Surf color={P.ruinDark} /></mesh>
        <mesh position={[7.1, 5.4, 0]}><cylinderGeometry args={[0.07, 0.07, 5.2, 5]} /><Surf color={P.ink} /></mesh>
        <mesh position={[7.1, 2.8, 0]}><boxGeometry args={[1.8, 1.1, 1.8]} /><Surf color={P.ochre} /></mesh>
      </group>
      {[-12, 1, 11].map((x, index) => (
        <group key={x} position={[x, 1.15, -3.5]}>
          <mesh rotation={[-Math.PI / 2, 0, index * 0.4]}><torusGeometry args={[2.1, 0.12, 5, 14]} /><Surf color="#b7a981" /></mesh>
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, index * 0.7]}><circleGeometry args={[1.8, 8]} /><meshBasicMaterial color="#c7b894" wireframe /></mesh>
        </group>
      ))}
      {Array.from({ length: 8 }, (_, index) => (
        <mesh key={`crate-${index}`} position={[-16 + (index % 4) * 2.3, 1.65 + Math.floor(index / 4) * 0.45, 4.2 + Math.floor(index / 4) * 2]} rotation={[0, index * 0.27, 0]} castShadow>
          <boxGeometry args={[1.5, 1.3, 1.4]} />
          <Surf color={index % 2 ? P.ochre : P.ruin} />
        </mesh>
      ))}
    </group>
  )
}

function Anchor({ layout, district, seed, night }: { layout: BiomeLayout; district: DistrictDef; seed: number; night: boolean }) {
  const placed = seededDistrictPlan(layout, seed)[district.id]
  const yaw = (placed.yawDeg * Math.PI) / 180
  switch (district.id) {
    case 'cliff-village':
      return <CivicStairs district={district} center={placed.center} />
    case 'archaeology-ridge':
      return <ExcavationRidge center={placed.center} yaw={yaw} />
    case 'dry-terraces':
      return <ContourTerraces center={placed.center} yaw={yaw} />
    case 'drowned-forum':
      return <DrownedForum center={placed.center} yaw={yaw} />
    case 'working-quay':
      return <WorkingQuay center={placed.center} yaw={yaw} night={night} />
  }
}

function Knockable({ placement, children }: { placement: Placement; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const sign = placement.index % 2 ? -1 : 1
  useFrame(() => {
    if (!group.current) return
    const amount = placement.knockable && ruin.districtId === placement.districtId ? ruin.amount : 0
    group.current.rotation.z = amount * sign * 1.15
    group.current.position.y = placement.position[1] - amount * 0.18
  })
  return (
    <group ref={group} position={placement.position} rotation={[0, placement.yaw, 0]}>
      {children}
    </group>
  )
}

export function Districts({
  layout,
  progress,
  seed,
  night,
  darkDistrict,
}: {
  layout: BiomeLayout
  progress: DistrictProgress
  seed: number
  night: boolean
  darkDistrict: string | null
}) {
  const slots = useMemo(() => new Map(layout.districts.map((district) => [district.id, districtSlots(layout, district, seed)])), [layout, seed])
  const placements = useMemo(() => propPlacements(layout, seed), [layout, seed])
  const visible = visibleProps(placements, layout, progress)
  return (
    <group>
      {layout.districts.map((district) => {
        const population = populationFor(district, progress[district.id] ?? 0)
        const lit = night && darkDistrict !== district.id
        return (
          <group key={district.id}>
            <Anchor layout={layout} district={district} seed={seed} night={night} />
            {(slots.get(district.id) ?? []).slice(0, population.buildings).map((slot) => (
              <group key={slot.index} position={slot.position} rotation={[0, slot.yaw, 0]}>
                {slot.overWater && (
                  <mesh position={[0, 0.5, 0]}>
                    <cylinderGeometry args={[0.18, 0.22, 2.2, 6]} />
                    <Surf color={P.ruinDark} />
                  </mesh>
                )}
                <Building kind={district.building} index={slot.index} lit={lit} />
              </group>
            ))}
            {visible.filter((placement) => placement.districtId === district.id).map((placement) => (
              <Knockable key={placement.index} placement={placement}>
                <Prop kind={placement.kind} lit={lit} />
              </Knockable>
            ))}
          </group>
        )
      })}
    </group>
  )
}
