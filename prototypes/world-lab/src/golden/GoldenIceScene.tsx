import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js'
import { toonGradient } from '../lib/toon'
import {
  CAMERA_POSES,
  GOLDEN_PALETTE,
  GOLDEN_RESIDENTS,
  progressState,
  rendererProfile,
  type GoldenVariant,
  type GoldenView,
} from './golden-spec'

export type HighlightMode = 'none' | 'outline' | 'rim' | 'ring' | 'lift'

/** Hover and selection wiring. Every field is optional; with none set the scene behaves as before. */
export interface SceneInteraction {
  hoveredId?: string | null
  highlight?: HighlightMode
  reducedMotion?: boolean
  onHover?: (id: string | null) => void
  onSelect?: (id: string) => void
}

/** The clickable landmarks and their ids. Positions are mirrored in interact-spec for label anchors. */
const GOLDEN_LANDMARKS = {
  observatory: { id: 'observatory', position: [1.9, 0.67, -1.45] as [number, number, number] },
  hutA: { id: 'hut-a', position: [-3.2, 0.65, -1.28] as [number, number, number], rotation: 0.35 },
  hutB: { id: 'hut-b', position: [-2.36, 0.65, -2.35] as [number, number, number], rotation: 0.72 },
} as const

interface GoldenIceSceneProps extends SceneInteraction {
  variant: GoldenVariant
  view: GoldenView
  progress: number
  onResidentFocus: () => void
}

const InteractionContext = createContext<SceneInteraction>({})

/* The hull is one pixel-pass pixel thick at the overview distance (about 0.07 world units),
   never thinner than a 1.06 scale, so it survives RenderPixelatedPass as a DS-style outline. */
const OUTLINE_THICKNESS = 0.07
const OUTLINE_MIN_SCALE = 1.06
/* meshes smaller than this (eyes) get no hull; they would turn into blobs */
const OUTLINE_MIN_RADIUS = 0.1
const LIFT_HEIGHT = 0.12
const LIFT_MS = 220
/** linear(0, .62 20%, 1.043 40%, .995 60%, 1 70%, 1), the Megaminx press-release spring. */
const SPRING_POINTS: [number, number][] = [
  [0, 0],
  [0.2, 0.62],
  [0.4, 1.043],
  [0.6, 0.995],
  [0.7, 1],
  [1, 1],
]

function springEase(t: number) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  for (let index = 1; index < SPRING_POINTS.length; index += 1) {
    const [t1, v1] = SPRING_POINTS[index]
    if (t <= t1) {
      const [t0, v0] = SPRING_POINTS[index - 1]
      return v0 + (v1 - v0) * ((t - t0) / (t1 - t0))
    }
  }
  return 1
}

function hasHullFlag(object: THREE.Object3D, root: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current && current !== root) {
    if (current.userData.noHull) return true
    current = current.parent
  }
  return false
}

interface InteractiveProps {
  id: string
  /** radius of the object's footprint; the ground ring is 1.4x this */
  footprint: number
  /** local y of the ground the ring lies on (0.02 above it) */
  groundY?: number
  children: React.ReactNode
}

/**
 * Reports hover and click for one object and renders the chosen highlight on it.
 * Wraps only static children: the inverted hull is cloned once per hover.
 */
function Interactive({ id, footprint, groundY = 0, children }: InteractiveProps) {
  const interaction = useContext(InteractionContext)
  const lift = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const spring = useRef({ from: 0, to: 0, start: -1, value: 0 })
  const hovered = interaction.hoveredId === id
  const mode: HighlightMode = hovered ? interaction.highlight ?? 'none' : 'none'
  const wired = Boolean(interaction.onHover || interaction.onSelect)

  useLayoutEffect(() => {
    const root = body.current
    if (mode !== 'outline' || !root) return
    const material = new THREE.MeshBasicMaterial({ color: GOLDEN_PALETTE.ink, side: THREE.BackSide })
    const holder = new THREE.Group()
    holder.userData.noHull = true
    root.updateWorldMatrix(true, true)
    const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert()
    const worldScale = new THREE.Vector3()
    const grow = new THREE.Matrix4()
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || hasHullFlag(object, root)) return
      const geometry = object.geometry as THREE.BufferGeometry
      if (!geometry.boundingSphere) geometry.computeBoundingSphere()
      worldScale.setFromMatrixScale(object.matrixWorld)
      const radius = (geometry.boundingSphere?.radius ?? 0) * Math.max(worldScale.x, worldScale.y, worldScale.z)
      if (radius < OUTLINE_MIN_RADIUS) return
      const scale = Math.max(OUTLINE_MIN_SCALE, 1 + OUTLINE_THICKNESS / radius)
      const hull = new THREE.Mesh(geometry, material)
      hull.matrixAutoUpdate = false
      hull.matrix.multiplyMatrices(inverse, object.matrixWorld).multiply(grow.makeScale(scale, scale, scale))
      holder.add(hull)
    })
    root.add(holder)
    return () => {
      root.remove(holder)
      material.dispose()
    }
  }, [mode])

  useEffect(() => {
    const root = body.current
    if (mode !== 'rim' || !root) return
    const restore: (() => void)[] = []
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const candidate of materials) {
        if (!('emissive' in candidate)) continue
        const material = candidate as THREE.MeshStandardMaterial
        const emissive = material.emissive.clone()
        const intensity = material.emissiveIntensity
        material.emissive.copy(material.color)
        material.emissiveIntensity = Math.max(intensity, 0.35)
        restore.push(() => {
          material.emissive.copy(emissive)
          material.emissiveIntensity = intensity
        })
      }
    })
    return () => restore.forEach((fn) => fn())
  }, [mode])

  useEffect(() => {
    const target = mode === 'lift' ? LIFT_HEIGHT : 0
    const state = spring.current
    if (state.to === target) return
    state.from = state.value
    state.to = target
    state.start = performance.now()
  }, [mode])

  useFrame(() => {
    const state = spring.current
    if (state.start < 0 || !lift.current) return
    const t = interaction.reducedMotion ? 1 : Math.min(1, (performance.now() - state.start) / LIFT_MS)
    state.value = state.from + (state.to - state.from) * springEase(t)
    lift.current.position.y = state.value
    if (t >= 1) state.start = -1
  })

  const ringRadius = footprint * 1.4
  return (
    <group
      onPointerOver={
        wired
          ? () => {
              document.body.style.cursor = 'pointer'
              interaction.onHover?.(id)
            }
          : undefined
      }
      onPointerOut={
        wired
          ? () => {
              document.body.style.cursor = 'auto'
              interaction.onHover?.(null)
            }
          : undefined
      }
      onClick={wired ? () => interaction.onSelect?.(id) : undefined}
    >
      {mode === 'ring' && (
        <mesh position={[0, groundY + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ noHull: true }}>
          <ringGeometry args={[ringRadius - 0.07, ringRadius, 32]} />
          <meshBasicMaterial color={GOLDEN_PALETTE.ink} side={THREE.DoubleSide} />
        </mesh>
      )}
      <group ref={lift}>
        <group ref={body}>{children}</group>
      </group>
    </group>
  )
}

interface SurfaceMaterialProps {
  variant: GoldenVariant
  color: string
  emissive?: string
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
}

function SurfaceMaterial({
  variant,
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
  side = THREE.FrontSide,
}: SurfaceMaterialProps) {
  if (variant === 'pixel') {
    return (
      <meshToonMaterial
        color={color}
        gradientMap={toonGradient()}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        transparent={transparent}
        opacity={opacity}
        side={side}
      />
    )
  }
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      roughness={0.78}
      metalness={0}
      transparent={transparent}
      opacity={opacity}
      side={side}
    />
  )
}

export function PixelComposer({ profile }: { profile: ReturnType<typeof rendererProfile> }) {
  const { gl, scene, camera, size } = useThree()
  const bundle = useMemo(() => {
    const composer = new EffectComposer(gl)
    const pixel = new RenderPixelatedPass(profile.pixelSize, scene, camera, {
      normalEdgeStrength: profile.normalEdgeStrength,
      depthEdgeStrength: profile.depthEdgeStrength,
    })
    composer.addPass(pixel)
    composer.addPass(new OutputPass())
    return { composer, pixel }
  }, [camera, gl, profile.depthEdgeStrength, profile.normalEdgeStrength, profile.pixelSize, scene])

  useEffect(() => {
    bundle.composer.setSize(size.width, size.height)
  }, [bundle.composer, size.height, size.width])

  useEffect(
    () => () => {
      bundle.pixel.dispose()
      bundle.composer.dispose()
    },
    [bundle],
  )

  useFrame((_, delta) => bundle.composer.render(delta), 1)
  return null
}

function CameraDirector({ view }: { view: GoldenView }) {
  const controls = useRef<CameraControls>(null)
  const initialized = useRef(false)

  useLayoutEffect(() => {
    const pose = CAMERA_POSES[view]
    let frame = 0
    const apply = () => {
      if (!controls.current) {
        frame = window.requestAnimationFrame(apply)
        return
      }
      void controls.current.setLookAt(
        pose.position[0],
        pose.position[1],
        pose.position[2],
        pose.target[0],
        pose.target[1],
        pose.target[2],
        initialized.current,
      )
      initialized.current = true
    }
    apply()
    return () => window.cancelAnimationFrame(frame)
  }, [view])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={4.4}
      maxDistance={18}
      minPolarAngle={0.64}
      maxPolarAngle={1.16}
      minAzimuthAngle={-1.05}
      maxAzimuthAngle={1.05}
      truckSpeed={0}
      dollySpeed={0.35}
      smoothTime={0.65}
      draggingSmoothTime={0.16}
    />
  )
}

function IslandPedestal({ variant }: { variant: GoldenVariant }) {
  return (
    <group scale={[1, 1, 0.86]}>
      <mesh position={[0, -0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[5.25, 4.72, 1.9, 14, 2, false]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.stone} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[5.72, 5.25, 0.72, 14, 1, false]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.iceDeep} />
      </mesh>
      <mesh position={[0, 0.55, 0]} receiveShadow>
        <cylinderGeometry args={[5.68, 5.72, 0.18, 14, 1, false]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.snow} />
      </mesh>
    </group>
  )
}

function PathLoop({ variant }: { variant: GoldenVariant }) {
  const loop = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-3.6, 0.69, 1.2),
          new THREE.Vector3(-2.2, 0.69, 2.65),
          new THREE.Vector3(0.2, 0.69, 2.8),
          new THREE.Vector3(2.7, 0.69, 1.95),
          new THREE.Vector3(3.35, 0.69, -0.1),
          new THREE.Vector3(2.1, 0.69, -2.45),
          new THREE.Vector3(-0.3, 0.69, -2.75),
          new THREE.Vector3(-3.1, 0.69, -1.75),
        ],
        true,
        'catmullrom',
        0.38,
      ),
    [],
  )
  const observatoryBranch = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.15, 0.7, -2.7),
        new THREE.Vector3(1.45, 0.72, -2.05),
        new THREE.Vector3(1.8, 0.75, -1.35),
      ]),
    [],
  )
  return (
    <>
      <mesh receiveShadow>
        <tubeGeometry args={[loop, 72, 0.14, 4, true]} />
        <SurfaceMaterial variant={variant} color="#d6c29f" />
      </mesh>
      <mesh receiveShadow>
        <tubeGeometry args={[observatoryBranch, 24, 0.13, 4, false]} />
        <SurfaceMaterial variant={variant} color="#d6c29f" />
      </mesh>
    </>
  )
}

function Pine({
  variant,
  position,
  scale = 1,
}: {
  variant: GoldenVariant
  position: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 0.84, 6]} />
        <SurfaceMaterial variant={variant} color="#786557" />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <coneGeometry args={[0.48, 0.8, 7]} />
        <SurfaceMaterial variant={variant} color="#6f9b91" />
      </mesh>
      <mesh position={[0, 1.22, 0]} castShadow>
        <coneGeometry args={[0.36, 0.68, 7]} />
        <SurfaceMaterial variant={variant} color="#8bb7ac" />
      </mesh>
      <mesh position={[0, 1.49, 0]} castShadow>
        <coneGeometry args={[0.23, 0.46, 7]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.snow} />
      </mesh>
    </group>
  )
}

function StudyCabin({
  variant,
  position,
  rotation = 0,
  id = 'hut',
}: {
  variant: GoldenVariant
  position: [number, number, number]
  rotation?: number
  id?: string
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Interactive id={id} footprint={0.72}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.15, 0.9, 0.95]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.cream} />
      </mesh>
      <mesh position={[0, 1.02, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.95, 0.7, 4]} />
        <SurfaceMaterial variant={variant} color="#9a769d" />
      </mesh>
      <mesh position={[0, 0.48, 0.49]}>
        <boxGeometry args={[0.24, 0.42, 0.04]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.ink} />
      </mesh>
      <mesh position={[-0.34, 0.56, 0.49]}>
        <boxGeometry args={[0.23, 0.2, 0.04]} />
        <SurfaceMaterial
          variant={variant}
          color={GOLDEN_PALETTE.light}
          emissive={GOLDEN_PALETTE.light}
          emissiveIntensity={0.38}
        />
      </mesh>
      </Interactive>
    </group>
  )
}

function Lamp({
  variant,
  position,
  lit,
}: {
  variant: GoldenVariant
  position: [number, number, number]
  lit: boolean
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.055, 0.84, 6]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.ink} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <octahedronGeometry args={[0.13, 0]} />
        <SurfaceMaterial
          variant={variant}
          color={lit ? GOLDEN_PALETTE.light : '#aaa4b4'}
          emissive={lit ? GOLDEN_PALETTE.light : '#000000'}
          emissiveIntensity={lit ? 1.25 : 0}
        />
      </mesh>
    </group>
  )
}

function Observatory({
  variant,
  progress,
}: {
  variant: GoldenVariant
  progress: number
}) {
  const state = progressState(progress)
  const beacon = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!beacon.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.06 * state.beaconStrength
    beacon.current.scale.setScalar(pulse)
    beacon.current.rotation.y = clock.elapsedTime * 0.3
  })

  return (
    <group position={GOLDEN_LANDMARKS.observatory.position}>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[1.58, 1.78, 0.24, 12]} />
        <SurfaceMaterial variant={variant} color="#c9dce5" />
      </mesh>
      <Interactive id={GOLDEN_LANDMARKS.observatory.id} footprint={0.96} groundY={0.24}>
      <mesh position={[0, 0.76, 0]} castShadow>
        <cylinderGeometry args={[0.82, 0.96, 1.35, 10]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.cream} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = -0.9 + index * 0.45
        const lit = index < state.litWindows
        return (
          <mesh
            key={angle}
            position={[Math.sin(angle) * 0.94, 0.82, Math.cos(angle) * 0.94]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[0.24, 0.32, 0.045]} />
            <SurfaceMaterial
              variant={variant}
              color={lit ? GOLDEN_PALETTE.light : '#aaa4b4'}
              emissive={lit ? GOLDEN_PALETTE.light : '#000000'}
              emissiveIntensity={lit ? 1.15 : 0}
            />
          </mesh>
        )
      })}
      <mesh position={[0, 1.52, 0]} scale={[1, 0.46, 1]} castShadow>
        <dodecahedronGeometry args={[1.02, 1]} />
        <SurfaceMaterial variant={variant} color="#9b8daf" />
      </mesh>
      <mesh position={[0, 1.86, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.56, 6]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.ink} />
      </mesh>
      <group ref={beacon} position={[0, 2.24, 0]} userData={{ noHull: true }}>
        <mesh>
          <octahedronGeometry args={[0.24, 0]} />
          <SurfaceMaterial
            variant={variant}
            color={state.beaconStrength ? GOLDEN_PALETTE.light : '#aaa4b4'}
            emissive={state.beaconStrength ? GOLDEN_PALETTE.light : '#000000'}
            emissiveIntensity={state.beaconStrength}
          />
        </mesh>
        {state.beaconStrength > 0 && (
          <pointLight
            color={GOLDEN_PALETTE.light}
            intensity={state.beaconStrength * 1.1}
            distance={6}
            decay={2}
          />
        )}
      </group>
      </Interactive>
    </group>
  )
}

function Crystal({
  variant,
  position,
  scale,
}: {
  variant: GoldenVariant
  position: [number, number, number]
  scale: number
}) {
  return (
    <mesh position={position} scale={scale} rotation={[0.08, 0.25, -0.12]} castShadow>
      <octahedronGeometry args={[0.32, 0]} />
      <SurfaceMaterial variant={variant} color="#91c8df" emissive="#91c8df" emissiveIntensity={0.16} />
    </mesh>
  )
}

function GroundShadow() {
  return (
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.46, 16]} />
      <meshBasicMaterial color="#342d45" transparent opacity={0.16} depthWrite={false} />
    </mesh>
  )
}

function ResidentMotion({
  phase,
  children,
  onClick,
  id,
  groundY = 0,
}: {
  phase: number
  children: React.ReactNode
  onClick?: () => void
  id?: string
  groundY?: number
}) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    const time = clock.elapsedTime + phase
    group.current.position.y = 0.04 + Math.sin(time * 2.1) * 0.035
    group.current.rotation.z = Math.sin(time * 1.15) * 0.025
  })
  return (
    <group
      ref={group}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <GroundShadow />
      {id ? (
        <Interactive id={id} footprint={0.5} groundY={groundY}>
          {children}
        </Interactive>
      ) : (
        children
      )}
    </group>
  )
}

interface ResidentProps {
  variant: GoldenVariant
  onClick: () => void
  id?: string
  groundY?: number
}

function IceBird({ variant, onClick, id, groundY }: ResidentProps) {
  return (
    <ResidentMotion phase={0.2} onClick={onClick} id={id} groundY={groundY}>
      <mesh position={[0, 0.43, 0]} scale={[0.9, 1.02, 0.78]} castShadow>
        <dodecahedronGeometry args={[0.52, 1]} />
        <SurfaceMaterial variant={variant} color="#dceef2" />
      </mesh>
      <mesh position={[0, 0.82, 0.12]} scale={[1, 0.96, 0.9]} castShadow>
        <icosahedronGeometry args={[0.39, 2]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.cream} />
      </mesh>
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.89, 0.47]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshBasicMaterial color={GOLDEN_PALETTE.ink} />
        </mesh>
      ))}
      <mesh position={[0, 0.78, 0.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.12, 0.34, 5]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.coral} />
      </mesh>
      {[-0.19, 0.19].map((x) => (
        <mesh key={x} position={[x, 0.08, 0.09]} scale={[1.5, 0.55, 1.05]}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.coral} />
        </mesh>
      ))}
    </ResidentMotion>
  )
}

function SnowBlob({ variant, onClick, id, groundY }: ResidentProps) {
  return (
    <ResidentMotion phase={1.4} onClick={onClick} id={id} groundY={groundY}>
      <mesh position={[0, 0.43, 0]} scale={[1.08, 0.88, 0.98]} castShadow>
        <dodecahedronGeometry args={[0.54, 1]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.cream} />
      </mesh>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, 0.56, 0.49]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color={GOLDEN_PALETTE.ink} />
        </mesh>
      ))}
      <mesh position={[0, 0.93, -0.02]} rotation={[0.03, 0, -0.08]} castShadow>
        <coneGeometry args={[0.38, 0.58, 8]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.mint} />
      </mesh>
      <mesh position={[0.08, 1.23, -0.01]} castShadow>
        <dodecahedronGeometry args={[0.12, 0]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.mint} />
      </mesh>
    </ResidentMotion>
  )
}

function BookBeetle({ variant, onClick, id, groundY }: ResidentProps) {
  return (
    <ResidentMotion phase={2.6} onClick={onClick} id={id} groundY={groundY}>
      <mesh position={[0, 0.38, 0]} scale={[0.76, 0.92, 0.68]} castShadow>
        <icosahedronGeometry args={[0.5, 2]} />
        <SurfaceMaterial variant={variant} color="#8f789f" />
      </mesh>
      <mesh position={[0, 0.73, 0.16]} castShadow>
        <icosahedronGeometry args={[0.32, 2]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.cream} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.79, 0.45]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshBasicMaterial color={GOLDEN_PALETTE.ink} />
        </mesh>
      ))}
      <group position={[0, 0.46, -0.43]} rotation={[0.08, 0, 0]}>
        <mesh position={[-0.18, 0, 0]}>
          <boxGeometry args={[0.34, 0.48, 0.08]} />
          <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.light} />
        </mesh>
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.34, 0.48, 0.08]} />
          <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.coral} />
        </mesh>
      </group>
    </ResidentMotion>
  )
}

/** The snow top sits at world y 0.64; residents stand in it, so the ring rises to the surface. */
const SNOW_TOP = 0.65

function Residents({
  variant,
  onResidentFocus,
  interactive,
}: {
  variant: GoldenVariant
  onResidentFocus: () => void
  interactive: boolean
}) {
  const [pip, mochi, glyph] = GOLDEN_RESIDENTS
  return (
    <>
      <group position={pip.position}>
        <IceBird
          variant={variant}
          onClick={onResidentFocus}
          id={interactive ? pip.id : undefined}
          groundY={SNOW_TOP - pip.position[1]}
        />
      </group>
      <group position={mochi.position}>
        <SnowBlob
          variant={variant}
          onClick={onResidentFocus}
          id={interactive ? mochi.id : undefined}
          groundY={SNOW_TOP - mochi.position[1]}
        />
      </group>
      <group position={glyph.position}>
        <BookBeetle
          variant={variant}
          onClick={onResidentFocus}
          id={interactive ? glyph.id : undefined}
          groundY={SNOW_TOP - glyph.position[1]}
        />
      </group>
    </>
  )
}

export function GoldenIceScene({
  variant,
  view,
  progress,
  onResidentFocus,
  hoveredId,
  highlight,
  reducedMotion,
  onHover,
  onSelect,
}: GoldenIceSceneProps) {
  const profile = rendererProfile(variant)
  const state = progressState(progress)
  const interaction = useMemo<SceneInteraction>(
    () => ({ hoveredId, highlight, reducedMotion, onHover, onSelect }),
    [highlight, hoveredId, onHover, onSelect, reducedMotion],
  )
  const interactive = Boolean(onHover || onSelect)
  const lampPositions: [number, number, number][] = [
    [-3.1, 0.66, 1.75],
    [-1.3, 0.66, 2.72],
    [1.0, 0.66, 2.58],
    [3.2, 0.66, 0.72],
    [2.85, 0.66, -1.55],
  ]
  const crystalPositions: [number, number, number][] = [
    [-1.22, 0.87, -2.35],
    [-0.72, 0.82, -2.55],
    [-1.55, 0.79, -1.88],
    [-0.42, 0.77, -2.05],
    [-1.86, 0.73, -2.68],
  ]

  return (
    <InteractionContext value={interaction}>
      <color attach="background" args={[GOLDEN_PALETTE.sky]} />
      <fog attach="fog" args={[GOLDEN_PALETTE.sky, 16, 32]} />
      <hemisphereLight args={['#dff4ff', '#8e799e', variant === 'pixel' ? 0.42 : 0.58]} />
      <directionalLight
        position={[6, 10, 8]}
        intensity={variant === 'pixel' ? 2.15 : 2.5}
        color="#fff1d9"
        castShadow
        shadow-mapSize-width={variant === 'pixel' ? 1024 : 2048}
        shadow-mapSize-height={variant === 'pixel' ? 1024 : 2048}
        shadow-camera-near={1}
        shadow-camera-far={32}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
      />

      <IslandPedestal variant={variant} />
      <PathLoop variant={variant} />

      <mesh position={[2.65, 0.67, 1.42]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.12, 18]} />
        <SurfaceMaterial variant={variant} color="#8fc6db" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[2.65, 0.69, 1.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.84, 1.13, 18]} />
        <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.snow} side={THREE.DoubleSide} />
      </mesh>

      <Observatory variant={variant} progress={progress} />
      <StudyCabin
        variant={variant}
        position={GOLDEN_LANDMARKS.hutA.position}
        rotation={GOLDEN_LANDMARKS.hutA.rotation}
        id={GOLDEN_LANDMARKS.hutA.id}
      />
      <StudyCabin
        variant={variant}
        position={GOLDEN_LANDMARKS.hutB.position}
        rotation={GOLDEN_LANDMARKS.hutB.rotation}
        id={GOLDEN_LANDMARKS.hutB.id}
      />

      <group>
        <Pine variant={variant} position={[-4.15, 0.63, 0.15]} scale={1.05} />
        <Pine variant={variant} position={[-3.72, 0.63, 0.62]} scale={0.78} />
        <Pine variant={variant} position={[3.92, 0.63, 0.12]} scale={0.92} />
        <Pine variant={variant} position={[4.15, 0.63, -0.55]} scale={0.72} />
        <Pine variant={variant} position={[0.05, 0.63, -3.52]} scale={0.9} />
      </group>

      {lampPositions.map((position, index) => (
        <Lamp key={position.join(':')} variant={variant} position={position} lit={index < state.litWindows} />
      ))}
      {crystalPositions.slice(0, state.crystalCount).map((position, index) => (
        <Crystal
          key={position.join(':')}
          variant={variant}
          position={position}
          scale={0.8 + index * 0.07}
        />
      ))}

      <Residents variant={variant} onResidentFocus={onResidentFocus} interactive={interactive} />
      <CameraDirector view={view} />
      {variant === 'pixel' && <PixelComposer profile={profile} />}
    </InteractionContext>
  )
}
