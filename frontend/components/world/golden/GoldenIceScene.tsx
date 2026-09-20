'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js'
import { toonGradient } from './toon'
import { CREATURE_DISPLAY_HEIGHT } from '@/lib/world/creature-scale'
import {
  CAMERA_POSES,
  GOLDEN_PALETTE,
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
  skyColor?: string
  lightScale?: number
  catastrophe?: boolean
  celebrate?: boolean
  populate?: number
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
  children: ReactNode
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
      if (!initialized.current) {
        void controls.current.setLookAt(
          pose.position[0] * 1.45,
          pose.position[1] * 2.4,
          pose.position[2] * 1.45,
          pose.target[0],
          pose.target[1],
          pose.target[2],
          false,
        )
      }
      void controls.current.setLookAt(
        pose.position[0],
        pose.position[1],
        pose.position[2],
        pose.target[0],
        pose.target[1],
        pose.target[2],
        true,
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

const DEMO_CAST = [
  { id: 'verity', kind: 'yellow-ball' as const, position: [-2.15, 0.64, 2.05] as [number, number, number], color: '#ffe14a' },
  { id: 'lovity', kind: 'peach-ball' as const, position: [1.48, 0.64, 2.38] as [number, number, number], color: '#f4b39a' },
  { id: 'blob', kind: 'ice-blob' as const, position: [-0.2, 0.64, -1.15] as [number, number, number], color: '#dceef2' },
  { id: 'minion', kind: 'minion' as const, position: [2.4, 0.64, 0.35] as [number, number, number], color: '#8fc9d8' },
]

function OurDemoCast({
  variant,
  count,
  dismantle,
}: {
  variant: GoldenVariant
  count: number
  dismantle: boolean
}) {
  return (
    <group name="our-character-slots" userData={{ displayHeight: CREATURE_DISPLAY_HEIGHT }}>
      {DEMO_CAST.slice(0, count).map((member, index) => (
        <DemoCreature key={member.id} variant={variant} member={member} phase={index * 0.8} dismantle={dismantle} />
      ))}
    </group>
  )
}

function DemoCreature({
  variant,
  member,
  phase,
  dismantle,
}: {
  variant: GoldenVariant
  member: (typeof DEMO_CAST)[number]
  phase: number
  dismantle: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const bits = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const root = group.current
    const scatter = bits.current
    if (!root || !scatter) return
    const t = clock.elapsedTime + phase
    if (dismantle) {
      root.position.y = member.position[1] + Math.abs(Math.sin(t * 6)) * 0.08
      root.rotation.z = Math.sin(t * 8) * 0.9
      root.rotation.x = Math.cos(t * 7) * 0.4
      scatter.children.forEach((child, index) => {
        child.position.x = Math.sin(t * 3 + index) * (0.35 + index * 0.12)
        child.position.y = 0.2 + Math.abs(Math.sin(t * 5 + index)) * 0.55
        child.position.z = Math.cos(t * 2.4 + index) * 0.28
        child.rotation.x = t * (1.4 + index)
        child.rotation.y = t * 1.1
      })
      return
    }
    root.position.y = member.position[1] + Math.abs(Math.sin(t * 3.2)) * 0.03
    root.rotation.set(0, Math.sin(t * 0.6) * 0.2, 0)
    scatter.children.forEach((child) => {
      child.position.set(0, 0, 0)
      child.rotation.set(0, 0, 0)
    })
  })
  const height = CREATURE_DISPLAY_HEIGHT
  return (
    <group ref={group} position={member.position} scale={height / 0.82}>
      <group ref={bits}>
        {member.kind === 'minion' ? (
          <>
            <mesh position={[0, 0.28, 0]} castShadow>
              <capsuleGeometry args={[0.2, 0.28, 6, 10]} />
              <SurfaceMaterial variant={variant} color={member.color} />
            </mesh>
            <mesh position={[0, 0.58, 0.06]} castShadow>
              <sphereGeometry args={[0.18, 10, 8]} />
              <SurfaceMaterial variant={variant} color="#fff6df" />
            </mesh>
            <mesh position={[-0.16, 0.18, 0.04]} rotation={[0, 0, 0.4]}>
              <capsuleGeometry args={[0.05, 0.16, 4, 6]} />
              <SurfaceMaterial variant={variant} color={member.color} />
            </mesh>
            <mesh position={[0.16, 0.18, 0.04]} rotation={[0, 0, -0.4]}>
              <capsuleGeometry args={[0.05, 0.16, 4, 6]} />
              <SurfaceMaterial variant={variant} color={member.color} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, 0.32, 0]} castShadow>
              <sphereGeometry args={[0.32, 14, 12]} />
              <SurfaceMaterial variant={variant} color={member.color} />
            </mesh>
            {member.kind === 'yellow-ball' ? (
              <mesh position={[0, 0.32, 0]} rotation={[0.2, 0, 0]}>
                <torusGeometry args={[0.325, 0.035, 8, 18]} />
                <SurfaceMaterial variant={variant} color="#342d45" />
              </mesh>
            ) : null}
            {member.kind === 'ice-blob' ? (
              <mesh position={[0, 0.52, 0]} castShadow>
                <sphereGeometry args={[0.18, 10, 8]} />
                <SurfaceMaterial variant={variant} color="#fff6df" />
              </mesh>
            ) : null}
          </>
        )}
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, member.kind === 'minion' ? 0.62 : 0.38, 0.26]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color="#342d45" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function IceCatastrophe({ active }: { active: boolean }) {
  const flakes = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!flakes.current) return
    flakes.current.children.forEach((child, index) => {
      const t = clock.elapsedTime * (0.8 + (index % 5) * 0.12) + index
      child.position.y = 0.4 + ((t * 0.7) % 3.2)
      child.position.x = Math.sin(t * 0.9 + index) * 4.2
      child.position.z = Math.cos(t * 0.7 + index) * 3.6
    })
  })
  if (!active) return null
  return (
    <group>
      {[[-1.4, 0.67, 0.8], [0.6, 0.67, -1.2], [2.1, 0.67, 1.1], [-2.4, 0.67, -0.6]].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} rotation={[-Math.PI / 2, 0, index * 0.4]}>
          <ringGeometry args={[0.08, 0.34 + index * 0.06, 7]} />
          <meshBasicMaterial color="#342d45" transparent opacity={0.42} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <group ref={flakes}>
        {Array.from({ length: 18 }, (_, index) => (
          <mesh key={index} position={[0, 1, 0]}>
            <octahedronGeometry args={[0.05, 0]} />
            <meshBasicMaterial color="#fff6df" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function GoldenIceScene({
  variant,
  view,
  progress,
  onResidentFocus: _onResidentFocus,
  hoveredId,
  highlight,
  reducedMotion,
  onHover,
  onSelect,
  skyColor = GOLDEN_PALETTE.sky,
  lightScale = 1,
  catastrophe = false,
  celebrate = false,
  populate = 1,
}: GoldenIceSceneProps) {
  const profile = rendererProfile(variant)
  const grown = celebrate ? Math.max(progress, 1) : progress
  const state = progressState(grown)
  const frontier = grown <= 0.01
  const fogFar = catastrophe ? 14 : frontier ? 11 : grown < 0.6 ? 22 : 32
  const fogNear = catastrophe ? 4 : frontier ? 3 : 16
  const sceneSky = catastrophe ? '#4d3d5d' : frontier ? '#c5bfd4' : skyColor
  const landRise = 1 + grown * 0.08 + (celebrate ? 0.06 : 0)
  const extraGrowth = grown >= 0.99 || celebrate
  const characterCount = frontier ? 0 : Math.round(DEMO_CAST.length * Math.min(1, populate))
  const interaction = useMemo<SceneInteraction>(
    () => ({ hoveredId, highlight, reducedMotion, onHover, onSelect }),
    [highlight, hoveredId, onHover, onSelect, reducedMotion],
  )
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
      <color attach="background" args={[sceneSky]} />
      <fog attach="fog" args={[sceneSky, fogNear, fogFar]} />
      <hemisphereLight args={['#dff4ff', '#8e799e', (variant === 'pixel' ? 0.42 : 0.58) * lightScale]} />
      <directionalLight
        position={[6, 10, 8]}
        intensity={(catastrophe ? 0.85 : variant === 'pixel' ? 2.15 : 2.5) * lightScale}
        color={catastrophe ? '#c9b8e8' : '#fff1d9'}
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

      <group scale={[1, landRise, 1]}>
        <IslandPedestal variant={variant} />
        {!frontier ? <PathLoop variant={variant} /> : null}

        <mesh position={[2.65, 0.67, 1.42]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.12, 18]} />
          <SurfaceMaterial variant={variant} color="#8fc6db" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[2.65, 0.69, 1.42]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.84, 1.13, 18]} />
          <SurfaceMaterial variant={variant} color={GOLDEN_PALETTE.snow} side={THREE.DoubleSide} />
        </mesh>

        <group
          scale={frontier ? 0.52 : catastrophe ? 0.92 : extraGrowth ? 1.08 : 1}
          rotation={catastrophe ? [0.08, 0, 0.12] : [0, 0, 0]}
        >
          <Observatory variant={variant} progress={grown} />
        </group>
        {!frontier && populate >= 0.5 ? (
          <StudyCabin
            variant={variant}
            position={GOLDEN_LANDMARKS.hutA.position}
            rotation={GOLDEN_LANDMARKS.hutA.rotation}
            id={GOLDEN_LANDMARKS.hutA.id}
          />
        ) : null}
        {!frontier && populate >= 1 ? (
          <StudyCabin
            variant={variant}
            position={GOLDEN_LANDMARKS.hutB.position}
            rotation={GOLDEN_LANDMARKS.hutB.rotation}
            id={GOLDEN_LANDMARKS.hutB.id}
          />
        ) : null}

        <group>
          <Pine variant={variant} position={[-4.15, 0.63, 0.15]} scale={1.05} />
          {populate >= 0.5 ? <Pine variant={variant} position={[-3.72, 0.63, 0.62]} scale={0.78} /> : null}
          {populate >= 0.5 ? <Pine variant={variant} position={[3.92, 0.63, 0.12]} scale={0.92} /> : null}
          {populate >= 1 ? <Pine variant={variant} position={[4.15, 0.63, -0.55]} scale={0.72} /> : null}
          {populate >= 1 ? <Pine variant={variant} position={[0.05, 0.63, -3.52]} scale={0.9} /> : null}
          {extraGrowth ? <Pine variant={variant} position={[-1.8, 0.63, 3.1]} scale={0.7} /> : null}
          {extraGrowth ? <Pine variant={variant} position={[3.4, 0.63, -2.2]} scale={0.64} /> : null}
        </group>

        {lampPositions.map((position, index) => (
          <Lamp key={position.join(':')} variant={variant} position={position} lit={!frontier && index < state.litWindows} />
        ))}
        {crystalPositions.slice(0, frontier ? 0 : state.crystalCount).map((position, index) => (
          <Crystal
            key={position.join(':')}
            variant={variant}
            position={position}
            scale={0.8 + index * 0.07}
          />
        ))}

        <OurDemoCast variant={variant} count={characterCount} dismantle={catastrophe} />
        <IceCatastrophe active={catastrophe} />
      </group>
      <CameraDirector view={view} />
      {variant === 'pixel' && <PixelComposer profile={profile} />}
    </InteractionContext>
  )
}
