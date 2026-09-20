import { useMemo } from 'react'
import * as THREE from 'three'
import { COASTAL_PALETTE as P, type BiomeLayout, type SkylineProfile, seeded } from '../layout/biome-layout'
import { fbm, sampleTerrain, seaStacks, type GroundMaterial } from '../layout/terrain'
import { Surf } from '../render/materials'

const SEGMENTS = 280

const DAY_COLORS: Record<GroundMaterial, string> = {
  sea: '#246f89',
  shallows: P.shallows,
  limestone: P.ground,
  terrace: '#ded2b1',
  'ruin-bed': '#58aeb8',
}

const NIGHT_COLORS: Record<GroundMaterial, string> = {
  sea: P.waterNight,
  shallows: P.shallowsNight,
  limestone: '#676e72',
  terrace: '#60686a',
  'ruin-bed': '#2f6f78',
}

export function Terrain({ layout, night }: { layout: BiomeLayout; night: boolean }) {
  const built = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(layout.worldExtent * 2, layout.worldExtent * 2, SEGMENTS, SEGMENTS)
    geometry.rotateX(-Math.PI / 2)
    const positions = geometry.attributes.position as THREE.BufferAttribute
    const samples = Array.from({ length: positions.count }, (_, index) => {
      const sample = sampleTerrain(layout, positions.getX(index), positions.getZ(index))
      positions.setY(index, sample.height)
      return sample
    })
    geometry.computeVertexNormals()
    return { geometry, samples }
  }, [layout])

  const geometry = useMemo(() => {
    const positions = built.geometry.attributes.position as THREE.BufferAttribute
    const normals = built.geometry.attributes.normal as THREE.BufferAttribute
    const colors = new Float32Array(positions.count * 3)
    const color = new THREE.Color()
    const palette = night ? NIGHT_COLORS : DAY_COLORS
    for (let index = 0; index < positions.count; index++) {
      const sample = built.samples[index]
      color.set(palette[sample.material])
      if (sample.material === 'limestone' || sample.material === 'terrace') {
        if (normals.getY(index) < 0.75) color.set(night ? P.cliffNight : P.cliff)
        else {
          const broad = fbm(positions.getX(index) * 0.025, positions.getZ(index) * 0.025)
          const grain = fbm(positions.getX(index) * 0.11, positions.getZ(index) * 0.11)
          color.offsetHSL(broad * 0.015, broad * 0.025, broad * 0.12 + grain * 0.035)
        }
      } else if (sample.material === 'ruin-bed') {
        color.offsetHSL(0, fbm(positions.getX(index) * 0.09, positions.getZ(index) * 0.09) * 0.08, fbm(positions.getX(index) * 0.04, positions.getZ(index) * 0.04) * 0.12)
      }
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    }
    built.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return built.geometry
  }, [built, night])

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <Surf color="#ffffff" vertexColors />
    </mesh>
  )
}

export function Water({ layout, night }: { layout: BiomeLayout; night: boolean }) {
  return (
    <group>
      <mesh position={[0, layout.seaLevel, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1800, 72]} />
        <Surf color={night ? P.waterNight : P.water} transparent opacity={0.78} />
      </mesh>
      <mesh position={[0, layout.seaLevel + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[520, 72]} />
        <meshBasicMaterial color={night ? '#1d5265' : '#3f97aa'} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

function coastPoints(layout: BiomeLayout): Array<{ x: number; z: number; yaw: number; length: number }> {
  const coast = layout.coastline.slice(11, 25)
  const points: Array<{ x: number; z: number; yaw: number; length: number }> = []
  for (let index = 1; index < coast.length; index++) {
    const a = coast[index - 1]
    const b = coast[index]
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    points.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), length })
  }
  return points
}

export function CoastFoam({ layout, night }: { layout: BiomeLayout; night: boolean }) {
  const points = useMemo(() => coastPoints(layout), [layout])
  return (
    <group>
      {points.map((point, index) => (
        <mesh key={index} position={[point.x, layout.seaLevel + 0.09, point.z]} rotation={[-Math.PI / 2, 0, -point.yaw]}>
          <planeGeometry args={[1.1, point.length]} />
          <meshBasicMaterial color={night ? '#85aeb4' : '#f8f2df'} transparent opacity={0.7} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function patchGeometry(points: Array<[number, number]>): THREE.BufferGeometry {
  const vertices = points.flatMap(([x, z]) => [x, 0, z])
  const indices: number[] = []
  for (let index = 1; index < points.length - 1; index++) indices.push(0, index, index + 1)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function GroundPatch({ points, color, y = 2.48 }: { points: Array<[number, number]>; color: string; y?: number }) {
  const geometry = useMemo(() => patchGeometry(points), [points])
  return (
    <mesh geometry={geometry} position={[0, y, 0]} receiveShadow>
      <Surf color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}

function OliveTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 2.4, 6]} />
        <Surf color="#76604d" />
      </mesh>
      {[[0, 2.5, 0, 1.2], [0.75, 2.15, 0.15, 0.82], [-0.65, 2.1, -0.2, 0.76]].map(([x, y, z, radius], index) => (
        <mesh key={index} position={[x, y, z]} scale={[1.25, 0.7, 1]} castShadow>
          <dodecahedronGeometry args={[radius, 0]} />
          <Surf color={index === 0 ? P.olive : '#87936c'} />
        </mesh>
      ))}
    </group>
  )
}

function StoneCluster({ position, yaw, scale = 1 }: { position: [number, number, number]; yaw: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      {[[0, 0.65, 0, 1.15], [1.35, 0.4, 0.4, 0.72], [-1.05, 0.34, 0.7, 0.62]].map(([x, y, z, radius], index) => (
        <mesh key={index} position={[x, y, z]} scale={[1.25, 0.75, 1]} castShadow receiveShadow>
          <dodecahedronGeometry args={[radius, 0]} />
          <Surf color={index === 0 ? P.roadEdge : P.ruin} />
        </mesh>
      ))}
    </group>
  )
}

function GrassTuft({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {[-0.35, 0, 0.35].map((x, index) => (
        <mesh key={x} position={[x, 0.38 + index * 0.08, 0]} rotation={[0, 0, (index - 1) * 0.28]}>
          <coneGeometry args={[0.16, 0.8 + index * 0.12, 4]} />
          <Surf color={index === 1 ? '#89906b' : '#9c9a75'} />
        </mesh>
      ))}
    </group>
  )
}

/** Authored negative-space dressing: broad material seams, sparse olives, scrub, and limestone. */
export function CoastalDressing({ night }: { night: boolean }) {
  const stoneSpots: Array<[number, number, number, number]> = [
    [-74, 2.45, -66, 0.4], [-67, 2.45, -19, 1.2], [24, 2.45, -39, 2.1], [33, 2.45, -8, 0.7],
    [-73, 2.45, 28, 1.8], [31, 2.45, 35, 0.2], [116, 2.45, -18, 1.1], [-53, 2.45, 54, 2.5],
  ]
  const oliveSpots: Array<[number, number, number, number]> = [
    [-61, 2.45, -58, 0.85], [-58, 2.45, -48, 0.72], [17, 2.45, -61, 0.82], [27, 2.45, -53, 0.68],
    [35, 2.45, -31, 0.74], [-72, 2.45, 8, 0.78], [-62, 2.45, 16, 0.65], [34, 2.45, 16, 0.7],
  ]
  const grass = useMemo(() => {
    const rng = seeded(4409)
    return Array.from({ length: 38 }, (_, index) => ({
      position: [(-84 + rng() * 165), 2.46, (-70 + rng() * 122)] as [number, number, number],
      yaw: rng() * Math.PI * 2,
      show: index % 3 !== 0,
    })).filter((item) => item.show)
  }, [])
  const shade = night ? 0.7 : 1
  return (
    <group>
      <GroundPatch color={night ? '#5b5f5c' : '#d9cfad'} points={[[-82, -69], [-55, -75], [-42, -60], [-55, -42], [-86, -47]]} />
      <GroundPatch color={night ? '#5e615e' : '#ded5b8'} points={[[10, -67], [38, -70], [44, -48], [25, -35], [5, -44]]} />
      <GroundPatch color={night ? '#555d5c' : '#d3c6a0'} points={[[-82, -5], [-52, -10], [-42, 14], [-61, 30], [-89, 20]]} />
      <GroundPatch color={night ? '#596260' : '#e0d7bc'} points={[[18, -14], [48, -8], [51, 17], [33, 30], [12, 18]]} />
      {stoneSpots.map(([x, y, z, yaw], index) => <StoneCluster key={index} position={[x, y, z]} yaw={yaw} scale={0.75 + (index % 3) * 0.14} />)}
      {oliveSpots.map(([x, y, z, scale], index) => <OliveTree key={index} position={[x, y, z]} scale={scale} />)}
      {grass.map((item, index) => <GrassTuft key={index} position={item.position} yaw={item.yaw} />)}
      <mesh position={[-9, 2.5, -10]} rotation={[-Math.PI / 2, 0, 0.18]}>
        <planeGeometry args={[42, 2.4]} />
        <meshBasicMaterial color={P.roadEdge} transparent opacity={0.45 * shade} />
      </mesh>
    </group>
  )
}

function shoulderData(profile: SkylineProfile) {
  const rng = seeded(3401)
  const all = Array.from({ length: 9 }, (_, index) => ({
    x: -108 + index * 27 + (rng() - 0.5) * 4,
    z: -95 - Math.abs(index - 4) * 1.2 + (rng() - 0.5) * 3,
    width: 20 + rng() * 7,
    depth: 11 + rng() * 4,
    scale: 0.72 + rng() * 0.3,
    offset: (rng() - 0.5) * 5,
  }))
  const order = [4, 1, 7, 2, 6, 3, 5, 0, 8]
  return order.slice(0, profile.shoulders).map((index) => all[index])
}

function CliffShoulder({
  x,
  z,
  width,
  depth,
  height,
  offset,
  color,
}: {
  x: number
  z: number
  width: number
  depth: number
  height: number
  offset: number
  color: string
}) {
  return (
    <group position={[x, 2.4, z]}>
      <mesh position={[0, height * 0.24, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height * 0.48, depth]} />
        <Surf color={color} />
      </mesh>
      <mesh position={[offset * 0.45, height * 0.58, -1.2]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.72, height * 0.36, depth * 0.78]} />
        <Surf color="#c3b58f" />
      </mesh>
      <mesh position={[offset, height * 0.83, -2]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.42, height * 0.24, depth * 0.55]} />
        <Surf color={P.ground} />
      </mesh>
      <mesh position={[offset - width * 0.13, height * 0.78, depth * 0.28]} rotation={[0, 0.08, 0]}>
        <boxGeometry args={[width * 0.18, 0.55, 0.8]} />
        <Surf color={P.ruinDark} />
      </mesh>
    </group>
  )
}

function WatchVillage({ x, z, index, night }: { x: number; z: number; index: number; night: boolean }) {
  const height = 4.6 + (index % 2) * 1.2
  return (
    <group position={[x, 18.4, z]} rotation={[0, (index - 1.5) * 0.12, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[6.8, height, 5.4]} />
        <Surf color={night ? '#89847d' : P.plaster} />
      </mesh>
      <mesh position={[0, height + 0.2, 0]}>
        <boxGeometry args={[7.3, 0.4, 5.9]} />
        <Surf color={P.ruin} />
      </mesh>
      <mesh position={[0, height * 0.58, 2.74]}>
        <boxGeometry args={[1.1, 1.9, 0.15]} />
        <Surf color={night ? '#243543' : P.ink} />
      </mesh>
      <mesh position={[2.1, height + 2, -0.8]}>
        <cylinderGeometry args={[0.08, 0.11, 4, 5]} />
        <Surf color={P.ruinDark} />
      </mesh>
    </group>
  )
}

export function Escarpment({ profile, night }: { profile: SkylineProfile; night: boolean }) {
  const shoulders = useMemo(() => shoulderData(profile), [profile])
  const back = useMemo(() => {
    const rng = seeded(910)
    return Array.from({ length: 10 }, (_, index) => ({
      x: -135 + index * 30,
      z: -122 + (rng() - 0.5) * 6,
      height: 7 + rng() * 3,
      width: 26 + rng() * 7,
      depth: 10 + rng() * 4,
    }))
  }, [])
  return (
    <group>
      {Array.from({ length: 12 }, (_, index) => {
        const x = -137.5 + index * 25
        const height = 5.5 + (index % 4) * 0.55
        return (
          <mesh key={`foot-${index}`} position={[x, 2.4 + height / 2, -89 - (index % 3) * 1.2]} rotation={[0, (index % 2 ? 1 : -1) * 0.035, 0]} castShadow receiveShadow>
            <boxGeometry args={[27, height, 15 + (index % 2) * 2]} />
            <Surf color={night ? '#5d5753' : index % 3 === 1 ? '#b9a982' : P.horizon} />
          </mesh>
        )
      })}
      {shoulders.map((shoulder, index) => (
        <CliffShoulder
          key={index}
          x={shoulder.x}
          z={shoulder.z}
          width={shoulder.width}
          depth={shoulder.depth}
          height={profile.height * shoulder.scale}
          offset={shoulder.offset}
          color={night ? '#66594e' : index % 3 === 1 ? '#b5a47c' : P.horizon}
        />
      ))}
      {back.map((shoulder, index) => (
        <mesh
          key={`back-${index}`}
          position={[shoulder.x, shoulder.height / 2, shoulder.z]}
          rotation={[0, (index % 2 ? 1 : -1) * 0.06, 0]}
        >
          <boxGeometry args={[shoulder.width, shoulder.height, shoulder.depth]} />
          <Surf color={night ? '#394954' : P.horizonBack} transparent opacity={profile.secondRowOpacity} />
        </mesh>
      ))}
      {Array.from({ length: profile.slitMasses }, (_, index) => (
        <WatchVillage key={`watch-${index}`} x={[-91, -24, 48, 108][index]} z={-94 - (index % 2) * 5} index={index} night={night} />
      ))}
    </group>
  )
}

export function HorizonStacks({ night }: { night: boolean }) {
  const stacks = useMemo(seaStacks, [])
  return (
    <group>
      {stacks.map((stack, index) => (
        <mesh
          key={index}
          position={[stack.x, stack.height / 2 - 0.5, stack.z]}
          rotation={[0, stack.yaw, 0]}
          scale={[stack.radius, stack.height / 2, stack.radius * 0.8]}
          castShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <Surf color={night ? '#5f544d' : index % 2 ? P.ruin : P.horizon} />
        </mesh>
      ))}
    </group>
  )
}

export function GlobeMarker({ progress, night }: { progress: number; night: boolean }) {
  const tiers = progress < 0.33 ? 1 : progress < 0.67 ? 2 : 3
  const heights = [0, 2.8, 5.6]
  const radii = [16, 11.5, 7.5]
  return (
    <group>
      {Array.from({ length: tiers }, (_, index) => (
        <group key={index} position={[0, heights[index], 0]}>
          <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[radii[index], radii[index], 2.8, 12]} />
            <Surf color={night ? '#8a6d5c' : P.cliff} />
          </mesh>
          <mesh position={[0, 2.86, 0]} receiveShadow>
            <cylinderGeometry args={[radii[index] + 0.7, radii[index] + 0.7, 0.18, 12]} />
            <Surf color={night ? '#879097' : P.ground} />
          </mesh>
          {Array.from({ length: 6 }, (_, notch) => {
            const angle = (notch / 6) * Math.PI * 2
            return (
              <mesh key={notch} position={[Math.cos(angle) * radii[index], 2.72, Math.sin(angle) * radii[index]]}>
                <boxGeometry args={[2.4, 0.6, 1.2]} />
                <Surf color={night ? P.shallowsNight : P.shallows} />
              </mesh>
            )
          })}
        </group>
      ))}
      <group position={[0, heights[tiers - 1] + 3, 0]}>
        <group position={[-7, 0, -7]}>
          {[4.2, 6.2, 8, 5.2, 6.8].map((height, index) => (
            <mesh key={height} position={[(index - 2) * 1.4, height / 2, 0]} rotation={[0, index * 0.18, 0]} castShadow>
              <boxGeometry args={[1.2, height, 2.3]} />
              <Surf color={night ? (index % 2 ? '#87968f' : '#71817d') : index % 2 ? P.horizon : P.horizonBack} />
            </mesh>
          ))}
        </group>
        <mesh position={[6, 2.7, -1]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.7, 0.45, 5, 12, Math.PI * 1.45]} />
          <Surf color={night ? '#8b8274' : P.ruin} />
        </mesh>
        {tiers >= 2 && (
          <group position={[-5, 0, 7]}>
            <mesh position={[2.4, 0.35, 0]}><boxGeometry args={[5, 0.7, 1]} /><Surf color={night ? '#9a8a73' : P.ruinDark} /></mesh>
            <mesh position={[4.4, 0.35, 2]}><boxGeometry args={[1, 0.7, 4]} /><Surf color={night ? '#9a8a73' : P.ruinDark} /></mesh>
          </group>
        )}
        {tiers >= 3 && (
          <mesh position={[5, 1.2, -7]}>
            <cylinderGeometry args={[2, 2.2, 2.4, 12]} />
            <Surf color={night ? '#648ab2' : P.cobalt} />
          </mesh>
        )}
      </group>
    </group>
  )
}
