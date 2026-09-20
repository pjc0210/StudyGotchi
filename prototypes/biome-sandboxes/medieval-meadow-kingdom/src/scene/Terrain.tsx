import { useMemo } from 'react'
import * as THREE from 'three'
import {
  GREEN_CROWN,
  MEADOW_PALETTE as P,
  type GeneratedKingdom,
  type GreenCrownProfile,
  type Point2,
} from '../layout/biome-layout'
import { ambientPlacements, localLaneSegments, treePlacements } from '../layout/terrain'
import { Surf } from '../render/materials'
import { FlowerPatch, RoundTree } from './Props'

export function ribbonGeometry(points: Point2[], width: number, y: number): THREE.BufferGeometry {
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
      const base = (i - 1) * 2
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function Terrain({ layout, night }: { layout: GeneratedKingdom; night: boolean }) {
  const width = layout.worldSize[0] + 120
  const back = layout.diorama.backZ - 20
  const front = layout.diorama.foregroundZ
  const depth = front - back
  const centerZ = (front + back) / 2
  return (
    <group>
      <mesh position={[0, -0.32, centerZ]} receiveShadow>
        <boxGeometry args={[width, 0.64, depth]} />
        <Surf color={night ? '#405b48' : P.meadow} />
      </mesh>
      <mesh position={[0, -0.68, centerZ]} receiveShadow>
        <boxGeometry args={[width + 4, 0.18, depth + 4]} />
        <Surf color={P.meadowDark} />
      </mesh>
      {layout.preserves.map((preserve, preserveIndex) => {
        const [width, depth] = preserve.size
        const shape = new THREE.Shape()
        const points: Point2[] = [
          [-width * 0.46, -depth * 0.14],
          [-width * 0.34, -depth * 0.43],
          [width * 0.03, -depth * 0.5],
          [width * 0.4, -depth * 0.31],
          [width * 0.5, depth * 0.04],
          [width * 0.28, depth * 0.44],
          [-width * 0.08, depth * 0.5],
          [-width * 0.44, depth * 0.29],
        ]
        points.forEach(([x, z], index) => index === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z))
        shape.closePath()
        const geometry = new THREE.ShapeGeometry(shape)
        geometry.rotateX(-Math.PI / 2)
        return (
          <mesh
            key={preserve.id}
            geometry={geometry}
            position={[preserve.center[0], 0.015, preserve.center[1]]}
            rotation={[0, preserveIndex * 0.17, 0]}
            receiveShadow
          >
            <Surf color={night ? '#526d4d' : P.meadowLight} />
          </mesh>
        )
      })}
    </group>
  )
}

export function River({ layout, night }: { layout: GeneratedKingdom; night: boolean }) {
  const bank = useMemo(() => ribbonGeometry(layout.river, layout.wetBandWidth, 0.025), [layout])
  const water = useMemo(() => ribbonGeometry(layout.river, layout.riverWidth, 0.045), [layout])
  const tribBank = useMemo(() => ribbonGeometry(layout.tributary, 13, 0.03), [layout])
  const tributary = useMemo(() => ribbonGeometry(layout.tributary, 7, 0.05), [layout])
  return (
    <group>
      <mesh geometry={bank} receiveShadow>
        <Surf color={P.bank} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={tribBank} receiveShadow>
        <Surf color={P.bank} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={water} receiveShadow>
        <Surf color={night ? P.waterNight : P.water} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={tributary} receiveShadow>
        <Surf color={night ? P.waterNight : P.water} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function Roads({ layout }: { layout: GeneratedKingdom }) {
  const roads = useMemo(
    () =>
      [...layout.roads, ...localLaneSegments(layout)].flatMap((road) => [
        { id: `${road.id}-edge`, geometry: ribbonGeometry(road.points, road.width, 0.04), color: P.roadEdge },
        { id: road.id, geometry: ribbonGeometry(road.points, Math.max(0.9, road.width - 1.6), 0.055), color: P.road },
      ]),
    [layout],
  )
  return (
    <group>
      {roads.map((road) => (
        <mesh key={road.id} geometry={road.geometry} receiveShadow>
          <Surf color={road.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

export function Woodland({ layout, seed, night }: { layout: GeneratedKingdom; seed: number; night: boolean }) {
  const trees = useMemo(() => treePlacements(layout, seed), [layout, seed])
  return (
    <group>
      {trees.map((tree, index) => (
        <group key={index} position={tree.position} rotation={[0, tree.yaw, 0]}>
          <RoundTree scale={tree.scale} oak={tree.crown === 'oak'} />
          {night && index % 12 === 0 && <pointLight position={[0, 1.2, 0]} color={P.light} intensity={1.2} distance={6} />}
        </group>
      ))}
    </group>
  )
}

export function MeadowScatter({ layout, seed }: { layout: GeneratedKingdom; seed: number }) {
  const placements = useMemo(() => ambientPlacements(layout, seed), [layout, seed])
  return (
    <group>
      {placements.map((placement, index) => (
        <group key={index} position={placement.position} rotation={[0, placement.yaw, 0]} scale={placement.scale}>
          {placement.kind === 'flowers' ? (
            <FlowerPatch index={index} />
          ) : placement.kind === 'hay' ? (
            <mesh position={[0, 0.65, 0]} castShadow>
              <cylinderGeometry args={[0.7, 0.7, 1.3, 10]} />
              <Surf color={P.wheat} />
            </mesh>
          ) : placement.kind === 'reeds' ? (
            <group>
              {[-0.4, 0, 0.4].map((x) => (
                <mesh key={x} position={[x, 0.55 + Math.abs(x), 0]}>
                  <cylinderGeometry args={[0.035, 0.06, 1.1, 5]} />
                  <Surf color={P.bank} />
                </mesh>
              ))}
            </group>
          ) : (
            <mesh position={[0, 0.55, 0]} castShadow>
              <dodecahedronGeometry args={[0.8, 0]} />
              <Surf color={P.limestoneShade} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

export function GreenCrown({ profile, night }: { profile: GreenCrownProfile; night: boolean }) {
  const active = GREEN_CROWN.slice(0, profile.crowns)
  return (
    <group>
      {active.map((crown, index) => {
        if (crown.row === 2 && !profile.secondRow) return null
        const wingFade = 1 - (Math.abs(crown.position[0]) / 132) * 0.28
        const baseHeight = profile.height * (crown.row === 1 ? 0.7 : 0.92) * (0.82 + (index % 5) * 0.045) * wingFade
        const limestone = profile.limestoneShoulders > 0 && crown.kind === 'limestone'
        const oak = profile.oakHeight > 0 && crown.kind === 'oak'
        const hillRadius = Math.max(3.2, baseHeight * 0.34)
        return (
          <group key={crown.id} position={[crown.position[0], 0, crown.position[1]]} rotation={[0, crown.phase * Math.PI * 2, 0]}>
            <mesh position={[0, hillRadius * 0.42 - 0.2, 0]} scale={[2.25, 0.72, 1.5]} castShadow receiveShadow>
              <dodecahedronGeometry args={[hillRadius, 1]} />
              <Surf color={limestone ? P.limestoneShade : night ? '#36503d' : P.meadowDark} />
            </mesh>
            {limestone ? (
              <mesh position={[0, hillRadius * 0.9, 0]} scale={[1.7, 0.7, 1.05]} castShadow>
                <dodecahedronGeometry args={[hillRadius * 0.72, 0]} />
                <Surf color={P.limestone} />
              </mesh>
            ) : (
              <group position={[0, hillRadius * 0.36, 0]}>
                <RoundTree scale={oak ? profile.oakHeight / 9 : Math.max(0.9, baseHeight / 8.6)} oak={oak} />
                {!oak && (
                  <>
                    <group position={[-hillRadius * 1.05, -0.1, 0.6]}>
                      <RoundTree scale={Math.max(0.7, baseHeight / 11)} />
                    </group>
                    <group position={[hillRadius * 1.0, -0.1, -0.5]}>
                      <RoundTree scale={Math.max(0.65, baseHeight / 12)} />
                    </group>
                  </>
                )}
              </group>
            )}
          </group>
        )
      })}
    </group>
  )
}
