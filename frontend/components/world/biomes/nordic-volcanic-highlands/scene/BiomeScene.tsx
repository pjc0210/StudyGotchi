import { useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  NORDIC_PALETTE as P,
  type BiomeLayout,
  type DistrictProgress,
  type GeneratedDistrict,
  type LandmarkStage,
  type Point,
  courseProgress,
  fogRange,
  generateDistricts,
  landmarkStage,
  populationFor,
  seeded,
  volcanoProfile,
} from '../layout/biome-layout'
import { CameraRig } from '../camera/CameraRig'
import { PixelComposer } from '../render/PixelComposer'
import { Surf } from '../render/materials'
import type { CatastropheState, LabState } from '../state'

function Beam({ a, b, radius = 0.22, color = P.cream }: { a: THREE.Vector3Tuple; b: THREE.Vector3Tuple; radius?: number; color?: string }) {
  const { midpoint, length, quaternion } = useMemo(() => {
    const start = new THREE.Vector3(...a)
    const end = new THREE.Vector3(...b)
    const direction = end.clone().sub(start)
    return {
      midpoint: start.clone().add(end).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    }
  }, [a, b])
  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 6]} />
      <Surf color={color} />
    </mesh>
  )
}

function LandPlate({ points, color }: { points: Point[]; color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], points[0][1])
    for (const point of points.slice(1)) shape.lineTo(point[0], point[1])
    shape.closePath()
    const built = new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: true, bevelSize: 1.4, bevelThickness: 0.8, bevelSegments: 1 })
    built.rotateX(Math.PI / 2)
    return built
  }, [points])
  return (
    <mesh geometry={geometry} position={[0, 3, 0]} receiveShadow castShadow>
      <Surf color={color} />
    </mesh>
  )
}

function FlatShape({ points, y, color }: { points: Point[]; y: number; color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], points[0][1])
    for (const point of points.slice(1)) shape.lineTo(point[0], point[1])
    shape.closePath()
    const built = new THREE.ShapeGeometry(shape)
    built.rotateX(Math.PI / 2)
    return built
  }, [points])
  return (
    <mesh geometry={geometry} position={[0, y, 0]} receiveShadow>
      <Surf color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Boulder({ position, scale, color = P.basalt, rotation = 0 }: {
  position: THREE.Vector3Tuple
  scale: THREE.Vector3Tuple
  color?: string
  rotation?: number
}) {
  return (
    <mesh position={position} scale={scale} rotation={[0.08, rotation, -0.05]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <Surf color={color} />
    </mesh>
  )
}

function TurfPatch({ position, scale, color, rotation = 0 }: {
  position: THREE.Vector3Tuple
  scale: THREE.Vector3Tuple
  color: string
  rotation?: number
}) {
  return (
    <mesh position={position} scale={scale} rotation={[-Math.PI / 2, 0, rotation]} receiveShadow>
      <circleGeometry args={[1, 11]} />
      <Surf color={color} />
    </mesh>
  )
}

function Water({ night }: { night: boolean }) {
  return (
    <mesh position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1400, 1400, 1, 1]} />
      <Surf color={night ? P.waterNight : P.water} />
    </mesh>
  )
}

function FogFollow({ mist }: { mist: boolean }) {
  const scene = useThree((state) => state.scene)
  useFrame(({ camera }) => {
    const fog = scene.fog as THREE.Fog | null
    if (!fog) return
    const { near, far } = fogRange(camera.position.length(), mist)
    fog.near += (near - fog.near) * 0.12
    fog.far += (far - fog.far) * 0.12
  })
  return null
}

function FixedTerrain({ night }: { night: boolean }) {
  const ground = night ? P.groundNight : P.ground
  const left: Point[] = [
    [-250, -200], [-6, -200], [-4, -142], [-7, -90], [-18, -38], [-39, 18],
    [-47, 52], [-42, 78], [-29, 112], [-23, 170], [-28, 520], [-250, 520],
  ]
  const right: Point[] = [
    [44, -200], [250, -200], [250, 520], [34, 520], [27, 170], [18, 126],
    [4, 92], [2, 67], [14, 42], [31, 18], [38, -18], [43, -72], [44, -128],
  ]
  const basin: Point[] = [
    [5, 48], [20, 38], [39, 39], [51, 44], [66, 40], [87, 43], [106, 53],
    [116, 73], [112, 96], [96, 116], [73, 124], [48, 119], [29, 108], [18, 91], [17, 68],
  ]
  const inlet: Point[] = [[-10, 44], [14, 38], [37, 42], [35, 62], [10, 66], [-5, 59]]
  const relief = [
    { p: [-174, 4.1, -105] as THREE.Vector3Tuple, s: [30, 2.2, 21] as THREE.Vector3Tuple, c: '#5d6c52', r: 0.2 },
    { p: [-79, 4.4, -99] as THREE.Vector3Tuple, s: [24, 2.8, 17] as THREE.Vector3Tuple, c: '#637256', r: 0.7 },
    { p: [-145, 4.1, 54] as THREE.Vector3Tuple, s: [28, 2.1, 22] as THREE.Vector3Tuple, c: '#71805e', r: 0.1 },
    { p: [-71, 4.2, 111] as THREE.Vector3Tuple, s: [20, 2.1, 16] as THREE.Vector3Tuple, c: '#5f7054', r: 0.5 },
    { p: [112, 4.4, -117] as THREE.Vector3Tuple, s: [26, 2.6, 18] as THREE.Vector3Tuple, c: '#59664f', r: 0.35 },
    { p: [145, 4.2, 20] as THREE.Vector3Tuple, s: [24, 2.1, 19] as THREE.Vector3Tuple, c: '#71805f', r: 0.6 },
    { p: [143, 4.1, 115] as THREE.Vector3Tuple, s: [32, 2.4, 18] as THREE.Vector3Tuple, c: '#5f6e54', r: -0.2 },
  ]
  const rocks = [
    [-151, 6.1, -26, 3.2, 1.8, 2.5, 0.2], [-137, 5.6, -18, 1.8, 1.1, 1.5, 0.8],
    [-93, 5.7, 93, 2.4, 1.3, 1.8, 0.5], [-119, 5.5, 111, 1.6, 1, 1.4, 1.1],
    [-66, 5.8, -117, 2.5, 1.5, 2, 0.4], [-45, 5.3, -109, 1.5, 0.8, 1.2, 0.9],
    [105, 5.9, 26, 2.7, 1.5, 2.1, 0.7], [134, 5.4, 38, 1.5, 0.9, 1.4, 0.2],
    [98, 5.6, 124, 2.1, 1.2, 1.8, 0.9], [150, 6.2, 102, 3.5, 1.7, 2.2, 0.3],
  ] as const
  const heather = [
    [-162, -54, 10, 6, '#6a655f'], [-112, 4, 12, 7, '#7b6b67'], [-92, 118, 10, 6, '#6d665d'],
    [-57, 73, 8, 5, '#88906d'], [87, -83, 11, 6, '#7a6c68'], [127, 41, 9, 5, '#6f6662'],
    [142, 131, 13, 7, '#79816a'], [34, -105, 9, 5, '#596850'],
  ] as const
  return (
    <>
      <Water night={night} />
      <LandPlate points={left} color={ground} />
      <LandPlate points={right} color={ground} />
      <FlatShape points={inlet} y={4.02} color={night ? P.waterNight : P.water} />
      <FlatShape points={basin} y={4.03} color={night ? P.waterNight : P.water} />
      {relief.map((item, i) => (
        <Boulder key={`relief-${i}`} position={item.p} scale={item.s} color={night ? '#3b4b4c' : item.c} rotation={item.r} />
      ))}
      {rocks.map(([x, y, z, sx, sy, sz, r], i) => (
        <Boulder key={`rock-${i}`} position={[x, y, z]} scale={[sx, sy, sz]} color={night ? '#303b42' : i % 3 ? P.basalt : '#59605d'} rotation={r} />
      ))}
      {heather.map(([x, z, sx, sz, color], i) => (
        <TurfPatch key={`heather-${i}`} position={[x, 4.3, z]} scale={[sx, sz, 1]} color={night ? '#3f4c4b' : color} rotation={i * 0.47} />
      ))}
    </>
  )
}

function Route({ points, color, width, y = 3.7 }: { points: Point[]; color: string; width: number; y?: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.35)
    return new THREE.TubeGeometry(curve, Math.max(12, points.length * 8), width, 5, false)
  }, [points, width, y])
  return (
    <mesh geometry={geometry} scale={[1, 0.18, 1]} receiveShadow>
      <Surf color={color} />
    </mesh>
  )
}

function Routes({ layout }: { layout: BiomeLayout }) {
  return (
    <group>
      <Route points={layout.routes[0]} color={P.roadEdge} width={2.6} />
      <Route points={layout.routes[0]} color={P.road} width={1.9} y={3.82} />
      {layout.routes.slice(1).map((route, i) => <Route key={i} points={route} color={P.road} width={1.5} y={3.8} />)}
      {[
        { p: [-70, 4, -59] as THREE.Vector3Tuple, yaw: -0.18, length: 18 },
        { p: [-30, 4, 6] as THREE.Vector3Tuple, yaw: 0.66, length: 16 },
        { p: [111, 4, -55] as THREE.Vector3Tuple, yaw: 0.62, length: 15 },
      ].map((bridge, i) => (
        <mesh key={i} position={bridge.p} rotation={[0, bridge.yaw, 0]} castShadow>
          <boxGeometry args={[bridge.length, 0.65, 3.6]} />
          <Surf color="#8b6a4a" />
        </mesh>
      ))}
    </group>
  )
}

function MountainMass({ position, scale, color, rotation = 0, faceted = false }: {
  position: THREE.Vector3Tuple
  scale: THREE.Vector3Tuple
  color: string
  rotation?: number
  faceted?: boolean
}) {
  return (
    <mesh position={position} scale={scale} rotation={[0.03, rotation, 0]} castShadow receiveShadow>
      {faceted ? <icosahedronGeometry args={[1, 1]} /> : <dodecahedronGeometry args={[1, 0]} />}
      <Surf color={color} />
    </mesh>
  )
}

function Horizon({ night }: { night: boolean }) {
  const rear = [
    [-174, 24, -184, 48, 24, 21, 0.1], [-119, 29, -188, 43, 30, 23, 0.4],
    [-67, 25, -192, 38, 25, 20, 0.8], [-20, 32, -194, 44, 33, 23, 0.25],
    [34, 27, -193, 43, 27, 22, 0.65], [86, 31, -190, 39, 31, 23, 0.15],
    [135, 25, -186, 45, 25, 21, 0.55], [180, 20, -180, 40, 20, 19, 0.9],
  ] as const
  const cliffs = [
    [-157, 16, -151, 39, 17, 17, 0.2], [-116, 22, -148, 31, 23, 18, 0.7],
    [-79, 20, -145, 28, 21, 17, 0.05], [-48, 18, -139, 22, 19, 16, 0.45],
    [56, 20, -140, 23, 21, 17, 0.2], [89, 23, -146, 29, 24, 18, 0.75],
    [128, 19, -149, 34, 20, 17, 0.35], [166, 15, -153, 39, 16, 16, 0.8],
  ] as const
  const fjordWalls = [
    [-35, 15, -135, 15, 18, 24, 0.2], [-22, 20, -147, 13, 24, 20, 0.6],
    [39, 17, -138, 14, 20, 23, 0.4], [27, 23, -150, 12, 27, 19, 0.8],
  ] as const
  return (
    <group>
      {rear.map(([x, y, z, sx, sy, sz, r], i) => (
        <MountainMass key={`rear-${i}`} position={[x, y, z]} scale={[sx, sy, sz]} rotation={r} faceted color={night ? '#273642' : i % 2 ? '#687477' : P.rearRim} />
      ))}
      {cliffs.map(([x, y, z, sx, sy, sz, r], i) => (
        <MountainMass key={`cliff-${i}`} position={[x, y, z]} scale={[sx, sy, sz]} rotation={r} color={night ? '#1d2933' : i % 3 === 0 ? '#303842' : P.cliff} />
      ))}
      {fjordWalls.map(([x, y, z, sx, sy, sz, r], i) => (
        <MountainMass key={`fjord-wall-${i}`} position={[x, y, z]} scale={[sx, sy, sz]} rotation={r} color={night ? '#17232d' : i % 2 ? '#252d36' : '#3b4650'} />
      ))}
      {[-1, 1].flatMap((side) => [0, 1, 2].map((i) => (
        <MountainMass
          key={`wing-${side}-${i}`}
          position={[side * (164 + i * 20), 13 - i * 2.2, -145 + i * 8]}
          scale={[25 - i * 5, 14 - i * 3, 15 - i * 2]}
          rotation={side * (0.2 + i * 0.18)}
          color={night ? ['#34434c', '#46565d', '#5a6970'][i] : ['#667276', '#879294', '#a7aeac'][i]}
        />
      )))}
    </group>
  )
}

function VolcanoSkyline({ fraction, night }: { fraction: number; night: boolean }) {
  const profile = volcanoProfile(fraction)
  const shoulders = [
    [-72, 0.66, 18, -4, 0.1], [-58, 0.82, 19, -1, 0.45], [-44, 0.94, 21, 1, 0.8],
    [-29, 0.86, 18, 2, 0.2], [-15, 0.73, 17, 4, 0.6], [0, 0.58, 19, 5, 0],
    [16, 0.69, 17, 3, 0.7], [31, 0.92, 20, 1, 0.25], [47, 1, 22, -1, 0.9],
    [63, 0.83, 19, -3, 0.4], [79, 0.64, 17, -5, 0.75],
  ] as const
  const start = Math.floor((shoulders.length - profile.shoulders) / 2)
  const active = shoulders.slice(start, start + profile.shoulders)
  return (
    <group position={[8, 2, -116]}>
      {active.map(([x, factor, width, z, rotation], i) => {
        const height = profile.height * factor
        return (
          <group key={i}>
            <MountainMass
              position={[x, height * 0.58, z]}
              scale={[width, height * 0.68, 12 + (i % 3) * 2]}
              rotation={rotation}
              color={night ? '#202a34' : i % 2 ? '#3f454c' : '#272e37'}
            />
            {profile.glowArc > 0 && i === Math.floor(profile.shoulders * 0.62) && (
              <mesh position={[x - 1, height * 1.05, 8]} rotation={[0.2, rotation, 0]}>
                <boxGeometry args={[5.4, 0.5, 0.5]} />
                <Surf color={P.lava} emissive={P.lava} emissiveIntensity={0.8} />
              </mesh>
            )}
          </group>
        )
      })}
      {profile.secondRow && [
        [-76, 13, -20, 25, 13, 12, 0.2], [-39, 16, -23, 30, 16, 13, 0.7],
        [2, 12, -25, 27, 12, 12, 0.35], [42, 17, -22, 31, 17, 13, 0.9],
        [82, 12, -18, 26, 12, 11, 0.5],
      ].map(([x, y, z, sx, sy, sz, r], i) => (
        <MountainMass key={`second-${i}`} position={[x, y, z]} scale={[sx, sy, sz]} rotation={r} faceted color={night ? '#34434e' : '#5d6a6d'} />
      ))}
    </group>
  )
}

function NordicHouse({ position, yaw, color, night, ruined = false, wide = 1, roof = P.turf, height = 3.4 }: {
  position: THREE.Vector3Tuple
  yaw: number
  color: string
  night: boolean
  ruined?: boolean
  wide?: number
  roof?: string
  height?: number
}) {
  const wall = ruined ? '#424247' : color
  const width = 5 * wide
  const roofColor = ruined ? '#35383b' : roof
  return (
    <group position={position} rotation={[0, yaw, ruined ? 0.12 : 0]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[width + 0.5, 0.5, 4.5]} />
        <Surf color="#505454" />
      </mesh>
      <mesh position={[0, height / 2 + 0.5, 0]} castShadow>
        <boxGeometry args={[width, height, 4]} />
        <Surf color={wall} />
      </mesh>
      <mesh position={[-width * 0.23, height + 1.45, 0]} rotation={[0, 0, -0.62]} castShadow>
        <boxGeometry args={[width * 0.62, 0.38, 4.9]} />
        <Surf color={roofColor} />
      </mesh>
      <mesh position={[width * 0.23, height + 1.45, 0]} rotation={[0, 0, 0.62]} castShadow>
        <boxGeometry args={[width * 0.62, 0.38, 4.9]} />
        <Surf color={roofColor} />
      </mesh>
      <mesh position={[0, height / 2 + 0.5, 2.03]}>
        <planeGeometry args={[1.05, 1.35]} />
        <Surf color={night && !ruined ? P.window : '#4f342a'} emissive={night && !ruined ? P.window : '#000'} emissiveIntensity={night ? 1.3 : 0} />
      </mesh>
      <mesh position={[-width * 0.28, height + 2.15, -0.7]} castShadow>
        <boxGeometry args={[0.65, 2.2, 0.65]} />
        <Surf color={ruined ? '#3d4042' : '#6d6256'} />
      </mesh>
      <Beam a={[-width / 2 - 0.06, 0.5, 2.05]} b={[-width / 2 - 0.06, height + 0.3, 2.05]} radius={0.08} color={P.cream} />
      <Beam a={[width / 2 + 0.06, 0.5, 2.05]} b={[width / 2 + 0.06, height + 0.3, 2.05]} radius={0.08} color={P.cream} />
    </group>
  )
}

function Village({ district, count, seed, night, ruined }: { district: GeneratedDistrict; count: number; seed: number; night: boolean; ruined: boolean }) {
  const rng = seeded(seed * 73 + 1)
  const homes = [
    { p: [7, 0.4, -10] as THREE.Vector3Tuple, yaw: -0.12, c: P.red, w: 1.15, roof: P.turf },
    { p: [-1, 0.8, -8] as THREE.Vector3Tuple, yaw: 0.18, c: P.cream, w: 0.9, roof: '#455b3d' },
    { p: [-10, 1.4, -5] as THREE.Vector3Tuple, yaw: -0.2, c: P.ochre, w: 1.05, roof: P.turf },
    { p: [4, 0.7, 2] as THREE.Vector3Tuple, yaw: 0.12, c: '#b84d3f', w: 0.85, roof: '#455b3d' },
    { p: [-5, 1.4, 5] as THREE.Vector3Tuple, yaw: -0.08, c: P.cream, w: 1.25, roof: P.turf },
    { p: [-15, 2.1, 5] as THREE.Vector3Tuple, yaw: 0.25, c: '#d09a43', w: 0.8, roof: '#4c613e' },
    { p: [2, 1.4, 12] as THREE.Vector3Tuple, yaw: -0.28, c: '#a94138', w: 1.1, roof: P.turf },
    { p: [-9, 2.2, 14] as THREE.Vector3Tuple, yaw: 0.18, c: P.cream, w: 0.85, roof: '#40573c' },
    { p: [-18, 2.9, 13] as THREE.Vector3Tuple, yaw: -0.12, c: P.red, w: 1.3, roof: P.turf },
    { p: [-3, 2.5, 21] as THREE.Vector3Tuple, yaw: 0.22, c: P.ochre, w: 0.9, roof: '#40573c' },
    { p: [-14, 3.2, 23] as THREE.Vector3Tuple, yaw: -0.22, c: P.cream, w: 1.05, roof: P.turf },
  ]
  return (
    <group position={[district.center[0], 3.6, district.center[1]]} rotation={[0, THREE.MathUtils.degToRad(district.yawDeg), 0]}>
      <TurfPatch position={[-7, 0.1, 9]} scale={[26, 18, 1]} color="#748461" rotation={-0.15} />
      <TurfPatch position={[-13, 1.2, 18]} scale={[21, 12, 1]} color="#657655" rotation={0.25} />
      <mesh position={[33, 0.25, -1]} castShadow><boxGeometry args={[38, 0.5, 4.2]} /><Surf color="#6f513b" /></mesh>
      <mesh position={[49, 0.28, -7]} castShadow><boxGeometry args={[4.2, 0.55, 16]} /><Surf color="#79583e" /></mesh>
      <mesh position={[26, 0.28, 6]} castShadow><boxGeometry args={[18, 0.5, 3.2]} /><Surf color="#79583e" /></mesh>
      {[18, 28, 38, 48].map((x) => <Beam key={x} a={[x, -0.8, -2.5]} b={[x, 1.2, -2.5]} radius={0.18} color="#4b3429" />)}
      <NordicHouse position={[16, 0.3, -7]} yaw={0.08} color={P.ochre} roof="#3f4d3b" night={night} ruined={ruined} wide={1.35} height={3.1} />
      <NordicHouse position={[24, 0.2, 7]} yaw={-0.08} color="#a74235" roof="#38473a" night={night} ruined={ruined} wide={0.9} height={2.8} />
      {homes.slice(0, count).map((home, i) => (
        <NordicHouse
          key={i}
          position={[home.p[0] + (rng() - 0.5) * 1.2, home.p[1], home.p[2] + (rng() - 0.5) * 1.2]}
          yaw={home.yaw + (rng() - 0.5) * 0.12}
          color={home.c}
          roof={home.roof}
          night={night}
          ruined={ruined}
          wide={home.w}
          height={i % 4 === 0 ? 3.8 : 3.2}
        />
      ))}
      {[
        [-13, 0.2, -1, 26, 0.15], [-10, 1.1, 8, 23, -0.12], [-12, 2, 17, 21, 0.18],
      ].map(([x, y, z, length, yaw], i) => (
        <mesh key={`lane-${i}`} position={[x, y, z]} rotation={[0, yaw, 0]}>
          <boxGeometry args={[length, 0.18, 1.5]} />
          <Surf color="#968a73" />
        </mesh>
      ))}
      {[
        [42, 0.9, 7, 0.2], [52, 0.9, -9, -0.35],
      ].map(([x, y, z, yaw], i) => (
        <group key={`boat-${i}`} position={[x, y, z]} rotation={[0, yaw, 0]}>
          <mesh scale={[1.7, 0.55, 4.2]}><dodecahedronGeometry args={[1, 0]} /><Surf color={i ? '#5f382e' : '#314855'} /></mesh>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[2.1, 0.25, 2.2]} /><Surf color={P.cream} /></mesh>
        </group>
      ))}
      {count >= 6 && Array.from({ length: 6 }, (_, i) => <Beam key={i} a={[-22 + i * 4, 1.1, 28]} b={[-22 + i * 4, 2.1, 28]} radius={0.1} color={P.cream} />)}
      {count >= 6 && <Beam a={[-22, 1.7, 28]} b={[-2, 1.7, 28]} radius={0.11} color={P.cream} />}
    </group>
  )
}

function Canyon({ district, count, night, ruined }: { district: GeneratedDistrict; count: number; night: boolean; ruined: boolean }) {
  const columns = [
    [-18, 5.5, -12, 4.8, 10], [-13, 7, -13, 4.5, 13], [-8, 5.8, -14, 4.6, 10],
    [9, 6.2, -14, 4.8, 11], [14, 8, -13, 4.7, 15], [19, 5.5, -11, 4.5, 10],
    [-20, 4.6, -3, 4.2, 8], [-15, 5.7, 2, 4.2, 10], [15, 5.4, 1, 4.3, 9], [21, 4.3, -3, 4, 7],
  ] as const
  return (
    <group position={[district.center[0], 3.4, district.center[1]]} rotation={[0, THREE.MathUtils.degToRad(district.yawDeg), 0]}>
      <FlatShape points={[[-24, -18], [24, -18], [20, 8], [11, 16], [-12, 15], [-23, 7]]} y={0.18} color="#272a30" />
      {columns.map(([x, y, z, radius, height], i) => (
        <mesh key={`column-${i}`} position={[x, y / 2, z]} rotation={[0, i * 0.21, i % 2 ? 0.035 : -0.025]} castShadow>
          <cylinderGeometry args={[radius * 0.86, radius, height, 6]} />
          <Surf color={ruined ? '#303238' : i % 3 ? '#3e4148' : '#252a31'} />
        </mesh>
      ))}
      <mesh position={[-10, 3.8, -11.2]} castShadow><boxGeometry args={[8, 6.8, 2.2]} /><Surf color="#11151a" /></mesh>
      <mesh position={[-10, 7.2, -11]} rotation={[0, 0, Math.PI / 4]} scale={[4.5, 1.5, 2.5]}><octahedronGeometry args={[1, 0]} /><Surf color="#171b20" /></mesh>
      <Beam a={[-17, 1, 9]} b={[-17, 11, 9]} radius={0.34} color="#8a7357" />
      <Beam a={[-7, 1, 9]} b={[-7, 11, 9]} radius={0.34} color="#8a7357" />
      <Beam a={[-17, 11, 9]} b={[-7, 11, 9]} radius={0.42} color="#8a7357" />
      <Beam a={[-15, 11, 9]} b={[-9, 3, 9]} radius={0.23} color="#8a7357" />
      <Beam a={[-12, 11, 9]} b={[-12, 14, 9]} radius={0.2} color="#8a7357" />
      <mesh position={[-12, 14.2, 9]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.2, 0.22, 6, 12]} /><Surf color="#b99d72" /></mesh>
      <mesh position={[10, 2.6, 10]} castShadow><boxGeometry args={[10, 5.2, 7]} /><Surf color={ruined ? '#33353a' : '#454248'} /></mesh>
      <mesh position={[10, 3.2, 13.55]}><boxGeometry args={[4.2, 2.5, 0.35]} /><Surf color={P.hot} emissive={P.hot} emissiveIntensity={night ? 1.8 : 0.9} /></mesh>
      <mesh position={[13, 9, 9]} castShadow><cylinderGeometry args={[1.1, 1.4, 13, 7]} /><Surf color="#2c2d31" /></mesh>
      <SteamPlume position={[13, 16, 9]} phase={1.4} />
      {[-1.15, 1.15].map((x) => (
        <mesh key={`rail-${x}`} position={[x, 0.65, 8]}><boxGeometry args={[0.22, 0.2, 28]} /><Surf color="#b1a896" /></mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => <mesh key={`tie-${i}`} position={[0, 0.5, -4 + i * 4]}><boxGeometry args={[3.3, 0.18, 0.45]} /><Surf color="#70543c" /></mesh>)}
      <group position={[0, 1.5, 6]}>
        <mesh><boxGeometry args={[3.4, 1.5, 3]} /><Surf color="#4a4140" /></mesh>
        {[[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]].map(([x, z], i) => <mesh key={i} position={[x, -0.9, z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.5, 0.16, 5, 10]} /><Surf color="#20252b" /></mesh>)}
      </group>
      {count >= 3 && <NordicHouse position={[20, 0.2, 14]} yaw={-0.2} color="#74534a" roof="#30383a" night={night} ruined={ruined} wide={0.9} height={2.9} />}
      {count >= 6 && <NordicHouse position={[23, 0.2, 6]} yaw={0.28} color="#5c5654" roof="#343b3b" night={night} ruined={ruined} wide={0.75} height={2.7} />}
      <Boulder position={[24, 4.5, -16]} scale={[7, 4.6, 6]} color="#1e242b" rotation={0.4} />
      <Boulder position={[-25, 3.8, 14]} scale={[6, 3.8, 5]} color="#282d33" rotation={0.8} />
    </group>
  )
}

function Hamlet({ district, count, seed, night, ruined }: { district: GeneratedDistrict; count: number; seed: number; night: boolean; ruined: boolean }) {
  const rng = seeded(seed * 53 + 9)
  const homes = [
    [-19, 0.3, -5, -0.28, P.red, 1.15, '#40563b'],
    [-10, 0.7, -1, -0.12, P.cream, 0.8, P.turf],
    [-1, 1.1, 2, 0.18, '#b54c3d', 1.05, '#40563b'],
    [9, 1.6, 4, -0.16, P.cream, 0.85, P.turf],
    [18, 2.1, 7, 0.24, P.ochre, 1.1, '#465c40'],
    [-14, 1.2, 10, 0.22, P.cream, 0.95, P.turf],
    [-4, 1.7, 13, -0.25, P.red, 0.8, '#40563b'],
    [7, 2.3, 15, 0.15, P.cream, 1.2, P.turf],
    [18, 2.8, 18, -0.18, '#a94439', 0.85, '#40563b'],
    [-4, 2.8, 23, 0.2, P.ochre, 1, P.turf],
  ] as const
  return (
    <group position={[district.center[0], 3.6, district.center[1]]} rotation={[0, THREE.MathUtils.degToRad(district.yawDeg), 0]}>
      <TurfPatch position={[0, 0.08, 8]} scale={[31, 23, 1]} color="#82906b" rotation={0.18} />
      <TurfPatch position={[16, 0.12, -8]} scale={[18, 13, 1]} color="#71825f" rotation={-0.3} />
      <NordicHouse position={[-10, 0.6, -12]} yaw={-0.24} color="#9e463c" roof={P.turf} night={night} ruined={ruined} wide={1.8} height={4.2} />
      <NordicHouse position={[7, 1.1, -10]} yaw={0.28} color="#6f5545" roof="#455e3f" night={night} ruined={ruined} wide={1.55} height={4} />
      {homes.slice(0, count).map(([x, y, z, yaw, color, wide, roof], i) => (
        <NordicHouse
          key={i}
          position={[x + (rng() - 0.5) * 1.2, y, z + (rng() - 0.5) * 1.2]}
          yaw={yaw + (rng() - 0.5) * 0.12}
          color={color}
          roof={roof}
          night={night}
          ruined={ruined}
          wide={wide}
          height={i % 3 === 0 ? 3.6 : 3}
        />
      ))}
      {[
        [-25, 0.6, -18, -6, 1.3, -17], [-6, 1.3, -17, 15, 1.5, -15],
        [15, 1.5, -15, 28, 2.2, -9], [-27, 0.8, 18, -10, 2, 27],
      ].map(([ax, ay, az, bx, by, bz], i) => <Beam key={`wall-${i}`} a={[ax, ay, az]} b={[bx, by, bz]} radius={0.28} color="#aaa89b" />)}
      {count >= 5 && Array.from({ length: 8 }, (_, i) => <Beam key={i} a={[-24 + i * 6, 0.4 + i * 0.08, 30]} b={[-24 + i * 6, 1.8 + i * 0.08, 30]} radius={0.11} color={P.cream} />)}
      {count >= 5 && <Beam a={[-24, 1.25, 30]} b={[18, 1.8, 30]} radius={0.11} color={P.cream} />}
      {count >= 5 && Array.from({ length: 6 }, (_, i) => (
        <group key={`sheep-${i}`} position={[-20 + (i % 3) * 6, 1, 20 + Math.floor(i / 3) * 5]}>
          <mesh scale={[1.1, 0.7, 0.75]}><dodecahedronGeometry args={[1, 0]} /><Surf color="#d8d5c8" /></mesh>
          <mesh position={[0.9, 0.25, 0]} scale={0.35}><dodecahedronGeometry args={[1, 0]} /><Surf color="#3e4040" /></mesh>
        </group>
      ))}
      {[[-24, 1.5, 9], [25, 2.2, 12], [24, 1.8, -2]].map(([x, y, z], i) => <Boulder key={`hamlet-rock-${i}`} position={[x, y, z]} scale={[2.4, 1.3, 1.8]} color="#777b72" rotation={i * 0.7} />)}
    </group>
  )
}

function SteamPlume({ position, phase = 0 }: { position: THREE.Vector3Tuple; phase?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime + phase
    ref.current.position.y = position[1] + Math.sin(t * 0.8) * 0.8
    ref.current.scale.setScalar(0.9 + (Math.sin(t * 1.3) + 1) * 0.12)
  })
  return (
    <group ref={ref} position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * 0.8, i * 1.2, 0]} scale={1 + i * 0.35}>
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshBasicMaterial color="#d7e6e4" transparent opacity={0.32 - i * 0.06} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function Geothermal({ district, count, night, ruined }: { district: GeneratedDistrict; count: number; night: boolean; ruined: boolean }) {
  const pools = [
    [-11, -12, 5.8, 1.25, 0.84, -0.12], [2, -15, 4.8, 1.1, 0.8, 0.18], [12, -10, 4.2, 1.25, 0.76, -0.3],
  ] as const
  const plots = [
    [-13, 13, 5.5, 9, -0.18, '#4f6248'], [-3, 15, 6.5, 10, 0.12, '#65724f'],
    [8, 14, 5.5, 8, -0.1, '#465d47'], [17, 11, 5, 7, 0.25, '#68764f'],
  ] as const
  return (
    <group position={[district.center[0], 3.55, district.center[1]]} rotation={[0, THREE.MathUtils.degToRad(district.yawDeg), 0]}>
      {pools.map(([x, z, r, sx, sz, rotation], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, rotation, 0]}>
          <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[sx * 1.3, sz * 1.3, 1]}>
            <circleGeometry args={[r + 1.5, 14]} />
            <Surf color={i % 2 ? '#b7aa79' : '#9d9b78'} />
          </mesh>
          <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[sx * 1.15, sz * 1.15, 1]}>
            <circleGeometry args={[r + 0.7, 14]} />
            <Surf color={P.wet} />
          </mesh>
          <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[sx, sz, 1]}>
            <circleGeometry args={[r, 14]} />
            <Surf color={P.geothermal} emissive={P.geothermal} emissiveIntensity={night ? 0.7 : 0.05} />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[sx, sz, 1]}>
            <torusGeometry args={[r * 0.72, 0.2, 5, 18]} />
            <Surf color="#d8cda5" />
          </mesh>
          <SteamPlume position={[0, 1.4, 0]} phase={i * 2.1} />
        </group>
      ))}
      <Route points={[[-11, -6], [-7, 1], [-3, 7], [-3, 14]]} color="#91bdb4" width={0.34} y={0.45} />
      <Route points={[[2, -9], [5, -3], [8, 4], [12, 10]]} color="#91bdb4" width={0.26} y={0.48} />
      <Beam a={[-4, 0, -10]} b={[0, 11, -7]} radius={0.32} />
      <Beam a={[5, 0, -10]} b={[0, 11, -7]} radius={0.32} />
      <Beam a={[0, 0, -2]} b={[0, 11, -7]} radius={0.32} />
      {plots.map(([x, z, sx, sz, rotation, color], i) => (
        <mesh key={`plot-${i}`} position={[x, 0.18, z]} rotation={[0, rotation, 0]}>
          <boxGeometry args={[sx, 0.3, sz]} />
          <Surf color={color} />
        </mesh>
      ))}
      {count >= 4 && (
        <group position={[17, 1.8, 1]} rotation={[0, -0.22, 0]}>
          <mesh><boxGeometry args={[10, 3.4, 7]} /><Surf color="#91b9a8" transparent opacity={0.55} /></mesh>
          <mesh position={[-2.5, 2.8, 0]} rotation={[0, 0, -0.52]}><boxGeometry args={[5.8, 0.25, 7.4]} /><Surf color="#d9e3cc" transparent opacity={0.7} /></mesh>
          <mesh position={[2.5, 2.8, 0]} rotation={[0, 0, 0.52]}><boxGeometry args={[5.8, 0.25, 7.4]} /><Surf color="#d9e3cc" transparent opacity={0.7} /></mesh>
          {[-3, 0, 3].map((x) => <Beam key={x} a={[x, 0, -3.7]} b={[x, 4.4, -3.7]} radius={0.1} color={P.cream} />)}
        </group>
      )}
      {count >= 1 && <NordicHouse position={[-20, 0.2, 4]} yaw={-0.2} color={P.red} roof="#465b40" night={night} ruined={ruined} wide={1.05} />}
      {count >= 4 && <NordicHouse position={[24, 0.5, 13]} yaw={0.25} color={P.cream} roof={P.turf} night={night} ruined={ruined} wide={0.9} />}
      {count >= 7 && <NordicHouse position={[-21, 0.5, 15]} yaw={0.12} color={P.ochre} roof="#40553c" night={night} ruined={ruined} wide={0.8} height={2.8} />}
      <Beam a={[-11, 1, -5]} b={[-9, 1, 8]} radius={0.18} color="#b6a77a" />
      <Beam a={[2, 1, -9]} b={[9, 1, 6]} radius={0.18} color="#b6a77a" />
      <mesh position={[7, 1.2, 6]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.35, 0.35, 17, 8]} /><Surf color="#a7a78e" /></mesh>
    </group>
  )
}

function Archipelago({ layout, district, count, night, ruined }: { layout: BiomeLayout; district: GeneratedDistrict; count: number; night: boolean; ruined: boolean }) {
  const islandRotations = [0.28, -0.42, 0.72]
  return (
    <group>
      {layout.lavaBasin.islets.map((islet, i) => (
        <group key={i} position={[islet.center[0], 4.2, islet.center[1]]} rotation={[0, islandRotations[i], 0]}>
          <Boulder position={[0, 1.2 + i * 0.4, 0]} scale={[islet.radii[0], 4.7 + i, islet.radii[1]]} color={ruined ? '#28282d' : i === 1 ? '#34343b' : P.basalt} rotation={i * 0.5} />
          <Boulder position={[i === 1 ? 5 : -4, 4.7 + i, i === 2 ? -2 : 3]} scale={[islet.radii[0] * 0.52, 2.2 + i * 0.4, islet.radii[1] * 0.42]} color="#383940" rotation={0.3 + i} />
          <Beam a={[-islet.radii[0] * 0.65, 6.2 + i, -2]} b={[0, 6.4 + i, 1]} radius={0.28} color={P.lava} />
          <Beam a={[0, 6.4 + i, 1]} b={[islet.radii[0] * 0.55, 6.1 + i, i - 2]} radius={0.22} color={P.hot} />
          <mesh position={[i ? -3 : 4, 7 + i, i ? 4 : -3]} rotation={[0, i, 0]}>
            <coneGeometry args={[1.7, 3.5 + i, 6]} />
            <Surf color="#22252a" />
          </mesh>
          <pointLight position={[i ? -3 : 4, 7 + i, i ? 4 : -3]} color={P.hot} intensity={night ? 8 : 2} distance={28} />
        </group>
      ))}
      <group position={[district.center[0] + 12, 9, district.center[1]]} rotation={[0, THREE.MathUtils.degToRad(district.yawDeg), 0]}>
        <Boulder position={[-5, 0, 0]} scale={[3.2, 8, 3.8]} color="#292b30" rotation={0.2} />
        <Boulder position={[5, 0, 0]} scale={[3.5, 9, 3.6]} color="#292b30" rotation={0.8} />
        <Boulder position={[0, 5.5, 0]} scale={[8.5, 2.8, 4]} color="#303238" rotation={0.35} />
        <Beam a={[-3.8, 5.8, 3.8]} b={[2, 6.5, 4.2]} radius={0.35} color={P.hot} />
      </group>
      <group>
        <mesh position={[65, 8, 72]} rotation={[0, -0.38, 0]} castShadow><boxGeometry args={[20, 0.8, 2.8]} /><Surf color="#665044" /></mesh>
        <mesh position={[55, 7.2, 74]} rotation={[0, 0.52, 0]} castShadow><boxGeometry args={[13, 0.75, 2.5]} /><Surf color="#5a4940" /></mesh>
        {[58, 64, 70].map((x, i) => <Boulder key={`bridge-rock-${i}`} position={[x, 7.4, 72 + i]} scale={[2.2, 1.1, 1.8]} color="#34363c" rotation={i * 0.6} />)}
      </group>
      {count >= 1 && <NordicHouse position={[87, 10.2, 78]} yaw={0.2} color="#5b5554" roof="#2c3536" night={night} ruined={ruined} wide={0.8} height={2.8} />}
      {count >= 2 && <NordicHouse position={[46, 9.4, 58]} yaw={-0.45} color="#6e4a3f" roof="#30383a" night={night} ruined={ruined} wide={0.68} height={2.5} />}
      {count >= 4 && (
        <group position={[91, 8.8, 70]}>
          <Beam a={[-3, 0, 0]} b={[-3, 6, 0]} radius={0.16} color={P.cream} />
          <Beam a={[3, 0, 0]} b={[3, 6, 0]} radius={0.16} color={P.cream} />
          <Beam a={[-3, 6, 0]} b={[3, 6, 0]} radius={0.16} color={P.cream} />
          <mesh position={[0, 7, 0]}><octahedronGeometry args={[1.1, 0]} /><Surf color={P.hot} emissive={P.hot} emissiveIntensity={night ? 1.6 : 0.5} /></mesh>
        </group>
      )}
      <mesh position={[39, 4.6, 62]} rotation={[0, -0.45, 0]}><boxGeometry args={[10, 0.5, 2.6]} /><Surf color="#70543c" /></mesh>
      <group position={[34, 4.5, 65]} rotation={[0, 0.3, 0]}>
        <mesh scale={[1.8, 0.55, 4]}><dodecahedronGeometry args={[1, 0]} /><Surf color="#3d4e58" /></mesh>
        <mesh position={[0, 0.65, 0]}><boxGeometry args={[2, 0.2, 2.3]} /><Surf color={P.cream} /></mesh>
      </group>
    </group>
  )
}

function Districts({ layout, progress, seed, night, catastrophe }: { layout: BiomeLayout; progress: DistrictProgress; seed: number; night: boolean; catastrophe: CatastropheState }) {
  const districts = useMemo(() => generateDistricts(layout, seed), [layout, seed])
  return (
    <>
      {districts.map((district) => {
        const count = populationFor(district, progress[district.id] ?? 0).structures
        const ruined = catastrophe.districtId === district.id && catastrophe.phase !== 'calm' && catastrophe.phase !== 'recovering'
        if (district.id === 'fjord-village') return <Village key={district.id} district={district} count={count} seed={seed} night={night} ruined={ruined} />
        if (district.id === 'basalt-canyon') return <Canyon key={district.id} district={district} count={count} night={night} ruined={ruined} />
        if (district.id === 'highland-hamlet') return <Hamlet key={district.id} district={district} count={count} seed={seed} night={night} ruined={ruined} />
        if (district.id === 'geothermal-farms') return <Geothermal key={district.id} district={district} count={count} night={night} ruined={ruined} />
        return <Archipelago key={district.id} layout={layout} district={district} count={count} night={night} ruined={ruined} />
      })}
    </>
  )
}

function Landmark({ layout, stage, night }: { layout: BiomeLayout; stage: LandmarkStage; night: boolean }) {
  const [x, z] = layout.landmark.center
  return (
    <group position={[x, 5, z]} rotation={[0, THREE.MathUtils.degToRad(layout.landmark.yawDeg), 0]}>
      <Boulder position={[0, -1.2, 0]} scale={[19, 4.5, 16]} color="#343840" rotation={0.2} />
      <Boulder position={[-9, 0.2, 6]} scale={[8, 3, 8]} color="#3e4348" rotation={0.65} />
      <Boulder position={[10, -0.1, -5]} scale={[7, 2.8, 7]} color="#2d333a" rotation={0.15} />
      {Array.from({ length: 9 }, (_, i) => {
        const angle = (i / 9) * Math.PI * 2
        const radius = 6.2 + (i % 2) * 0.35
        return <Boulder key={`cairn-ring-${i}`} position={[Math.cos(angle) * radius, 1.1, Math.sin(angle) * radius]} scale={[1.5, 1.2, 1.3]} color={i % 2 ? '#69706d' : '#555c5d'} rotation={angle} />
      })}
      {[0, 1, 2, 3].map((i) => <Boulder key={`cairn-${i}`} position={[0, 1.2 + i * 1.25, 0]} scale={[2.2 - i * 0.35, 1.15, 1.8 - i * 0.25]} color={i % 2 ? '#717875' : '#4b5355'} rotation={i * 0.7} />)}
      {stage !== 'cairn' && (
        <>
          <mesh position={[0, 3.2, 0]}><cylinderGeometry args={[6.4, 7.1, 1.1, 12]} /><Surf color="#7a7365" /></mesh>
          <mesh position={[0, 4.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[5.6, 0.5, 7, 20]} /><Surf color={P.cream} /></mesh>
          {Array.from({ length: 4 }, (_, i) => {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
            return <Beam key={`observatory-leg-${i}`} a={[Math.cos(angle) * 5, 3.2, Math.sin(angle) * 5]} b={[Math.cos(angle) * 4.2, 9.5, Math.sin(angle) * 4.2]} radius={0.3} color="#92704d" />
          })}
          <Beam a={[0, 3.2, 0]} b={[0, 12, 0]} radius={0.5} color="#8b6a4a" />
          <mesh position={[0, 8.4, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[4.4, 0.28, 6, 18]} /><Surf color={P.geothermal} emissive={P.geothermal} emissiveIntensity={night ? 0.8 : 0.15} /></mesh>
          <Beam a={[-4.4, 8.4, 0]} b={[4.4, 8.4, 0]} radius={0.18} color={P.cream} />
          <Beam a={[0, 8.4, -4.4]} b={[0, 8.4, 4.4]} radius={0.18} color={P.cream} />
        </>
      )}
      {stage === 'beacon' && (
        <>
          <Beam a={[0, 11, 0]} b={[-3.8, 17, 0]} radius={0.38} color={P.cream} />
          <Beam a={[0, 11, 0]} b={[3.8, 17, 0]} radius={0.38} color={P.cream} />
          <Beam a={[-3.8, 17, 0]} b={[0, 20.5, 0]} radius={0.3} color="#d4c69c" />
          <Beam a={[3.8, 17, 0]} b={[0, 20.5, 0]} radius={0.3} color="#d4c69c" />
          <mesh position={[0, 18.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.5, 0.32, 7, 20]} /><Surf color={P.geothermal} emissive={P.geothermal} emissiveIntensity={night ? 1.3 : 0.35} /></mesh>
          <mesh position={[0, 18.2, 0]}><octahedronGeometry args={[1.7, 0]} /><Surf color={P.window} emissive={P.window} emissiveIntensity={night ? 2.4 : 0.9} /></mesh>
          <pointLight position={[0, 18.2, 0]} color={P.window} intensity={night ? 28 : 4} distance={75} />
          <pointLight position={[0, 10, 0]} color={P.geothermal} intensity={night ? 12 : 1} distance={55} />
          {night && <mesh position={[0, 18.2, 0]}><sphereGeometry args={[3.8, 10, 7]} /><meshBasicMaterial color="#dfffe9" transparent opacity={0.1} depthWrite={false} /></mesh>}
        </>
      )}
    </group>
  )
}

function Residents({ layout, count, seed, night }: { layout: BiomeLayout; count: number; seed: number; night: boolean }) {
  const rng = seeded(seed * 181 + 5)
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const district = layout.districts[i % layout.districts.length]
        const x = district.center[0] + (rng() - 0.5) * 20
        const z = district.center[1] + (rng() - 0.5) * 16
        const scale = layout.creatureScale
        return (
          <group key={i} position={[x, 4, z]} scale={scale}>
            <mesh position={[0, 0.85, 0]} castShadow><capsuleGeometry args={[0.35, 0.8, 3, 6]} /><Surf color={i % 3 === 0 ? P.red : '#4b5968'} /></mesh>
            <mesh position={[0, 1.65, 0]}><sphereGeometry args={[0.34, 7, 5]} /><Surf color="#d7b08a" /></mesh>
            <mesh position={[0, 1.95, 0]} rotation={[0, i, 0]}><coneGeometry args={[0.5, 0.5, 6]} /><Surf color={night ? '#b8c6d0' : P.cream} /></mesh>
          </group>
        )
      })}
    </group>
  )
}

function AmbientEvents({ enabled, layout, seed }: { enabled: boolean; layout: BiomeLayout; seed: number }) {
  const boat = useRef<THREE.Group>(null)
  const curve = useMemo(() => new THREE.CatmullRomCurve3(layout.fjord.map(([x, z]) => new THREE.Vector3(x, 0.15, z))), [layout])
  useFrame(({ clock }) => {
    if (!boat.current || !enabled) return
    const u = ((clock.elapsedTime + seed * 0.7) % 42) / 42
    const p = curve.getPointAt(u)
    const t = curve.getTangentAt(u)
    boat.current.position.copy(p)
    boat.current.rotation.y = Math.atan2(t.x, t.z)
  })
  if (!enabled) return null
  return (
    <group>
      <group ref={boat}>
        <mesh position={[0, 0.5, 0]} scale={[1.8, 0.55, 4]}><dodecahedronGeometry args={[1, 0]} /><Surf color="#5b3f32" /></mesh>
        <Beam a={[0, 0.7, 0]} b={[0, 4.5, 0]} radius={0.12} color={P.cream} />
        <mesh position={[0.8, 3, 0]} rotation={[0, 0, -0.08]}><planeGeometry args={[1.6, 3]} /><Surf color={P.red} /></mesh>
      </group>
      <SteamPlume position={[60, 7, -14]} />
    </group>
  )
}

function NightSky({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <group>
      {Array.from({ length: 90 }, (_, i) => {
        const rng = seeded(i * 101 + 3)
        return <mesh key={i} position={[(rng() - 0.5) * 340, 60 + rng() * 80, (rng() - 0.5) * 340]}><sphereGeometry args={[0.28 + rng() * 0.35, 4, 3]} /><meshBasicMaterial color="#eef7ff" /></mesh>
      })}
    </group>
  )
}

function Aurora({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <group position={[0, 68, -105]} rotation={[0.1, 0.05, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * 28, i * 7, 0]} rotation={[0, 0, -0.12 + i * 0.09]} scale={[1, 1.2, 1]}>
          <torusGeometry args={[44 - i * 5, 5 + i, 8, 32, 1.9]} />
          <meshBasicMaterial color={i === 1 ? '#7cc8be' : '#8f9ee8'} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function Catastrophe({ layout, state }: { layout: BiomeLayout; state: CatastropheState }) {
  const district = layout.districts.find((d) => d.id === state.districtId)
  if (!district || state.phase === 'calm') return null
  return (
    <group position={[district.center[0], 5, district.center[1]]}>
      {state.phase === 'ashfall' && Array.from({ length: 40 }, (_, i) => {
        const rng = seeded(i * 97 + 13)
        return <mesh key={i} position={[(rng() - 0.5) * 30, rng() * 20, (rng() - 0.5) * 24]}><dodecahedronGeometry args={[0.3 + rng() * 0.45, 0]} /><Surf color="#383a40" /></mesh>
      })}
      {(state.phase === 'quake' || state.phase === 'ruin') && Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        return <mesh key={i} position={[Math.cos(angle) * (5 + i), 0.5 + (i % 3), Math.sin(angle) * (5 + i)]} rotation={[i, angle, i * 0.3]}><boxGeometry args={[2, 0.8, 1]} /><Surf color="#33353a" /></mesh>
      })}
    </group>
  )
}

interface BiomeSceneProps {
  layout: BiomeLayout
  state: LabState
  onDiveEnd: () => void
  onPickDistrict: (id: string) => void
}

export function BiomeScene({ layout, state, onDiveEnd, onPickDistrict }: BiomeSceneProps) {
  const fraction = courseProgress(layout, state.progress)
  const generated = useMemo(() => generateDistricts(layout, state.seed), [layout, state.seed])
  const sky = state.night ? P.skyNight : P.sky
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[state.night ? '#263544' : P.fog, state.mist ? 430 : 520, state.mist ? 620 : 760]} />
      <FogFollow mist={state.mist} />
      <hemisphereLight args={[state.night ? '#50658f' : '#e8f1eb', state.night ? '#1b2530' : '#48503f', state.night ? 0.85 : 1.2]} />
      <directionalLight position={state.night ? [-70, 80, 30] : [65, 105, 70]} intensity={state.night ? 1.2 : 2.35} color={state.night ? '#91a9d2' : '#fff3dc'} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-170} shadow-camera-right={170} shadow-camera-top={170} shadow-camera-bottom={-170} shadow-camera-far={420} />

      <FixedTerrain night={state.night} />
      <Routes layout={layout} />
      <Horizon night={state.night} />
      <VolcanoSkyline fraction={fraction} night={state.night} />
      <Districts layout={layout} progress={state.progress} seed={state.seed} night={state.night} catastrophe={state.catastrophe} />
      <Landmark layout={layout} stage={landmarkStage(fraction)} night={state.night} />
      <Residents layout={layout} count={state.residents} seed={state.seed} night={state.night} />
      <AmbientEvents enabled={state.ambient} layout={layout} seed={state.seed} />
      <Catastrophe layout={layout} state={state.catastrophe} />
      <NightSky show={state.night} />
      <Aurora show={state.night && state.aurora} />

      {generated.map((district) => (
        <group key={district.id} position={[district.center[0], 4, district.center[1]]}>
          <mesh onClick={(event) => { event.stopPropagation(); onPickDistrict(district.id) }}>
            <cylinderGeometry args={[district.footprintRadius, district.footprintRadius, 5, 10]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {state.focusDistrict === district.id && (
            <Html position={[0, 12, 0]} center distanceFactor={120} className="region-label">
              <span>{district.name}</span>
            </Html>
          )}
        </group>
      ))}

      <CameraRig layout={layout} station={state.station} override={state.camera} focusDistrict={state.focusDistrict} diving={state.diving} onDiveEnd={onDiveEnd} />
      {state.pixel && <PixelComposer />}
    </>
  )
}
