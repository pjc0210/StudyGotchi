import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { toonGradient } from '../lib/toon'
import { PixelComposer } from './GoldenIceScene'
import { rendererProfile } from './golden-spec'
import {
  CAMERA_COURSES,
  DEFAULT_GLOBE_LAYOUT_SEED,
  GLOBE_CAMERA_PADDING,
  GLOBE_FOCUS_DIRECTION,
  LANDMARK_OFFSETS,
  PAWN_OFFSETS,
  PIXEL_ATLAS_HEIGHT,
  PIXEL_ATLAS_WIDTH,
  SNAP_DAMPING,
  WATER_FRAME_COUNT,
  WATER_FLOW_SPEED,
  archipelagoSurface,
  cameraDistanceForSphere,
  markerState,
  nearestCourseNeighbors,
  pixelGrassTone,
  seededCourseDirections,
  waterFrameState,
  type CameraCourse,
  type SurfaceBand,
} from './camera-globe-spec'

const PLANET_RADIUS = 4.55
const UP = new THREE.Vector3(0, 1, 0)
const FOCUS_NORMAL = new THREE.Vector3(...GLOBE_FOCUS_DIRECTION).normalize()
const COURSE_DIRECTION_VALUES = seededCourseDirections(
  CAMERA_COURSES.length,
  DEFAULT_GLOBE_LAYOUT_SEED,
)
const COURSE_DIRECTIONS = COURSE_DIRECTION_VALUES.map(
  (direction) => new THREE.Vector3(...direction),
)
const GLOBE_PIXEL_PROFILE_BASE = {
  ...rendererProfile('pixel'),
  normalEdgeStrength: 0,
  depthEdgeStrength: 0,
}
const OCEAN_FLOOR = new THREE.Color('#d9f5ed')
const WARM_SHORE = new THREE.Color('#f3e7bd')
const CONTINENT_GRASS = new THREE.Color('#78ad67')
const CONTINENT_HIGHLAND = new THREE.Color('#5f8c5e')
const PIXEL_GRASS_TONES: Record<number, THREE.Color> = {
  [-2]: new THREE.Color('#57894b'),
  [-1]: new THREE.Color('#679d58'),
  1: new THREE.Color('#87bb73'),
  2: new THREE.Color('#98cd80'),
}

function surfaceSample(point: THREE.Vector3) {
  const direction: [number, number, number] = [point.x, point.y, point.z]
  const terrain = archipelagoSurface(direction, COURSE_DIRECTION_VALUES)
  if (!terrain.land) {
    return {
      ...terrain,
      band: 'deep-ocean' as SurfaceBand,
      color: OCEAN_FLOOR.clone(),
      relief: 0,
    }
  }

  const course = CAMERA_COURSES[terrain.owner]
  const isIce = course.biome === 'ice'
  const color = terrain.coast
    ? WARM_SHORE.clone()
    : CONTINENT_GRASS.clone().lerp(
        CONTINENT_HIGHLAND,
        THREE.MathUtils.smoothstep(terrain.elevation, 0.23, 0.27) * 0.2,
      )
  if (!terrain.coast) {
    const [x, y, z] = direction
    const organicVariation =
      (Math.sin(x * 18.7 + y * 11.3 - z * 15.1 + terrain.owner * 1.7) * 0.006 +
        Math.sin(x * 37.9 - y * 23.1 + z * 9.7) * 0.003) *
      (0.25 + terrain.biomeWeight * 0.75)
    color.offsetHSL(0, 0.015, organicVariation)
    if (terrain.biomeWeight > 0) {
      color.lerp(new THREE.Color(course.ground), terrain.biomeWeight * 0.92)
      color.lerp(
        new THREE.Color(course.accent),
        THREE.MathUtils.smoothstep(terrain.biomeWeight, 0.72, 1) * (isIce ? 0.2 : 0.12),
      )
    }
  }
  const band: SurfaceBand =
    isIce && terrain.biomeWeight > 0.5
      ? 'snow'
      : terrain.elevation > 0.27
        ? 'highland'
        : 'lowland'
  return { ...terrain, band, color, relief: terrain.elevation }
}

function octahedralDirectionFromUv(u: number, v: number) {
  let x = u * 2 - 1
  let y = v * 2 - 1
  let z = 1 - Math.abs(x) - Math.abs(y)
  if (z < 0) {
    const oldX = x
    x = (1 - Math.abs(y)) * (x < 0 ? -1 : 1)
    y = (1 - Math.abs(oldX)) * (y < 0 ? -1 : 1)
  }
  return new THREE.Vector3(x, y, z).normalize()
}

function buildPlanetAtlasTexture() {
  const data = new Uint8Array(PIXEL_ATLAS_WIDTH * PIXEL_ATLAS_HEIGHT * 4)
  for (let y = 0; y < PIXEL_ATLAS_HEIGHT; y++) {
    for (let x = 0; x < PIXEL_ATLAS_WIDTH; x++) {
      const direction = octahedralDirectionFromUv(
        (x + 0.5) / PIXEL_ATLAS_WIDTH,
        (y + 0.5) / PIXEL_ATLAS_HEIGHT,
      )
      const { color, land, coast, biomeWeight } = surfaceSample(direction)
      if (land && !coast) {
        const grassTone = pixelGrassTone(x, y)
        const grassColor = PIXEL_GRASS_TONES[grassTone]
        if (grassColor) {
          color.lerp(
            grassColor,
            (1 - biomeWeight) * (Math.abs(grassTone) === 2 ? 0.35 : 0.22),
          )
        }
      }
      const offset = (y * PIXEL_ATLAS_WIDTH + x) * 4
      data[offset] = Math.round(color.r * 255)
      data[offset + 1] = Math.round(color.g * 255)
      data[offset + 2] = Math.round(color.b * 255)
      data[offset + 3] = land ? 255 : 0
    }
  }
  const texture = new THREE.DataTexture(
    data,
    PIXEL_ATLAS_WIDTH,
    PIXEL_ATLAS_HEIGHT,
    THREE.RGBAFormat,
  )
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function buildWaterFrames() {
  const size = WATER_FRAME_COUNT
  const wavelets = Array.from({ length: 15 }, (_, index) => {
    const random = (salt: number) => {
      const value = Math.sin((index + 1) * (12.9898 + salt * 17.17)) * 43758.5453
      return value - Math.floor(value)
    }
    return {
      x: Math.floor(random(1) * size),
      y: Math.floor(random(2) * size),
      length: 3 + Math.floor(random(3) * 7),
      phase: Math.floor(random(4) * size),
      speedX: random(5) > 0.5 ? 1 : -1,
      speedY: random(6) > 0.68 ? (random(7) > 0.5 ? 1 : -1) : 0,
      bend: random(8) > 0.5 ? 1 : -1,
      bright: random(9) > 0.7,
    }
  })
  return Array.from({ length: WATER_FRAME_COUNT }, (_, frame) => {
    const data = new Uint8Array(size * size)
    for (const wavelet of wavelets) {
      const localFrame = (frame + wavelet.phase) % size
      const originX = (wavelet.x + wavelet.speedX * localFrame + size * 2) % size
      const originY = (wavelet.y + wavelet.speedY * localFrame + size * 2) % size
      for (let step = 0; step < wavelet.length; step++) {
        if ((step + wavelet.phase) % 5 === 4) continue
        const x = (originX + step) % size
        const curve = Math.round(
          Math.sin((step / Math.max(1, wavelet.length - 1)) * Math.PI),
        )
        const y = (originY + curve * wavelet.bend + size) % size
        data[y * size + x] = wavelet.bright ? 255 : 150
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat)
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.needsUpdate = true
    return texture
  })
}

export interface GlobeSpinApi {
  spin: (horizontal: number, vertical: number) => void
  settle: () => void
}

function GlobeTerrain({ atlas }: { atlas: THREE.DataTexture }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uAtlas: { value: atlas },
        },
        vertexShader: `
          varying vec3 vDirection;
          varying vec3 vViewNormal;

          void main() {
            vDirection = normalize(position);
            vViewNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uAtlas;
          varying vec3 vDirection;
          varying vec3 vViewNormal;

          vec2 octEncode(vec3 normal) {
            normal /= abs(normal.x) + abs(normal.y) + abs(normal.z);
            vec2 encoded = normal.xy;
            if (normal.z < 0.0) {
              encoded = (1.0 - abs(encoded.yx)) * sign(encoded.xy);
            }
            return encoded * 0.5 + 0.5;
          }

          void main() {
            vec3 atlasColor = texture2D(uAtlas, octEncode(normalize(vDirection))).rgb;
            float diffuse = dot(normalize(vViewNormal), normalize(vec3(-0.35, 0.72, 0.6)));
            float lightBand = diffuse > 0.48 ? 1.0 : diffuse > 0.05 ? 0.95 : 0.9;
            gl_FragColor = vec4(atlasColor * lightBand, 1.0);
          }
        `,
      }),
    [atlas],
  )
  const geometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(PLANET_RADIUS, 192, 128)
    const position = sphere.getAttribute('position') as THREE.BufferAttribute
    const point = new THREE.Vector3()

    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index).normalize()
      const terrain = archipelagoSurface(
        [point.x, point.y, point.z],
        COURSE_DIRECTION_VALUES,
      )
      point.multiplyScalar(PLANET_RADIUS + terrain.elevation)
      position.setXYZ(index, point.x, point.y, point.z)
    }
    sphere.computeVertexNormals()
    return sphere
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return (
    <>
      <mesh geometry={geometry} material={material} receiveShadow />
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS + 0.34, 112, 72]} />
        <meshBasicMaterial
          color="#77bfd3"
          side={THREE.BackSide}
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS + 0.52, 96, 64]} />
        <meshBasicMaterial
          color="#6aaec4"
          side={THREE.BackSide}
          transparent
          opacity={0.035}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  )
}

function OceanSurface({ terrainAtlas }: { terrainAtlas: THREE.DataTexture }) {
  const geometry = useMemo(
    () => new THREE.SphereGeometry(PLANET_RADIUS + 0.17, 192, 128),
    [],
  )
  const frames = useMemo(() => buildWaterFrames(), [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthWrite: true,
        uniforms: {
          uTime: { value: 0 },
          uFlowSpeed: { value: WATER_FLOW_SPEED },
          uPatternA: { value: frames[0] },
          uPatternB: { value: frames[1] },
          uPatternMix: { value: 0 },
          uTerrainAtlas: { value: terrainAtlas },
          uDeep: { value: new THREE.Color('#2a7f9f') },
          uShallow: { value: new THREE.Color('#48abc4') },
          uFoam: { value: new THREE.Color('#d9fbf4') },
        },
        vertexShader: `
          uniform float uTime;
          uniform float uFlowSpeed;
          varying vec3 vDirection;

          void main() {
            vec3 direction = normalize(position);
            float flowTime = uTime * uFlowSpeed;
            float waveA = sin(dot(direction, normalize(vec3(0.72, 0.18, 0.67))) * 18.0 + flowTime * 2.0);
            float waveB = sin(dot(direction, normalize(vec3(-0.35, 0.82, 0.44))) * 27.0 - flowTime * 1.35 + 1.7);
            float waveC = sin(dot(direction, normalize(vec3(0.18, -0.51, 0.84))) * 35.0 + flowTime * 0.8 + 3.2);
            float displacement = waveA * 0.0035 + waveB * 0.002 + waveC * 0.0012;
            vec3 displaced = position + normal * displacement;
            vDirection = direction;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uFlowSpeed;
          uniform sampler2D uPatternA;
          uniform sampler2D uPatternB;
          uniform float uPatternMix;
          uniform sampler2D uTerrainAtlas;
          uniform vec3 uDeep;
          uniform vec3 uShallow;
          uniform vec3 uFoam;
          varying vec3 vDirection;

          vec2 octEncode(vec3 normal) {
            normal /= abs(normal.x) + abs(normal.y) + abs(normal.z);
            vec2 encoded = normal.xy;
            if (normal.z < 0.0) {
              encoded = (1.0 - abs(encoded.yx)) * sign(encoded.xy);
            }
            return encoded * 0.5 + 0.5;
          }

          void main() {
            vec2 atlasUv = octEncode(normalize(vDirection));
            vec2 pixel = vec2(1.0 / ${PIXEL_ATLAS_WIDTH.toFixed(1)}, 1.0 / ${PIXEL_ATLAS_HEIGHT.toFixed(1)});
            float neighboringLand = 0.0;
            neighboringLand = max(neighboringLand, texture2D(uTerrainAtlas, atlasUv + vec2(pixel.x, 0.0)).a);
            neighboringLand = max(neighboringLand, texture2D(uTerrainAtlas, atlasUv - vec2(pixel.x, 0.0)).a);
            neighboringLand = max(neighboringLand, texture2D(uTerrainAtlas, atlasUv + vec2(0.0, pixel.y)).a);
            neighboringLand = max(neighboringLand, texture2D(uTerrainAtlas, atlasUv - vec2(0.0, pixel.y)).a);

            float flowTime = uTime * uFlowSpeed;
            vec2 patternUv =
              atlasUv * vec2(5.5, 5.5) +
              vec2(flowTime * 0.025, -flowTime * 0.014);
            float patternA = texture2D(uPatternA, patternUv).r;
            float patternB = texture2D(uPatternB, patternUv).r;
            float pixelCrest = mix(patternA, patternB, uPatternMix);
            vec2 flowUv = atlasUv * vec2(26.0, 22.0);
            float softSwell = 0.5 + 0.5 * sin(
              flowUv.x * 0.13 +
              flowUv.y * 0.09 -
              flowTime * 0.36
            );
            vec3 water = mix(uDeep, uShallow, 0.22 + softSwell * 0.18);
            vec3 finalColor = mix(
              water,
              uFoam,
              max(pixelCrest * 0.2, neighboringLand * 0.76)
            );
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
      }),
    [frames, terrainAtlas],
  )

  useFrame(({ clock }) => {
    const frame = waterFrameState(clock.elapsedTime * 1000)
    // oxlint-disable-next-line react/immutability -- Three.js uniforms are mutable by design.
    material.uniforms.uTime.value = clock.elapsedTime
    // oxlint-disable-next-line react/immutability -- Three.js uniforms are mutable by design.
    material.uniforms.uPatternA.value = frames[frame.current]
    // oxlint-disable-next-line react/immutability -- Three.js uniforms are mutable by design.
    material.uniforms.uPatternB.value = frames[frame.next]
    // oxlint-disable-next-line react/immutability -- Three.js uniforms are mutable by design.
    material.uniforms.uPatternMix.value = frame.mix
  })

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      for (const frame of frames) frame.dispose()
    },
    [frames, geometry, material],
  )

  return <mesh geometry={geometry} material={material} renderOrder={1} />
}

function courseDirection(index: number) {
  return COURSE_DIRECTIONS[index].clone()
}

function tangentNorth(normal: THREE.Vector3) {
  const north = UP.clone().addScaledVector(normal, -UP.dot(normal))
  if (north.lengthSq() < 1e-5) north.set(0, 0, 1).addScaledVector(normal, -normal.z)
  return north.normalize()
}

function orientationFrame(normal: THREE.Vector3) {
  const north = tangentNorth(normal)
  const east = new THREE.Vector3().crossVectors(north, normal).normalize()
  return new THREE.Matrix4().makeBasis(east, north, normal)
}

function focusQuaternion(index: number) {
  const source = orientationFrame(courseDirection(index))
  const target = orientationFrame(FOCUS_NORMAL)
  const sourceQuaternion = new THREE.Quaternion().setFromRotationMatrix(source)
  const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(target)
  return targetQuaternion.multiply(sourceQuaternion.invert())
}

function shortestFocusQuaternion(current: THREE.Quaternion, index: number) {
  const currentDirection = courseDirection(index).applyQuaternion(current)
  const correction = new THREE.Quaternion().setFromUnitVectors(
    currentDirection,
    FOCUS_NORMAL,
  )
  return correction.multiply(current.clone())
}

function Pawn({
  color,
  position,
}: {
  color: string
  position: [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]} castShadow>
        <dodecahedronGeometry args={[0.09, 0]} />
        <meshToonMaterial color={color} gradientMap={toonGradient()} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.065, 12, 8]} />
        <meshToonMaterial color="#fff4df" gradientMap={toonGradient()} />
      </mesh>
    </group>
  )
}

function Landmark({
  course,
  index,
  position,
}: {
  course: CameraCourse
  index: number
  position: [number, number, number]
}) {
  const ink = '#342d45'
  if (course.biome === 'ice') {
    return index === 0 ? (
      <group position={position}>
        <mesh position={[0, 0.24, 0]} castShadow>
          <coneGeometry args={[0.22, 0.48, 10]} />
          <meshToonMaterial color="#e8f4f7" gradientMap={toonGradient()} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.09, 0.12, 0.22, 10]} />
          <meshToonMaterial color="#8fc9d8" gradientMap={toonGradient()} />
        </mesh>
      </group>
    ) : (
      <group position={position}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 0.36, 10]} />
          <meshToonMaterial color="#fff4df" gradientMap={toonGradient()} />
        </mesh>
        <mesh position={[0, 0.4, 0]} castShadow>
          <coneGeometry args={[0.2, 0.18, 10]} />
          <meshToonMaterial color="#9b8daf" gradientMap={toonGradient()} />
        </mesh>
      </group>
    )
  }
  if (course.biome === 'city') {
    return (
      <mesh position={[position[0], position[1] + 0.2, position[2]]} castShadow>
        <boxGeometry args={[0.22, 0.4 + index * 0.12, 0.22]} />
        <meshToonMaterial color={index % 2 ? '#fff4df' : course.accent} gradientMap={toonGradient()} />
      </mesh>
    )
  }
  if (course.biome === 'forest' || course.biome === 'meadow') {
    return (
      <group position={position}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.065, 0.24, 8]} />
          <meshToonMaterial color="#765a49" gradientMap={toonGradient()} />
        </mesh>
        <mesh position={[0, 0.31, 0]} castShadow>
          <coneGeometry args={[0.19 + index * 0.025, 0.34, 10]} />
          <meshToonMaterial color={course.ground} gradientMap={toonGradient()} />
        </mesh>
      </group>
    )
  }
  if (course.biome === 'volcanic') {
    return (
      <group position={position}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <coneGeometry args={[0.22 + index * 0.02, 0.32 + index * 0.08, 10]} />
          <meshToonMaterial color={ink} gradientMap={toonGradient()} />
        </mesh>
        <mesh position={[0, 0.31 + index * 0.04, 0]}>
          <sphereGeometry args={[0.055, 10, 7]} />
          <meshBasicMaterial color={course.accent} />
        </mesh>
      </group>
    )
  }
  if (course.biome === 'sand') {
    return (
      <mesh position={[position[0], position[1] + 0.12, position[2]]} scale={[1, 0.58, 1]} castShadow>
        <dodecahedronGeometry args={[0.2 + index * 0.025, 0]} />
        <meshToonMaterial color={index % 2 ? '#b9c96f' : course.accent} gradientMap={toonGradient()} />
      </mesh>
    )
  }
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.11, 0.3 + index * 0.06, 10]} />
        <meshToonMaterial color="#fff4df" gradientMap={toonGradient()} />
      </mesh>
      <mesh position={[0, 0.34 + index * 0.03, 0]} castShadow>
        <coneGeometry args={[0.14, 0.15, 10]} />
        <meshToonMaterial color={course.accent} gradientMap={toonGradient()} />
      </mesh>
    </group>
  )
}

function CourseCap({
  course,
  index,
  active,
}: {
  course: CameraCourse
  index: number
  active: boolean
}) {
  const state = markerState(course.progress)
  const cap = useRef<THREE.Group>(null)
  const content = useRef<THREE.Group>(null)
  const camera = useThree((three) => three.camera)
  const worldPosition = useRef(new THREE.Vector3())
  const worldQuaternion = useRef(new THREE.Quaternion())
  const worldNormal = useRef(new THREE.Vector3())
  const localDirection = useRef(new THREE.Vector3())
  const inverseWorld = useRef(new THREE.Quaternion())
  const direction = useMemo(() => courseDirection(index), [index])
  const quaternion = useMemo(() => {
    const north = tangentNorth(direction)
    const east = new THREE.Vector3().crossVectors(direction, north).normalize()
    return new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(east, direction, north),
    )
  }, [direction])
  const groundRelief = useMemo(() => surfaceSample(direction).relief, [direction])
  const position = useMemo(
    () => direction.clone().multiplyScalar(PLANET_RADIUS + groundRelief + 0.035),
    [direction, groundRelief],
  )
  const landmarkPositions: [number, number, number][] = LANDMARK_OFFSETS.map(
    ([x, z]) => [x, 0.15 + state.tiers * 0.09, z],
  )
  const pawnPositions: [number, number, number][] = PAWN_OFFSETS.map(
    ([x, z]) => [x, 0.14 + state.tiers * 0.09, z],
  )

  useFrame((_, delta) => {
    if (!content.current) return
    if (!active || !cap.current) {
      const blend = 1 - Math.exp(-6 * delta)
      content.current.rotation.y += (0 - content.current.rotation.y) * blend
      return
    }
    cap.current.getWorldPosition(worldPosition.current)
    cap.current.getWorldQuaternion(worldQuaternion.current)
    worldNormal.current
      .set(0, 1, 0)
      .applyQuaternion(worldQuaternion.current)
      .normalize()
    localDirection.current
      .copy(camera.position)
      .sub(worldPosition.current)
      .addScaledVector(
        worldNormal.current,
        -localDirection.current.dot(worldNormal.current),
      )
      .normalize()
    inverseWorld.current.copy(worldQuaternion.current).invert()
    localDirection.current.applyQuaternion(inverseWorld.current)
    const desired = Math.atan2(localDirection.current.x, localDirection.current.z)
    const difference = Math.atan2(
      Math.sin(desired - content.current.rotation.y),
      Math.cos(desired - content.current.rotation.y),
    )
    content.current.rotation.y += difference * (1 - Math.exp(-8 * delta))
  })

  return (
    <group
      ref={cap}
      position={position}
      quaternion={quaternion}
      scale={active ? 1.08 : 1}
    >
      <mesh position={[0, 0.045, 0]} castShadow>
        <cylinderGeometry
          args={[0.43 * state.footprintScale, 0.49 * state.footprintScale, 0.08, 14]}
        />
        <meshToonMaterial color={course.ground} gradientMap={toonGradient()} />
      </mesh>
      {active && (
        <mesh position={[0, 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.44 * state.footprintScale, 0.5 * state.footprintScale, 28]} />
          <meshBasicMaterial color="#fff3af" toneMapped={false} />
        </mesh>
      )}
      {Array.from({ length: state.tiers }, (_, tier) => (
        <mesh key={tier} position={[0, 0.12 + tier * 0.1, 0]} castShadow>
          <cylinderGeometry
            args={[
              (0.31 - tier * 0.035) * state.footprintScale,
              (0.34 - tier * 0.035) * state.footprintScale,
              0.1,
              12,
            ]}
          />
          <meshToonMaterial
            color={tier % 2 === 0 ? course.ground : course.accent}
            gradientMap={toonGradient()}
          />
        </mesh>
      ))}
      <group ref={content}>
        {landmarkPositions.slice(0, state.landmarkCount).map((markerPosition, markerIndex) => (
          <Landmark
            key={markerPosition.join(':')}
            course={course}
            index={markerIndex}
            position={markerPosition}
          />
        ))}
        {pawnPositions.slice(0, state.pawnCount).map((pawnPosition, pawnIndex) => (
          <Pawn
            key={pawnPosition.join(':')}
            color={pawnIndex % 2 ? course.accent : '#e88a8a'}
            position={pawnPosition}
          />
        ))}
      </group>
    </group>
  )
}

function greatCirclePoints(fromIndex: number, toIndex: number) {
  const from = courseDirection(fromIndex)
  const to = courseDirection(toIndex)
  const rotation = new THREE.Quaternion().setFromUnitVectors(from, to)
  const sampleRotation = new THREE.Quaternion()
  const points: THREE.Vector3[] = []
  for (let index = 0; index <= 40; index++) {
    const t = index / 40
    sampleRotation.identity().slerp(rotation, t)
    const direction = from.clone().applyQuaternion(sampleRotation).normalize()
    const relief = surfaceSample(direction).relief
    const lift = 0.07 + Math.sin(Math.PI * t) * 0.11
    points.push(direction.multiplyScalar(PLANET_RADIUS + relief + lift))
  }
  return points
}

function RouteTube({
  from,
  to,
  color,
  primary,
}: {
  from: number
  to: number
  color: string
  primary: boolean
}) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(greatCirclePoints(from, to)),
    [from, to],
  )
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, primary ? 0.05 : 0.036, 6, false]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={primary ? 0.95 : 0.68}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function RouteNetwork({ activeIndex }: { activeIndex: number }) {
  const neighbors = nearestCourseNeighbors(
    activeIndex,
    COURSE_DIRECTION_VALUES,
    3,
  )
  const colors = ['#fff0ae', '#c9c1ef', '#9ed9d0']
  return (
    <group>
      {neighbors.map((neighbor, index) => (
        <RouteTube
          key={`${activeIndex}:${neighbor}`}
          from={activeIndex}
          to={neighbor}
          color={colors[index]}
          primary={index === 0}
        />
      ))}
    </group>
  )
}

function MacroWavePatch({
  direction,
  phase,
}: {
  direction: THREE.Vector3
  phase: number
}) {
  const group = useRef<THREE.Group>(null)
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(UP, direction),
    [direction],
  )
  const crests = useMemo(
    () =>
      [-0.18, 0, 0.18].map(
        (offset, index) =>
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.46 + index * 0.035, 0, offset),
            new THREE.Vector3(-0.23, 0.07, offset + 0.055),
            new THREE.Vector3(0, 0.012, offset),
            new THREE.Vector3(0.23, 0.09, offset - 0.055),
            new THREE.Vector3(0.46 - index * 0.035, 0, offset),
          ]),
      ),
    [],
  )
  useFrame(({ clock }) => {
    if (!group.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.22 + phase) * 0.045
    group.current.scale.setScalar(pulse)
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.055 + phase) * 0.08
  })
  return (
    <group
      ref={group}
      position={direction.clone().multiplyScalar(PLANET_RADIUS + 0.22)}
      quaternion={quaternion}
    >
      {crests.map((curve, index) => (
        <mesh key={index} scale={0.8 + index * 0.1}>
          <tubeGeometry args={[curve, 32, 0.032, 5, false]} />
          <meshBasicMaterial
            color="#bce9ef"
            transparent
            opacity={0.32 + index * 0.1}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function oceanFeatureDirections(count: number, seed: string) {
  const candidates = seededCourseDirections(48, seed).map(
    (value) => new THREE.Vector3(...value),
  )
  const selected: THREE.Vector3[] = []
  for (const candidate of candidates) {
    const sample = surfaceSample(candidate)
    const nearestCourse = Math.max(
      ...COURSE_DIRECTIONS.map((course) => candidate.dot(course)),
    )
    const separated = selected.every((existing) => candidate.dot(existing) < 0.82)
    if (
      !sample.land &&
      nearestCourse < 0.78 &&
      separated
    ) {
      selected.push(candidate)
    }
    if (selected.length === count) break
  }
  return selected
}

function MacroWaveLayer() {
  const directions = useMemo(() => {
    return oceanFeatureDirections(7, 'studygotchi:macro-waves')
  }, [])
  return (
    <group>
      {directions.map((direction, index) => (
        <MacroWavePatch key={index} direction={direction} phase={index * 0.9} />
      ))}
    </group>
  )
}

function TinyShip({
  anchor,
  phase,
  color,
  variant,
}: {
  anchor: THREE.Vector3
  phase: number
  color: string
  variant: number
}) {
  const group = useRef<THREE.Group>(null)
  const north = useMemo(() => tangentNorth(anchor), [anchor])
  const east = useMemo(
    () => new THREE.Vector3().crossVectors(anchor, north).normalize(),
    [anchor, north],
  )
  useFrame(({ clock }) => {
    if (!group.current) return
    const angle = clock.elapsedTime * 0.16 + phase
    const orbitRadius = 0.09
    const tangent = east
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(north, Math.sin(angle))
      .normalize()
    const direction = anchor
      .clone()
      .multiplyScalar(Math.cos(orbitRadius))
      .addScaledVector(tangent, Math.sin(orbitRadius))
      .normalize()
    group.current.position.copy(direction).multiplyScalar(PLANET_RADIUS + 0.23)
    group.current.quaternion.setFromUnitVectors(UP, direction)
    group.current.rotateY(-angle + Math.PI / 2)
    group.current.position.addScaledVector(direction, Math.sin(clock.elapsedTime * 1.1 + phase) * 0.012)
  })
  return (
    <group ref={group} scale={variant === 1 ? 1.55 : 1.4}>
      <mesh position={[0, 0.04, 0]} scale={[1, 0.45, 1.7]}>
        <dodecahedronGeometry args={[variant === 1 ? 0.13 : 0.12, 0]} />
        <meshToonMaterial
          color={variant === 1 ? '#4d5967' : '#795b52'}
          gradientMap={toonGradient()}
        />
      </mesh>
      {variant === 1 ? (
        <>
          <mesh position={[0, 0.15, -0.015]}>
            <boxGeometry args={[0.16, 0.16, 0.24]} />
            <meshToonMaterial color="#fff1d0" gradientMap={toonGradient()} />
          </mesh>
          <mesh position={[0, 0.29, -0.06]}>
            <cylinderGeometry args={[0.035, 0.045, 0.19, 6]} />
            <meshToonMaterial color="#e88a8a" gradientMap={toonGradient()} />
          </mesh>
          <mesh position={[0, 0.41, -0.06]} scale={0.75}>
            <dodecahedronGeometry args={[0.055, 0]} />
            <meshBasicMaterial color="#d7d1df" transparent opacity={0.65} />
          </mesh>
        </>
      ) : (
        <>
          {variant === 2 ? [-0.11, 0.12].map((z) => (
            <group key={z} position={[0, 0, z]}>
              <mesh position={[0, 0.18, 0]}>
                <cylinderGeometry args={[0.014, 0.019, 0.3, 5]} />
                <meshToonMaterial color="#fff1d0" gradientMap={toonGradient()} />
              </mesh>
              <mesh position={[0.075, 0.24, 0]} rotation={[0, 0, -0.18]}>
                <coneGeometry args={[0.11, 0.25, 3]} />
                <meshToonMaterial color={color} gradientMap={toonGradient()} />
              </mesh>
            </group>
          )) : (
            <>
              <mesh position={[0, 0.18, 0]}>
                <cylinderGeometry args={[0.015, 0.02, 0.3, 5]} />
                <meshToonMaterial color="#fff1d0" gradientMap={toonGradient()} />
              </mesh>
              <mesh position={[0.08, 0.24, 0]} rotation={[0, 0, -0.18]}>
                <coneGeometry args={[0.13, 0.27, 3]} />
                <meshToonMaterial color={color} gradientMap={toonGradient()} />
              </mesh>
            </>
          )}
        </>
      )}
      <mesh position={[0, 0.085, 0.18]} scale={[1.1, 0.5, 0.45]}>
        <boxGeometry args={[0.08, 0.06, 0.12]} />
        <meshToonMaterial color={color} gradientMap={toonGradient()} />
      </mesh>
    </group>
  )
}

function ShipLayer() {
  const anchors = useMemo(
    () => oceanFeatureDirections(3, 'studygotchi:tiny-ships'),
    [],
  )
  const colors = ['#e88a8a', '#f2cf70', '#c9a2e6']
  return (
    <group>
      {anchors.map((anchor, index) => (
        <TinyShip
          key={index}
          anchor={anchor}
          phase={index * 2.1}
          color={colors[index]}
          variant={index}
        />
      ))}
    </group>
  )
}

function TerrainDetailLayer() {
  const details = useMemo(() => {
    const candidates = seededCourseDirections(42, 'studygotchi:terrain-details').map(
      (value) => new THREE.Vector3(...value),
    )
    return candidates
      .map((direction, index) => ({
        direction,
        index,
        sample: surfaceSample(direction),
      }))
      .filter(({ sample }) => sample.land)
      .slice(0, 18)
  }, [])
  return (
    <group>
      {details.map(({ direction, index, sample }) => {
        const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction)
        const band = sample.band
        return (
          <group
            key={index}
            position={direction
              .clone()
              .multiplyScalar(PLANET_RADIUS + surfaceSample(direction).relief + 0.07)}
            quaternion={quaternion}
          >
            <group rotation={[0, (index * 1.7) % (Math.PI * 2), 0]}>
              {band === 'lowland' ? (
                <mesh position={[0, 0.09, 0]}>
                  <coneGeometry args={[0.055, 0.18, 5]} />
                  <meshToonMaterial color="#5f8f61" gradientMap={toonGradient()} />
                </mesh>
              ) : band === 'highland' ? (
                <mesh position={[0, 0.07, 0]} scale={[1.3, 0.8, 1]}>
                  <dodecahedronGeometry args={[0.09, 0]} />
                  <meshToonMaterial color="#8f7d63" gradientMap={toonGradient()} />
                </mesh>
              ) : (
                <mesh position={[0, 0.1, 0]} rotation={[0.08, 0, -0.12]}>
                  <octahedronGeometry args={[0.1, 0]} />
                  <meshToonMaterial color="#d8edf3" gradientMap={toonGradient()} />
                </mesh>
              )}
            </group>
          </group>
        )
      })}
    </group>
  )
}

function CloudLayer() {
  const clouds = useMemo(
    () => {
      const directions: Array<[number, number, number]> = [
        [0.35, 0.78, 0.51],
        [-0.72, 0.51, 0.31],
        [0.68, -0.48, 0.55],
        [-0.45, -0.72, -0.52],
        [0.22, 0.38, -0.9],
      ]
      return directions.map((value) => new THREE.Vector3(...value).normalize())
    },
    [],
  )
  return (
    <group>
      {clouds.map((direction, index) => {
        const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction)
        return (
          <group
            key={index}
            position={direction
              .clone()
              .multiplyScalar(PLANET_RADIUS + surfaceSample(direction).relief + 0.42)}
            quaternion={quaternion}
            scale={0.7 + (index % 3) * 0.12}
          >
            {[-0.17, 0, 0.17].map((x, puff) => (
              <mesh key={x} position={[x, 0, puff === 1 ? 0.04 : 0]}>
                <dodecahedronGeometry args={[puff === 1 ? 0.16 : 0.12, 0]} />
                <meshToonMaterial
                  color="#e8eef4"
                  gradientMap={toonGradient()}
                  transparent
                  opacity={0.58}
                  depthWrite={false}
                />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

function OrbitingGlobe({
  activeIndex,
  onActiveChange,
  spinApi,
}: {
  activeIndex: number
  onActiveChange: (index: number) => void
  spinApi: RefObject<GlobeSpinApi | null>
}) {
  const group = useRef<THREE.Group>(null)
  const terrainAtlas = useMemo(() => buildPlanetAtlasTexture(), [])
  const target = useRef(focusQuaternion(activeIndex))
  const interacting = useRef(false)
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const camera = useThree((state) => state.camera)
  const cameraRight = useRef(new THREE.Vector3())
  const yawRotation = useRef(new THREE.Quaternion())
  const pitchRotation = useRef(new THREE.Quaternion())

  useEffect(() => () => terrainAtlas.dispose(), [terrainAtlas])

  useEffect(() => {
    target.current.copy(
      group.current
        ? shortestFocusQuaternion(group.current.quaternion, activeIndex)
        : focusQuaternion(activeIndex),
    )
  }, [activeIndex])

  useFrame((_, delta) => {
    if (!group.current || interacting.current) return
    const blend = 1 - Math.exp(-SNAP_DAMPING * delta)
    group.current.quaternion.slerp(target.current, blend)
  })

  const spin = (horizontal: number, vertical: number) => {
    if (!group.current) return
    interacting.current = true
    cameraRight.current.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
    yawRotation.current.setFromAxisAngle(camera.up, horizontal)
    pitchRotation.current.setFromAxisAngle(cameraRight.current, vertical)
    group.current.quaternion
      .premultiply(yawRotation.current)
      .premultiply(pitchRotation.current)
      .normalize()
    target.current.copy(group.current.quaternion)
  }

  const settle = () => {
    if (!group.current) return
    interacting.current = false
    let nearest = activeIndex
    let nearestDot = -Infinity
    for (let index = 0; index < COURSE_DIRECTIONS.length; index++) {
      const facing = COURSE_DIRECTIONS[index].clone().applyQuaternion(group.current.quaternion)
      const dot = facing.dot(FOCUS_NORMAL)
      if (dot > nearestDot) {
        nearestDot = dot
        nearest = index
      }
    }
    target.current.copy(shortestFocusQuaternion(group.current.quaternion, nearest))
    onActiveChange(nearest)
  }

  useImperativeHandle(
    spinApi,
    () => ({
      spin,
      settle,
    }),
  )

  const pointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    dragging.current = true
    interacting.current = true
    lastPointer.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
    ;(event.nativeEvent.target as Element | null)?.setPointerCapture?.(event.pointerId)
    document.body.style.cursor = 'grabbing'
  }

  const pointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !group.current) return
    event.stopPropagation()
    const dx = event.nativeEvent.clientX - lastPointer.current.x
    const dy = event.nativeEvent.clientY - lastPointer.current.y
    lastPointer.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
    spin(dx * 0.006, dy * 0.006)
  }

  const pointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !group.current) return
    event.stopPropagation()
    dragging.current = false
    document.body.style.cursor = 'grab'
    settle()
  }

  return (
    <group ref={group} position={[0, -1.3, 0]}>
      <GlobeTerrain atlas={terrainAtlas} />
      <OceanSurface terrainAtlas={terrainAtlas} />
      <MacroWaveLayer />
      <ShipLayer />
      <TerrainDetailLayer />
      <CloudLayer />
      <RouteNetwork activeIndex={activeIndex} />
      {CAMERA_COURSES.map((course, index) => (
        <CourseCap key={course.code} course={course} index={index} active={index === activeIndex} />
      ))}
      <mesh
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerOver={() => {
          if (!dragging.current) document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          if (!dragging.current) document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[PLANET_RADIUS + 0.8, 48, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function AutoFitCamera() {
  const size = useThree((state) => state.size)
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const aspect = Math.max(0.35, size.width / Math.max(1, size.height))
  const distance = cameraDistanceForSphere(
    PLANET_RADIUS,
    26,
    aspect,
    GLOBE_CAMERA_PADDING,
  )
  useLayoutEffect(() => {
    camera.position.set(0, distance * 0.1, distance)
    camera.lookAt(0, 0.08, 0)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }, [camera, distance])
  return null
}

function BackdropFiller() {
  const stars = useMemo(() => {
    const points = new Float32Array(84 * 3)
    for (let index = 0; index < 84; index++) {
      const seed = index + 1
      points[index * 3] = Math.sin(seed * 12.9898) * 11
      points[index * 3 + 1] = Math.sin(seed * 5.3983 + 1.7) * 7
      points[index * 3 + 2] = -7 - ((seed * 37) % 7)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
    return geometry
  }, [])

  return (
    <group>
      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial color="#fff6df" size={0.08} sizeAttenuation fog={false} />
      </points>
      <mesh position={[7.1, 3.1, -5.4]} scale={[1.1, 0.78, 1]}>
        <dodecahedronGeometry args={[0.58, 0]} />
        <meshToonMaterial color="#d6c8e6" gradientMap={toonGradient()} />
      </mesh>
      <mesh position={[-7.6, -2.8, -7.2]} scale={[1.2, 0.72, 1]}>
        <dodecahedronGeometry args={[0.48, 0]} />
        <meshToonMaterial color="#efd9a2" gradientMap={toonGradient()} />
      </mesh>
    </group>
  )
}

export function CameraGlobeScene({
  activeIndex,
  onActiveChange,
  pixelGrain,
  spinApi,
}: {
  activeIndex: number
  onActiveChange: (index: number) => void
  pixelGrain: number
  spinApi: RefObject<GlobeSpinApi | null>
}) {
  const pixelProfile = useMemo(
    () => ({ ...GLOBE_PIXEL_PROFILE_BASE, pixelSize: pixelGrain }),
    [pixelGrain],
  )
  return (
    <>
      <color attach="background" args={['#17152c']} />
      <fog attach="fog" args={['#17152c', 45, 80]} />
      <hemisphereLight args={['#b9c9ef', '#251d35', 0.58]} />
      <directionalLight position={[-7, 10, 9]} intensity={2.35} color="#fff0d5" />
      <AutoFitCamera />
      <BackdropFiller />
      <OrbitingGlobe
        activeIndex={activeIndex}
        onActiveChange={onActiveChange}
        spinApi={spinApi}
      />
      <PixelComposer profile={pixelProfile} />
    </>
  )
}
