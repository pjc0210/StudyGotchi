import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { CameraControlsImpl, ScrollControls, useScroll } from '@react-three/drei'
import { MapMarker, courseFraction } from '../components/MapMarker'
import { Signpost } from '../components/Signpost'
import { Catastrophe, GrowthHero, catastrophePhase, type CatastrophePhase, type CatastropheState } from '../components/Growth'
import { NIGHT, NIGHT_SKY_DEFAULT } from '../lib/night'
import { setToonNight } from '../lib/toon'
import { viewing } from '../lib/viewing'
import { yawToward } from '../lib/landmarks'
import { RoadLayer, arcPoints } from '../components/Roads'
import * as THREE from 'three'
import {
  BUMP_HEIGHT,
  PLANET_R,
  METRES_TO_UNITS,
  PLANET_SKY as SKY,
  PROP_SCALE,
  WATER_LEVEL,
  baseHeight,
  builtByCourse,
  bumpsAt,
  creatureCount,
  groundHeight,
  nearestCourse,
  orientOnSphere,
  sampleBase,
  sampleMapColor,
  applyRelief,
  reliefFor,
  waterRadius,
  type Course,
  type DecorItem,
  type Planet,
  type Sample,
  type Topic,
} from '../lib/galaxy'
import type { Concept } from '../lib/world'
import { toonGradient, toonMaterial } from '../lib/toon'
import { LandmarkLayer } from '../components/LandmarkLayer'
import type { PlazaPlacement, SpotPlacement } from '../lib/landmarks'
import { BiomeRoads, Plazas, TerrainPieces } from '../components/BiomeLayers'
import type { BlobMotion } from '../components/Blob'
import { Creature } from '../components/Creature'
import { spawnCount } from '../data/roster'
import { CREATURE_SCALE } from '../lib/scale'
import { useAssets } from '../lib/assets'
import { FLOATING, type Placement } from '../components/Decor'
import { GlbDecorLayer } from '../components/GlbDecor'
import { Label } from '../components/Label'
import { makeRng, hashString } from '../lib/seed'
import type { Selection } from '../App'
import { BiomeDiorama } from './BiomeDiorama'

const R = PLANET_R

// camera: level 1 is a long lens on a far camera (world bible §3.1), level 2 a wider lens above the biome
/** level-1 map lens; the Canvas starts with it (App.tsx) */
export const P2_FOV = 26
/** level-2 lens */
const FOV_L2 = 30
/** level 1 (world bible: 6.4 R); `?d1=2.5` pulls the map camera in for marker close-ups */
const D1_DEBUG = parseFloat(new URLSearchParams(window.location.search).get('d1') ?? '') || 6.4
/** level-1 map: the sphere's centre sits at this fraction of the viewport width; the left column holds the course cards */
export const MAP_ANCHOR = 0.66
/** facing pose: a marker is seen this far from above, its signpost upright (world bible §3.2) */
const MAP_ELEVATION_DEFAULT = THREE.MathUtils.degToRad(26)
// on the site page the viewing panel overrides these live (src/lib/viewing.ts)
const d1 = () => (viewing.active ? viewing.dist : D1_DEBUG) * R
const mapFov = () => (viewing.active ? viewing.fov : P2_FOV)
const mapAnchorX = () => (viewing.active ? viewing.paneAx ?? viewing.ax : MAP_ANCHOR)
const mapAnchorY = () => (viewing.active ? viewing.paneAy ?? viewing.ay : 0.5)
const mapElevation = () => (viewing.active ? THREE.MathUtils.degToRad(viewing.pitch) : MAP_ELEVATION_DEFAULT)
const HOME_TILT = THREE.MathUtils.degToRad(20)
/** level 2: the biome (chord 2 R sin ρ) fills this fraction of the frame width */
const BIOME_FILL = 0.7
const D_TOPIC = 0.42 * R // level 2, snapped to one topic
const D_MID = 1.3 * R // variant B: where the fly-in gets cut by the cross-fade
/** polar angle from the surface normal: 48° = the camera looks 42° down onto the biome, horizon in frame */
const PITCH = THREE.MathUtils.degToRad(48)
const PITCH_TOPIC = THREE.MathUtils.degToRad(40)

export type ZoomVariant = 'continuous' | 'swap'
export type Planet2Level = 'planet' | 'flying' | 'biome'
export type ScrollMode = 'stops' | 'continuous'

// ---------------------------------------------------------------------------
// camera poses

interface Pose {
  pos: THREE.Vector3
  target: THREE.Vector3
  up: THREE.Vector3
  /** vertical fov at this pose (lerped during flights) */
  fov?: number
  /** horizontal anchor of the projection centre (MAP_ANCHOR at level 1, 0.5 at level 2) */
  anchor?: number
  /** vertical anchor (site page: viewing.ay, otherwise 0.5) */
  anchorY?: number
  /** terrain colours: 1 = flat map, 0 = level-2 detail */
  mapMix?: number
}

/** level-2 distance so the biome chord fills BIOME_FILL of the frame width */
function biomeDistance(course: Course, aspect: number) {
  const chord = 2 * R * Math.sin(course.radius)
  return chord / (BIOME_FILL * 2 * Math.tan(THREE.MathUtils.degToRad(FOV_L2) / 2) * aspect)
}

/** "south" on the tangent plane at n (so world north stays up on screen); near the poles fall back to the camera side */
function sideTangent(n: THREE.Vector3, cameraDir: THREE.Vector3) {
  const t = new THREE.Vector3(0, -1, 0).addScaledVector(n, n.y)
  if (t.lengthSq() < 0.08) t.copy(cameraDir).addScaledVector(n, -cameraDir.dot(n))
  if (t.lengthSq() < 1e-6) t.set(1, 0, 0).addScaledVector(n, -n.x)
  return t.normalize()
}

function level1Pose(hint: THREE.Vector3, anchor = 0.5): Pose {
  const y = THREE.MathUtils.clamp(hint.y / Math.max(hint.length(), 1e-6), -0.6, 0.6)
  const xz = new THREE.Vector2(hint.x, hint.z)
  if (xz.lengthSq() < 1e-6) xz.set(0, 1)
  xz.setLength(Math.sqrt(1 - y * y))
  return { pos: new THREE.Vector3(xz.x, y, xz.y).multiplyScalar(d1()), target: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fov: mapFov(), anchor, anchorY: mapAnchorY(), mapMix: 1 }
}

/** map facing pose for a course: seen MAP_ELEVATION from above with its north up on screen */
function facingPose(course: Course): Pose {
  const el = mapElevation()
  const pos = course.dir.clone().multiplyScalar(Math.cos(el)).addScaledVector(course.north, -Math.sin(el)).normalize().multiplyScalar(d1())
  return { pos, target: new THREE.Vector3(), up: course.north.clone(), fov: mapFov(), anchor: mapAnchorX(), anchorY: mapAnchorY(), mapMix: 1 }
}

function homePose(): Pose {
  return { pos: new THREE.Vector3(0, Math.sin(HOME_TILT), Math.cos(HOME_TILT)).multiplyScalar(d1()), target: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fov: mapFov(), anchor: mapAnchorX(), anchorY: mapAnchorY(), mapMix: 1 }
}

function abovePose(surface: THREE.Vector3, up: THREE.Vector3, side: THREE.Vector3, distance: number, pitch = PITCH): Pose {
  const pos = surface.clone().addScaledVector(up, distance * Math.cos(pitch)).addScaledVector(side, distance * Math.sin(pitch))
  return { pos, target: surface.clone(), up: up.clone(), fov: FOV_L2, anchor: 0.5, anchorY: 0.5, mapMix: 0 }
}

function easeInOutCubic(k: number) {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
}
function easeInQuad(k: number) {
  return k * k
}

interface Flight {
  t: number
  dur: number
  from: Pose
  to: Pose
  ease: (k: number) => number
  curTarget: THREE.Vector3
  midAt?: number
  midFired?: boolean
  onMid?: () => void
  onDone: () => void
}

function applyClamps(c: CameraControlsImpl, level: 1 | 2) {
  if (level === 1) {
    c.minDistance = 2.2 * R
    c.maxDistance = 6.5 * R
    c.minPolarAngle = 0.15
    c.maxPolarAngle = Math.PI - 0.15
  } else {
    // orbit around the biome centre with the surface normal as up; the horizon is allowed in frame
    c.minDistance = 0.12 * R
    c.maxDistance = 2.4 * R
    c.minPolarAngle = 0.1
    c.maxPolarAngle = 1.1
  }
}

/**
 * Own camera-controls instance instead of drei's <CameraControls>: the drei wrapper calls
 * update() every frame even when disabled, which would fight the manual fly-in.
 */
function usePlanetControls() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const events = useThree((s) => s.events)
  const controls = useMemo(() => {
    CameraControlsImpl.install({ THREE })
    const c = new CameraControlsImpl(camera)
    c.smoothTime = 0.55
    c.draggingSmoothTime = 0.12
    c.mouseButtons.right = CameraControlsImpl.ACTION.NONE
    c.mouseButtons.middle = CameraControlsImpl.ACTION.NONE
    c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY
    c.touches.three = CameraControlsImpl.ACTION.NONE
    return c
  }, [camera])
  useEffect(() => {
    const el = (events.connected as unknown as HTMLElement | undefined) ?? gl.domElement
    controls.connect(el)
    return () => {
      controls.disconnect()
      controls.dispose()
    }
  }, [controls, events.connected, gl])
  return controls
}

// ---------------------------------------------------------------------------
// terrain

const _sphere = new THREE.Sphere(new THREE.Vector3(), R + 1.5)
const _hit = new THREE.Vector3()

function PlanetTerrain2({
  planet,
  built,
  onClick,
  mapMix,
  night,
  nightOffset,
}: {
  planet: Planet
  built: Concept[][]
  onClick: (course: Course, e: ThreeEvent<MouseEvent>) => void
  /** 1 = flat level-1 map colours, 0 = level-2 detail colours; lerped by flights */
  mapMix?: React.RefObject<number>
  night?: boolean
  nightOffset?: number
}) {
  // base pass, once per seed: course/topic lookup + noise per vertex, plus the flat level-1 map colours
  const base = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 256, 192)
    const pos = g.attributes.position as THREE.BufferAttribute
    const n = pos.count
    const dirs = new Float32Array(pos.array as Float32Array)
    const h = new Float32Array(n)
    const col = new Float32Array(n * 3)
    const mcol = new Float32Array(n * 3)
    const dcol = new Float32Array(n * 3)
    const course = new Uint8Array(n)
    const dir = new THREE.Vector3()
    const s: Sample = { h: 0, r: 0, g: 0, b: 0 }
    for (let i = 0; i < n; i++) {
      dir.set(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]).normalize()
      dirs[i * 3] = dir.x
      dirs[i * 3 + 1] = dir.y
      dirs[i * 3 + 2] = dir.z
      const c = sampleBase(planet, dir, s)
      h[i] = s.h
      col[i * 3] = s.r
      col[i * 3 + 1] = s.g
      col[i * 3 + 2] = s.b
      course[i] = c.index
      sampleMapColor(planet, dir, s)
      mcol[i * 3] = s.r
      mcol[i * 3 + 1] = s.g
      mcol[i * 3 + 2] = s.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    return { g, dirs, h, col, mcol, dcol, course }
  }, [planet])

  // progress pass: landmark mounds + relief multiplier; detail colours go to dcol, the blend below writes the attribute
  const applied = useRef(-1)
  useLayoutEffect(() => {
    const { g, dirs, h, col, dcol, course } = base
    const pos = g.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const dir = new THREE.Vector3()
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      dir.set(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2])
      const bump = bumpsAt(built[course[i]], dir)
      const r = R + applyRelief(planet, course[i], h[i]) + bump
      arr[i * 3] = dir.x * r
      arr[i * 3 + 1] = dir.y * r
      arr[i * 3 + 2] = dir.z * r
      c.setRGB(col[i * 3], col[i * 3 + 1], col[i * 3 + 2])
      // mounds read as lit-up ground in any palette (a fixed pale stone looked like polka dots on dark biomes)
      if (bump > 0.01) c.offsetHSL(0, -0.05, Math.min(0.14, (bump / BUMP_HEIGHT) * 0.14))
      dcol[i * 3] = c.r
      dcol[i * 3 + 1] = c.g
      dcol[i * 3 + 2] = c.b
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    g.computeBoundingSphere()
    applied.current = -1
  }, [base, built, planet])

  // map ↔ detail colour blend (mapMix 1 = flat board-game map, 0 = level-2 sub-region tints)
  useFrame(() => {
    const mix = mapMix?.current ?? 0
    if (Math.abs(mix - applied.current) < 0.002) return
    applied.current = mix
    const colAttr = base.g.attributes.color as THREE.BufferAttribute
    const carr = colAttr.array as Float32Array
    const { mcol, dcol } = base
    for (let i = 0; i < carr.length; i++) carr[i] = dcol[i] + (mcol[i] - dcol[i]) * mix
    colAttr.needsUpdate = true
  })

  useEffect(() => () => base.g.dispose(), [base])

  const material = useMemo(() => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() }), [])
  // night: the material colour multiplies the vertex colours (lightness offset −0.08..−0.3, cooled)
  useEffect(() => {
    const k = night ? THREE.MathUtils.clamp(1 + (nightOffset ?? -0.22) * 2.2, 0.3, 1) : 1
    material.color.setRGB(k * 0.9, k * 0.92, k * (night ? 1.08 : 1))
    setToonNight(!!night)
  }, [material, night, nightOffset])

  // picking a course patch does not need triangle accuracy: intersect the ray with the sphere analytically
  // (keeps pointer-move raycasts over a 50k-vertex mesh essentially free)
  const meshRef = useRef<THREE.Mesh>(null)
  const raycast = useCallback((raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => {
    const p = raycaster.ray.intersectSphere(_sphere, _hit)
    if (p && meshRef.current) intersects.push({ distance: raycaster.ray.origin.distanceTo(p), point: p.clone(), object: meshRef.current })
  }, [])

  return (
    <mesh
      ref={meshRef}
      geometry={base.g}
      material={material}
      raycast={raycast}
      onClick={(e) => {
        if (e.delta > 4) return
        e.stopPropagation()
        onClick(nearestCourse(planet.courses, e.point.clone().normalize()), e)
      }}
    />
  )
}

function WaterCaps({ topics }: { topics: Topic[] }) {
  const caps = useMemo(
    () =>
      topics
        .filter((t) => t.kind.profile === 'water')
        .map((t) => ({
          topic: t,
          geometry: new THREE.SphereGeometry(R + WATER_LEVEL, 48, 10, 0, Math.PI * 2, 0, waterRadius(t)),
          quaternion: orientOnSphere(t.dir),
        })),
    [topics],
  )
  useEffect(() => () => caps.forEach((c) => c.geometry.dispose()), [caps])
  return (
    <>
      {caps.map((c) => (
        <mesh key={c.topic.index} geometry={c.geometry} quaternion={c.quaternion} material={toonMaterial(c.topic.kind.alt)} />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// things standing on the planet

function useSphereSpots(planet: Planet, built: Concept[][]): { spots: SpotPlacement[]; plazas: PlazaPlacement[] } {
  return useMemo(
    () => ({
      spots: planet.spots.map((concept) => ({
        concept,
        position: concept.dir.clone().multiplyScalar(R + groundHeight(planet, concept.dir, built) + 0.16),
        quaternion: orientOnSphere(concept.dir),
        scale: PROP_SCALE,
      })),
      plazas: planet.topics.map((topic) => ({
        topic,
        position: topic.dir.clone().multiplyScalar(R + groundHeight(planet, topic.dir, built) + 0.2),
        quaternion: orientOnSphere(topic.dir),
        scale: PROP_SCALE * (topic.hub ? 1.15 : 1),
      })),
    }),
    [planet, built],
  )
}

/** Same wander as PlanetCreature, constrained to the topic sub-region. */
function Planet2Creature({
  planet,
  topic,
  pset,
  built,
  onSelect,
  selected,
}: {
  planet: Planet
  topic: Topic
  pset: number
  built: Concept[][]
  onSelect: (s: Selection) => void
  selected: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const motion = useRef<BlobMotion>({ moving: false, t: 0 })
  const state = useRef(
    (() => {
      const rng = makeRng(hashString(planet.seed + ':p2creature:' + topic.course.code + ':' + pset))
      const jitter = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(topic.radius * 1.2)
      const dir = topic.dir.clone().add(jitter).normalize()
      const heading = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).cross(dir).normalize()
      return { dir, heading, timer: rng() * 2, moving: rng() > 0.5, rng }
    })(),
  )

  useFrame((_, dt) => {
    const s = state.current
    const g = group.current
    if (!g) return
    motion.current.t += dt
    s.timer -= dt
    if (s.timer <= 0) {
      s.moving = !s.moving
      s.timer = s.moving ? 1.5 + s.rng() * 3 : 1 + s.rng() * 2.5
      if (s.moving) s.heading.applyAxisAngle(s.dir, (s.rng() - 0.5) * 2.4)
    }
    motion.current.moving = s.moving
    if (s.moving) {
      const home = topic.dir
      // roam a little wider than the concept spots so the (now larger) creatures mostly skirt the landmarks
      if (s.dir.dot(home) < Math.cos(topic.radius * 0.8)) {
        const toHome = home.clone().sub(s.dir.clone().multiplyScalar(home.dot(s.dir))).normalize()
        s.heading.lerp(toHome, dt * 2).normalize()
      }
      s.dir.addScaledVector(s.heading, dt * 0.02).normalize()
      s.heading.sub(s.dir.clone().multiplyScalar(s.heading.dot(s.dir))).normalize()
    }
    const r = R + groundHeight(planet, s.dir, built)
    g.position.copy(s.dir).multiplyScalar(r)
    const right = new THREE.Vector3().crossVectors(s.dir, s.heading).normalize()
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, s.dir, s.heading))
  })

  return (
    <group ref={group} scale={CREATURE_SCALE.planet2}>
      <Creature
        biome={topic.biome}
        index={pset}
        water={topic.kind.profile === 'water'}
        topicIndex={topic.index}
        motion={motion}
        selected={selected}
        onClick={() => onSelect({ kind: 'creature', index: pset, cluster: topic, course: topic.course })}
      />
    </group>
  )
}

function CourseMarker({ planet, course, built, showLabel, onClick }: { planet: Planet; course: Course; built: Concept[][]; showLabel: boolean; onClick: (c: Course) => void }) {
  const { position, quaternion } = useMemo(
    () => ({ position: course.dir.clone().multiplyScalar(R + groundHeight(planet, course.dir, built) + 0.1), quaternion: orientOnSphere(course.dir) }),
    [planet, course, built],
  )
  return (
    <group position={position} quaternion={quaternion}>
      <mesh
        position={[0, 0.25, 0]}
        material={toonMaterial(course.biome.accent)}
        onClick={(e) => {
          if (e.delta > 4) return
          e.stopPropagation()
          onClick(course)
        }}
      >
        <cylinderGeometry args={[2.6, 3.0, 0.5, 20]} />
      </mesh>
      {showLabel && <Label position={[0, 4, 0]} text={course.code} color={course.biome.accent} />}
    </group>
  )
}

/** one 3D signpost per topic at its plaza edge, facing the course centre (replaces the DOM pills) */
function TopicMarkers({ planet, course, built, onSelect }: { planet: Planet; course: Course; built: Concept[][]; onSelect: (s: Selection) => void }) {
  const posts = useMemo(
    () =>
      course.topics.map((t) => {
        // toward the course centre (the hub), just outside the plaza rim
        const toward = course.dir.clone().sub(t.dir).addScaledVector(t.dir, -course.dir.clone().sub(t.dir).dot(t.dir))
        if (toward.lengthSq() < 1e-6) toward.copy(course.east)
        toward.normalize()
        const r = (METRES_TO_UNITS * (t.hub ? 4.6 : 2.8)) / R
        const dir = t.dir.clone().addScaledVector(toward, Math.tan(r)).normalize()
        const q = orientOnSphere(dir)
        const yaw = yawToward(dir, q, course.dir.clone().addScaledVector(toward, 2))
        q.multiply(new THREE.Quaternion().setFromAxisAngle(UP_Y, yaw))
        return { t, position: dir.clone().multiplyScalar(R + groundHeight(planet, dir, built) + 0.1), quaternion: q }
      }),
    [planet, course, built],
  )
  return (
    <>
      {posts.map(({ t, position, quaternion }) => (
        <group
          key={t.index}
          position={position}
          quaternion={quaternion}
          scale={PROP_SCALE * 1.15}
          onClick={(e) => {
            if (e.delta > 4) return
            e.stopPropagation()
            onSelect({ kind: 'cluster', cluster: t })
          }}
        >
          <Signpost text={t.name} accent={course.biome.accent} />
        </group>
      ))}
    </>
  )
}
const UP_Y = new THREE.Vector3(0, 1, 0)

// ---------------------------------------------------------------------------
// level-1 map: one pedestal marker per course, roads between them, scroll-driven orbit

/** a page-level scroll driver for the site mode (window scroll instead of drei's container) */
export interface ScrollSource {
  top(): number
  span(): number
  scrollTo(top: number, smooth: boolean): void
  /** element that receives pointer events (for drag tracking) */
  el: HTMLElement
  onScroll(fn: () => void): () => void
}

export interface MapApi {
  /** smooth-scroll to course stop k */
  scrollTo(k: number): void
  /** forward a wheel delta from an overlay (the left column) to the scroll container */
  scrollBy(dy: number): void
}

const Y_UP = new THREE.Vector3(0, 1, 0)

/** drei's scroll container for the standalone lab; a plain fragment when the page itself scrolls */
function MaybeScroll({ pages, enabled, external, children }: { pages: number; enabled: boolean; external: boolean; children: React.ReactNode }) {
  if (external) return <>{children}</>
  return (
    <ScrollControls pages={pages} damping={0.2} enabled={enabled}>
      {children}
    </ScrollControls>
  )
}

/** 800 instanced points on a far sphere; only at night */
function StarField() {
  const geometry = useMemo(() => {
    const n = 800
    const pos = new Float32Array(n * 3)
    const rng = makeRng(1234567)
    for (let i = 0; i < n; i++) {
      const z = rng() * 2 - 1
      const t = rng() * Math.PI * 2
      const r = Math.sqrt(1 - z * z) * 12 * R
      pos[i * 3] = Math.cos(t) * r
      pos[i * 3 + 1] = z * 12 * R
      pos[i * 3 + 2] = Math.sin(t) * r
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  const material = useMemo(() => new THREE.PointsMaterial({ color: '#ffffff', size: 3.5, sizeAttenuation: true, fog: false }), [])
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/** marker frame: local +Z along −north, i.e. toward the viewer in the facing pose (world bible §3.5) */
function markerFrame(course: Course) {
  const q = orientOnSphere(course.dir)
  const z = new THREE.Vector3(0, 0, 1).applyQuaternion(q)
  const south = course.north.clone().negate()
  const angle = Math.atan2(new THREE.Vector3().crossVectors(z, south).dot(course.dir), z.dot(south))
  return q.multiply(new THREE.Quaternion().setFromAxisAngle(Y_UP, angle))
}

/** markers are ~9 units tall as authored (3 tiers + creature); scaled so they read as ~20% of the planet diameter */
const MARKER_SCALE = (0.2 * 2 * R) / 9

function MapMarkers({ planet, progress, onClick }: { planet: Planet; progress: number; onClick: (c: Course) => void }) {
  const placements = useMemo(
    () =>
      planet.courses.map((course) => ({
        course,
        position: course.dir.clone().multiplyScalar(R + Math.max(baseHeight(planet, course.dir), WATER_LEVEL + 0.3) + 0.05),
        quaternion: markerFrame(course),
      })),
    [planet],
  )
  return (
    <>
      {placements.map((p) => (
        <group key={p.course.index} position={p.position} quaternion={p.quaternion} scale={MARKER_SCALE * (viewing.active ? viewing.marker : 1)}>
          <MapMarker course={p.course} progress={progress} onClick={onClick} />
        </group>
      ))}
    </>
  )
}

/** ring road through the markers in tour order (world bible §3.6 v1); causeways over water bowls */
function MapRoads({ planet }: { planet: Planet }) {
  const paths = useMemo(() => {
    const surface = (dir: THREE.Vector3) => dir.clone().multiplyScalar(R + Math.max(baseHeight(planet, dir), WATER_LEVEL + 0.35) + 0.25)
    const dirs = planet.courses.map((c) => c.dir)
    const n = dirs.length
    const links: [number, number][] = []
    for (let i = 0; i < n; i++) links.push([i, (i + 1) % n])
    return links.map(([a, b]) => arcPoints(dirs[a], dirs[b], 96, surface))
  }, [planet])
  return <RoadLayer paths={paths} width={0.042 * R} lift={0.5} core="#b7a58f" edge="#d9cbb5" />
}

/** slerp two poses (direction from the planet centre + up vector) */
function mixPose(a: Pose, b: Pose, k: number, out: { pos: THREE.Vector3; up: THREE.Vector3 }) {
  _fromDir.copy(a.pos).normalize()
  _toDir.copy(b.pos).normalize()
  _qA.setFromUnitVectors(_fromDir, _toDir)
  _qI.identity().slerp(_qA, k)
  out.pos.copy(_fromDir).applyQuaternion(_qI).multiplyScalar(THREE.MathUtils.lerp(a.pos.length(), b.pos.length(), k))
  out.up.copy(a.up).applyQuaternion(_qI).lerp(b.up, k).normalize()
}

/**
 * Scroll → camera. `stops`: N + 1 sections (home, then one per course in tour order), eased slerp
 * between facing poses with a 40% dwell, snap to the nearest section when scrolling ends.
 * `continuous`: scroll offset → azimuth around the belt, free, nearest course is the active one.
 * Dragging the planet still works; the next scroll movement takes the camera back.
 */
function MapOrbit({
  planet,
  controls,
  camera,
  enabled,
  mode,
  initialStop,
  onStop,
  api,
  source,
}: {
  planet: Planet
  controls: CameraControlsImpl
  camera: THREE.Camera
  enabled: boolean
  mode: ScrollMode
  initialStop: number
  onStop: (k: number) => void
  api: React.RefObject<MapApi | null>
  /** site page: drive from window scroll; otherwise drei's ScrollControls container */
  source?: ScrollSource
}) {
  const drei = useScroll() as ReturnType<typeof useScroll> | null
  const scroll = useMemo<ScrollSource>(() => {
    if (source) return source
    const el = drei!.el
    return {
      top: () => el.scrollTop,
      span: () => el.scrollHeight - el.clientHeight,
      scrollTo: (top, smooth) => el.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' }),
      el,
      onScroll: (fn) => {
        el.addEventListener('scroll', fn)
        return () => el.removeEventListener('scroll', fn)
      },
    }
  }, [source, drei])
  const damped = useRef(0)
  const n = planet.courses.length
  const sections = n + 1
  const lastOffset = useRef(-1)
  const lastStop = useRef(-1)
  const lastScrollAt = useRef(0)
  const poses = useMemo(() => [homePose(), ...planet.courses.map((c) => facingPose(c))], [planet])
  const lastViewing = useRef(0)
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), up: new THREE.Vector3() }), [])

  useEffect(() => {
    // stop k (course index) lives in section k + 1; continuous mode maps course k to azimuth k / n
    const topFor = (k: number) => (mode === 'stops' ? ((k + 1) / (sections - 1)) * scroll.span() : (k / n) * scroll.span())
    api.current = {
      scrollTo: (k) => scroll.scrollTo(topFor(THREE.MathUtils.clamp(k, 0, n - 1)), true),
      scrollBy: (dy) => scroll.scrollTo(scroll.top() + dy, false),
    }
    const off = scroll.onScroll(() => {
      lastScrollAt.current = performance.now()
    })
    // drei parks its container at scrollTop = 1 and swallows the first scroll event; jump to the
    // deep-linked stop twice (the second event always gets through). The page source jumps once.
    const jump = () => {
      scroll.scrollTo(topFor(initialStop) + (source ? 0 : 1), false)
      lastOffset.current = -1
    }
    const t = window.setTimeout(jump, 150)
    const t2 = source ? 0 : window.setTimeout(jump, 450)
    return () => {
      window.clearTimeout(t)
      if (t2) window.clearTimeout(t2)
      off()
      api.current = null
    }
  }, [scroll, source, n, sections, mode, api, initialStop])

  // camera-controls' `active` also covers its own damping, so track the pointer ourselves
  const dragging = useRef(false)
  useEffect(() => {
    const el = scroll.el
    const down = () => (dragging.current = true)
    const up = () => (dragging.current = false)
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [scroll])

  useFrame((_, dt) => {
    if (!enabled) return
    // drei damps its own offset; the page source is damped here (time constant 0.2 s)
    const raw = source ? THREE.MathUtils.clamp(scroll.top() / Math.max(1, scroll.span()), 0, 1) : THREE.MathUtils.clamp(drei!.offset, 0, 1)
    damped.current += (raw - damped.current) * Math.min(1, dt / 0.2)
    const offset = source ? damped.current : raw
    // the viewing panel changes the framing live at level 1
    if (viewing.active) {
      const cam = camera as THREE.PerspectiveCamera
      if (Math.abs(cam.fov - viewing.fov) > 1e-3) {
        cam.fov = viewing.fov
        cam.updateProjectionMatrix()
      }
      if (Math.abs(lastViewing.current - (viewing.dist + viewing.pitch * 100)) > 1e-6) {
        lastViewing.current = viewing.dist + viewing.pitch * 100
        poses.splice(0, poses.length, homePose(), ...planet.courses.map((c) => facingPose(c)))
        lastOffset.current = -1
      }
    }
    let stop: number
    if (mode === 'stops') {
      const t = offset * (sections - 1)
      const i = Math.min(sections - 2, Math.floor(t))
      const f = t - i
      // dwell: each section holds its pose for 40% of its scroll length (world bible §3.2)
      const e = THREE.MathUtils.smoothstep(f, 0.2, 0.8)
      mixPose(poses[i], poses[i + 1], e, tmp)
      stop = Math.max(0, Math.round(t) - 1)
    } else {
      const az = offset * Math.PI * 2
      const el = THREE.MathUtils.degToRad(22)
      tmp.pos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d1())
      tmp.up.set(0, 1, 0)
      stop = Math.round((offset * n) % n) % n
    }
    if (stop !== lastStop.current) {
      lastStop.current = stop
      onStop(stop)
    }
    if (Math.abs(offset - lastOffset.current) > 1e-4) {
      lastOffset.current = offset
      if (!dragging.current) {
        camera.up.copy(tmp.up)
        controls.updateCameraUp()
        controls.setLookAt(tmp.pos.x, tmp.pos.y, tmp.pos.z, 0, 0, 0, false)
      }
    }
    if (mode !== 'stops') return
    // snap to the nearest section once the user stops scrolling
    const now = performance.now()
    if (lastScrollAt.current > 0 && now - lastScrollAt.current > 260) {
      const span = scroll.span()
      const rawT = (scroll.top() / span) * (sections - 1)
      const target = Math.round(rawT)
      if (target <= sections - 1 && Math.abs(rawT - target) > 0.004) {
        scroll.scrollTo((target / (sections - 1)) * span, true)
        lastScrollAt.current = now
      } else lastScrollAt.current = 0
    }
  })
  return null
}

/**
 * Shifts the projection so the sphere's centre sits at `anchor.current` of the width (MAP_ANCHOR
 * at level 1, 0.5 at level 2; flights lerp it). Re-applied every frame it changes and on resize.
 */
function useViewAnchor(active: boolean, anchor: React.RefObject<number>, anchorY: React.RefObject<number>) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const applied = useRef(-1)
  useEffect(() => {
    applied.current = -1
    if (!active) camera.clearViewOffset()
  }, [camera, size, active])
  useFrame(() => {
    const key = anchor.current * 10 + anchorY.current
    if (!active || Math.abs(applied.current - key) < 1e-5) return
    applied.current = key
    camera.setViewOffset(size.width, size.height, -(anchor.current - 0.5) * size.width, -(anchorY.current - 0.5) * size.height, size.width, size.height)
  })
}

// ---------------------------------------------------------------------------
// scene

const _fromDir = new THREE.Vector3()
const _toDir = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _target = new THREE.Vector3()
const _qA = new THREE.Quaternion()
const _qI = new THREE.Quaternion()

export function Planet2Scene({
  planet,
  progress,
  variant,
  focusCourse,
  focusTopic,
  selection,
  onSelect,
  onLevel,
  onFade,
  detail = false,
  initialStop = 0,
  scrollMode = 'stops',
  onStop,
  mapApi,
  catastrophe = null,
  onCatastrophePhase,
  night = false,
  scrollSource,
}: {
  planet: Planet
  progress: number
  variant: ZoomVariant
  /** course to zoom into, null for the whole planet */
  focusCourse: Course | null
  /** topic to snap to inside the focused course */
  focusTopic: Topic | null
  selection: Selection | null
  onSelect: (s: Selection | null) => void
  onLevel: (level: Planet2Level) => void
  /** variant B cross-fade: 0 = clear, 1 = sky-coloured overlay */
  onFade: (opacity: number) => void
  /** `?detail=1`: the old level 1 with every landmark, creature and decor item on the sphere */
  detail?: boolean
  /** map level 1: course stop to start at */
  initialStop?: number
  /** map level 1: N snap stops or free rotation */
  scrollMode?: ScrollMode
  onStop?: (k: number) => void
  mapApi?: React.RefObject<MapApi | null>
  /** running catastrophe choreography (App owns the state and the debug trigger) */
  catastrophe?: CatastropheState | null
  onCatastrophePhase?: (p: CatastrophePhase) => void
  night?: boolean
  /** site page: the window scroll drives the orbit (no drei ScrollControls container) */
  scrollSource?: ScrollSource
}) {
  const camera = useThree((s) => s.camera)
  const controls = usePlanetControls()
  // growth: relief scales with each course's demonstrated fraction, set before anything samples the ground
  const built = useMemo(() => {
    planet.courses.forEach((c) => (planet.relief[c.index] = reliefFor(courseFraction(c, progress))))
    return builtByCourse(planet, progress)
  }, [planet, progress])
  const { crowd } = useAssets()
  const mapMix = useRef(1)
  const { spots, plazas } = useSphereSpots(planet, built)
  const localApi = useRef<MapApi | null>(null)
  const api = mapApi ?? localApi
  const size = useThree((s) => s.size)

  const [view, setView] = useState<'planet' | 'diorama'>('planet')
  const mapMode = !detail && view === 'planet'
  const anchor = useRef(mapMode ? mapAnchorX() : 0.5)
  const anchorY = useRef(mapMode ? mapAnchorY() : 0.5)
  useViewAnchor(mapMode, anchor, anchorY)
  useFrame(() => {
    if (viewing.active && mapMode && levelRef.current === 'planet' && !flight.current) {
      anchor.current = viewing.paneAx ?? viewing.ax
      anchorY.current = viewing.paneAy ?? viewing.ay
    }
  })
  useEffect(() => {
    // the wheel scrolls the stops in map mode; camera-controls must not also dolly with it
    controls.mouseButtons.wheel = mapMode ? CameraControlsImpl.ACTION.NONE : CameraControlsImpl.ACTION.DOLLY
  }, [controls, mapMode])
  const [dioramaCourse, setDioramaCourse] = useState<Course | null>(null)
  const [labelsFor, setLabelsFor] = useState<Course | null>(null)
  const levelRef = useRef<Planet2Level>('planet')
  const focusedRef = useRef<Course | null>(null)
  const flight = useRef<Flight | null>(null)
  const fog = useRef<THREE.Fog>(null)
  const timers = useRef<number[]>([])
  const selectionRef = useRef(selection)
  selectionRef.current = selection

  const setLevel = useCallback(
    (l: Planet2Level) => {
      levelRef.current = l
      onLevel(l)
    },
    [onLevel],
  )
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const applyLens = (fov: number | undefined, a: number | undefined, ay?: number) => {
    const cam = camera as THREE.PerspectiveCamera
    if (fov !== undefined && Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
    if (a !== undefined) anchor.current = a
    if (ay !== undefined) anchorY.current = ay
  }

  // level-1 start pose
  useEffect(() => {
    camera.up.set(0, 1, 0)
    controls.updateCameraUp()
    applyClamps(controls, 1)
    const p = mapMode ? homePose() : level1Pose(new THREE.Vector3(0, 0.35, 1))
    controls.setLookAt(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, false)
    controls.enabled = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, camera])

  const currentPose = (): Pose => {
    const f = flight.current
    return {
      pos: camera.position.clone(),
      target: f ? f.curTarget.clone() : controls.getTarget(new THREE.Vector3()),
      up: camera.up.clone(),
      fov: (camera as THREE.PerspectiveCamera).fov,
      anchor: anchor.current,
      anchorY: anchorY.current,
      mapMix: mapMix.current,
    }
  }

  const handoff = (pose: Pose, level: 1 | 2) => {
    camera.up.copy(pose.up)
    controls.updateCameraUp()
    applyClamps(controls, level)
    controls.setLookAt(pose.pos.x, pose.pos.y, pose.pos.z, pose.target.x, pose.target.y, pose.target.z, false)
    applyLens(pose.fov, pose.anchor, pose.anchorY)
    if (pose.mapMix !== undefined) mapMix.current = pose.mapMix
    controls.enabled = true
  }

  const surfacePoint = (dir: THREE.Vector3) => dir.clone().multiplyScalar(R + groundHeight(planet, dir, built))

  /** level 2: above the biome centre, the biome filling ~70% of the width, horizon in frame */
  const coursePose = (course: Course, distance?: number): Pose => {
    const n = course.dir
    const d = distance ?? biomeDistance(course, size.width / size.height)
    return abovePose(surfacePoint(n), n, sideTangent(n, camera.position.clone().normalize()), d)
  }

  // "up" becomes the topic's own normal, so props there stand upright instead of leaning with the curvature
  const topicPose = (topic: Topic): Pose => {
    const n = topic.dir
    return abovePose(surfacePoint(topic.dir), n, sideTangent(n, camera.position.clone().normalize()), D_TOPIC, PITCH_TOPIC)
  }

  const startFlight = (
    to: Pose,
    dur: number,
    ease: (k: number) => number,
    onDone: () => void,
    mid?: { at: number; fn: () => void },
    keepLevel = false,
  ) => {
    const from = currentPose()
    controls.enabled = false
    flight.current = { t: 0, dur, from, to, ease, curTarget: from.target.clone(), onDone, midAt: mid?.at, onMid: mid?.fn }
    if (!keepLevel) setLevel('flying')
  }

  const goToCourse = (course: Course) => {
    if (variant === 'continuous') {
      const to = coursePose(course)
      startFlight(to, 1.4, easeInOutCubic, () => {
        handoff(to, 2)
        focusedRef.current = course
        setLabelsFor(course)
        setLevel('biome')
      })
    } else if (view === 'diorama') {
      // already in a diorama: cross-fade straight to the other course
      onFade(1)
      later(360, () => {
        setDioramaCourse(course)
        focusedRef.current = course
        later(80, () => onFade(0))
      })
    } else {
      const to = coursePose(course, D_MID)
      startFlight(
        to,
        0.8,
        easeInQuad,
        () => {
          camera.up.set(0, 1, 0)
          setView('diorama')
          setDioramaCourse(course)
          focusedRef.current = course
          setLevel('biome')
          later(80, () => onFade(0))
        },
        { at: 0.45, fn: () => onFade(1) },
      )
    }
  }

  const goBack = () => {
    if (view === 'diorama') {
      onFade(1)
      later(360, () => {
        const from = dioramaCourse
        setView('planet')
        setDioramaCourse(null)
        const p = mapMode ? homePose() : level1Pose(from ? from.dir : camera.position)
        handoff(p, 1)
        focusedRef.current = null
        setLevel('planet')
        later(80, () => onFade(0))
      })
      return
    }
    // (also covers "Back" pressed during a variant-B fly-in, whose fade may already have started)
    onFade(0)
    const to = mapMode ? level1Pose(camera.position, mapAnchorX()) : level1Pose(camera.position)
    startFlight(to, 1.3, easeInOutCubic, () => {
      handoff(to, 1)
      focusedRef.current = null
      setLevel('planet')
    })
    setLabelsFor(null)
  }

  // react to the App's focus request
  const goToCourseRef = useRef(goToCourse)
  goToCourseRef.current = goToCourse
  const goBackRef = useRef(goBack)
  goBackRef.current = goBack
  useEffect(() => {
    if (focusCourse === focusedRef.current && !flight.current) return
    if (focusCourse) goToCourseRef.current(focusCourse)
    else if (focusedRef.current || flight.current) goBackRef.current()
  }, [focusCourse])

  // topic snapping inside a continuous level 2 (variant B handles it in the diorama).
  // A short flight rather than controls.setLookAt because the up vector changes between topics.
  useEffect(() => {
    if (variant !== 'continuous' || levelRef.current !== 'biome' || !focusedRef.current) return
    const course = focusedRef.current
    const pose = focusTopic && focusTopic.course === course ? topicPose(focusTopic) : coursePose(course)
    startFlight(pose, 0.9, easeInOutCubic, () => handoff(pose, 2), undefined, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTopic])

  useFrame((_, dt) => {
    const f = flight.current
    if (f) {
      f.t = Math.min(f.dur, f.t + dt)
      const k = f.ease(f.t / f.dur)
      // orbit-style path: slerp the direction from the planet centre, lerp the radius, so we never cut through the ground
      _fromDir.copy(f.from.pos).normalize()
      _toDir.copy(f.to.pos).normalize()
      _qA.setFromUnitVectors(_fromDir, _toDir)
      _qI.identity().slerp(_qA, k)
      _dir.copy(_fromDir).applyQuaternion(_qI)
      camera.position.copy(_dir).multiplyScalar(THREE.MathUtils.lerp(f.from.pos.length(), f.to.pos.length(), k))
      _target.lerpVectors(f.from.target, f.to.target, k)
      _qA.setFromUnitVectors(f.from.up, f.to.up)
      _qI.identity().slerp(_qA, k)
      camera.up.copy(f.from.up).applyQuaternion(_qI)
      camera.lookAt(_target)
      f.curTarget.copy(_target)
      if (f.from.fov !== undefined && f.to.fov !== undefined) applyLens(THREE.MathUtils.lerp(f.from.fov, f.to.fov, k), undefined)
      if (f.from.anchor !== undefined && f.to.anchor !== undefined) anchor.current = THREE.MathUtils.lerp(f.from.anchor, f.to.anchor, k)
      if (f.from.anchorY !== undefined && f.to.anchorY !== undefined) anchorY.current = THREE.MathUtils.lerp(f.from.anchorY, f.to.anchorY, k)
      if (f.from.mapMix !== undefined && f.to.mapMix !== undefined) mapMix.current = THREE.MathUtils.lerp(f.from.mapMix, f.to.mapMix, k)
      if (f.midAt !== undefined && !f.midFired && f.t >= f.midAt) {
        f.midFired = true
        f.onMid?.()
      }
      if (f.t >= f.dur) {
        flight.current = null
        f.onDone()
      }
    } else if (controls.enabled) {
      // idle drift at level 1, like the small planet's autoRotate (the map is driven by scroll instead)
      if (detail && levelRef.current === 'planet' && !selectionRef.current && !controls.active) controls.azimuthAngle += dt * 0.05
      controls.update(dt)
    }
    // (detail mode only) fog tracks the camera-to-target distance so the far ground fades into the sky
    if (fog.current && view === 'planet' && detail) {
      const d = f ? camera.position.distanceTo(f.curTarget) : controls.distance
      fog.current.near = d * 0.85
      fog.current.far = d * 2.0
    }
  })

  const placeOnSphere = useCallback(
    (item: DecorItem): Placement => {
      let h = baseHeight(planet, item.dir)
      if (FLOATING.has(item.recipe)) h = Math.max(h, WATER_LEVEL)
      return { position: item.dir.clone().multiplyScalar(R + h + 0.02), quaternion: orientOnSphere(item.dir, item.yaw) }
    },
    [planet],
  )

  const onTerrainClick = (course: Course) => {
    if (levelRef.current === 'planet') onSelect({ kind: 'course', course })
    else onSelect(null)
  }

  if (view === 'diorama' && dioramaCourse) {
    return (
      <BiomeDiorama
        planet={planet}
        course={dioramaCourse}
        progress={progress}
        built={built}
        selection={selection}
        onSelect={onSelect}
        focusTopic={focusTopic}
      />
    )
  }

  if (!detail) {
    // MAP level 1 (markers + ring road, no per-concept structures) and, after the dive, the
    // composed biome on the same sphere: plazas, roads, landmarks, clusters, creatures. Both layers
    // exist during the flight; the horizon is a feature, so there is no fog here.
    const level = levelRef.current
    const atLevel1 = level === 'planet'
    const showBiome = level !== 'planet'
    const focused = focusedRef.current ?? focusCourse
    const biomeCourses = focused ? [focused] : []
    // the growth hero replaces the hub plaza's landmark; a catastrophe hides its topic's buildings
    const hiddenTopics = new Set<number>()
    for (const c of planet.courses) if (c.hub) hiddenTopics.add(c.hub.index)
    if (catastrophe && catastrophePhase((performance.now() - catastrophe.startedAt) / 1000) !== 'gather' && catastrophePhase((performance.now() - catastrophe.startedAt) / 1000) !== 'done') hiddenTopics.add(catastrophe.topic.index)
    const nightPal = night ? NIGHT[(focused ?? planet.courses[0]).family] : null
    const sky = nightPal ? (focused ? nightPal.sky : NIGHT_SKY_DEFAULT) : SKY
    return (
      <>
        <color attach="background" args={[sky]} />
        {night ? (
          <>
            <hemisphereLight args={[sky, '#1a1a2a', 0.55]} />
            <directionalLight position={[-120, 170, 140]} intensity={0.55} color="#8fa8d8" />
            <StarField />
          </>
        ) : (
          <>
            <hemisphereLight args={['#f3e4ee', '#d9c3d6', 0.95]} />
            <directionalLight position={[-120, 170, 140]} intensity={1.5} color="#fff1dc" />
          </>
        )}
        <MaybeScroll pages={planet.courses.length + 1} enabled={atLevel1} external={!!scrollSource}>
          <MapOrbit
            planet={planet}
            controls={controls}
            camera={camera}
            enabled={atLevel1 && !flight.current}
            mode={scrollMode}
            initialStop={initialStop}
            onStop={onStop ?? (() => {})}
            api={api}
            source={scrollSource}
          />
          <WaterCaps topics={planet.topics} />
          {level !== 'biome' && <MapRoads planet={planet} />}
          {showBiome && (
            <>
              <BiomeRoads planet={planet} built={built} courseIndex={focused?.index} />
              <Plazas planet={planet} built={built} courseIndex={focused?.index} />
              <TerrainPieces planet={planet} built={built} />
              <GlbDecorLayer items={focused ? planet.decor.filter((d) => d.topic.course === focused) : planet.decor} place={placeOnSphere} />
            </>
          )}
          <group onPointerMissed={() => onSelect(null)}>
            <PlanetTerrain2 planet={planet} built={built} onClick={onTerrainClick} mapMix={mapMix} night={night} nightOffset={nightPal?.groundLightnessOffset ?? 0} />
            {atLevel1 && <MapMarkers planet={planet} progress={progress} onClick={(c) => (levelRef.current === 'planet' ? onSelect({ kind: 'course', course: c }) : undefined)} />}
            {showBiome && (
              <>
                <LandmarkLayer
                  spots={spots}
                  plazas={plazas}
                  progress={progress}
                  selectedIndex={selection?.kind === 'concept' ? selection.concept.index : null}
                  onSelect={(concept) => onSelect({ kind: 'concept', concept })}
                  hiddenTopics={hiddenTopics}
                />
                {biomeCourses.map((course) => (
                  <GrowthHero key={course.index} planet={planet} course={course} progress={progress} built={built} />
                ))}
                {catastrophe && <Catastrophe planet={planet} state={catastrophe} built={built} onPhase={onCatastrophePhase ?? (() => {})} />}
                {biomeCourses.map((course) =>
                  Array.from({ length: spawnCount(course.family, creatureCount(course, progress) * crowd) }).map((_, p) => (
                    <Planet2Creature
                      key={`${course.index}-${p}`}
                      planet={planet}
                      topic={course.topics[p % course.topics.length]}
                      pset={p}
                      built={built}
                      onSelect={onSelect}
                      selected={selection?.kind === 'creature' && selection.index === p && selection.course?.index === course.index}
                    />
                  )),
                )}
                {labelsFor && level === 'biome' && <TopicMarkers planet={planet} course={labelsFor} built={built} onSelect={onSelect} />}
              </>
            )}
          </group>
        </MaybeScroll>
      </>
    )
  }

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog ref={fog} attach="fog" args={[SKY, 250, 590]} />
      <hemisphereLight args={['#fff4e6', '#b9a7c9', 0.9]} />
      <directionalLight position={[100, 140, 80]} intensity={1.6} color="#fff1dc" />
      {/* static, non-interactive layers stay outside the pointer group so they are never raycast */}
      <GlbDecorLayer items={planet.decor} place={placeOnSphere} />
      <WaterCaps topics={planet.topics} />
      <group onPointerMissed={() => onSelect(null)}>
        <PlanetTerrain2 planet={planet} built={built} onClick={onTerrainClick} />
        <LandmarkLayer
          spots={spots}
          progress={progress}
          selectedIndex={selection?.kind === 'concept' ? selection.concept.index : null}
          onSelect={(concept) => onSelect({ kind: 'concept', concept })}
        />
        {planet.courses.map((course) =>
          Array.from({ length: spawnCount(course.family, creatureCount(course, progress) * crowd) }).map((_, p) => (
            <Planet2Creature
              key={`${course.index}-${p}`}
              planet={planet}
              topic={course.topics[p % course.topics.length]}
              pset={p}
              built={built}
              onSelect={onSelect}
              selected={selection?.kind === 'creature' && selection.index === p && selection.course?.index === course.index}
            />
          )),
        )}
        {planet.courses.map((course) => (
          <CourseMarker
            key={course.index}
            planet={planet}
            course={course}
            built={built}
            showLabel={labelsFor === null}
            onClick={(c) => (levelRef.current === 'planet' ? onSelect({ kind: 'course', course: c }) : undefined)}
          />
        ))}
        {labelsFor && <TopicMarkers planet={planet} course={labelsFor} built={built} onSelect={onSelect} />}
      </group>
    </>
  )
}
