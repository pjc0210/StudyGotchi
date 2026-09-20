import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import {
  BUMP_HEIGHT,
  PLANET_R,
  PLANET_SKY as SKY,
  PROP_SCALE,
  UP,
  WATER_LEVEL,
  baseHeight,
  bumpsAt,
  creatureCount,
  groundHeight,
  sampleBase,
  unprojectFromPatch,
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
import type { SpotPlacement } from '../lib/landmarks'
import type { BlobMotion } from '../components/Blob'
import { Creature } from '../components/Creature'
import { CREATURE_SCALE } from '../lib/scale'
import { useAssets } from '../lib/assets'
import { FLOATING, type Placement } from '../components/Decor'
import { GlbDecorLayer } from '../components/GlbDecor'
import { Label } from '../components/Label'
import { makeRng, hashString } from '../lib/seed'
import type { Selection } from '../App'

/**
 * Variant B level 2: one course patch unrolled into a flat, floating diorama (the Island approach),
 * sampled from the same planet terrain so the layout matches what you saw from orbit.
 */

const R = PLANET_R
const CLIFF = 8

const _dir = new THREE.Vector3()

function DioramaTerrain({ planet, course, built, radius }: { planet: Planet; course: Course; built: Concept[][]; radius: number }) {
  const base = useMemo(() => {
    const rings = 64
    const cliffRings = 8
    const segs = 144
    const totalRings = rings + cliffRings
    const rng = makeRng(hashString(planet.seed + ':coast:' + course.code))
    const coast = Array.from({ length: 8 }, () => rng() * 0.5)
    const edgeAt = (ang: number) => {
      let wobble = 0
      for (let k = 0; k < coast.length; k++) wobble += Math.sin(ang * (k + 2) + coast[k] * 7) * coast[k] * 0.1
      return radius * (1 + wobble)
    }
    const count = (totalRings + 1) * (segs + 1)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const baseH = new Float32Array(count)
    const baseCol = new Float32Array(count * 3)
    const dirs = new Float32Array(count * 3)
    const isTop = new Uint8Array(count)
    const s: Sample = { h: 0, r: 0, g: 0, b: 0 }
    const col = new THREE.Color()
    const rock = new THREE.Color('#8d6e57')
    const deepRock = new THREE.Color('#5e4636')
    let v = 0
    for (let i = 0; i <= totalRings; i++) {
      for (let j = 0; j <= segs; j++) {
        const ang = (j / segs) * Math.PI * 2
        const edge = edgeAt(ang)
        if (i <= rings) {
          const r = (i / rings) * edge
          const x = Math.cos(ang) * r
          const z = Math.sin(ang) * r
          unprojectFromPatch(course, x, z, _dir)
          sampleBase(planet, _dir, s, course)
          baseH[v] = s.h
          baseCol[v * 3] = s.r
          baseCol[v * 3 + 1] = s.g
          baseCol[v * 3 + 2] = s.b
          dirs[v * 3] = _dir.x
          dirs[v * 3 + 1] = _dir.y
          dirs[v * 3 + 2] = _dir.z
          isTop[v] = 1
          positions[v * 3] = x
          positions[v * 3 + 1] = s.h
          positions[v * 3 + 2] = z
        } else {
          const t = (i - rings) / cliffRings
          const r = edge + t * 3 + Math.sin(ang * 9 + t * 4) * 0.6 * t
          const y = -CLIFF * Math.pow(t, 0.55) - t * t * 14
          col.copy(rock).lerp(deepRock, t)
          positions[v * 3] = Math.cos(ang) * r
          positions[v * 3 + 1] = y
          positions[v * 3 + 2] = Math.sin(ang) * r
          colors[v * 3] = col.r
          colors[v * 3 + 1] = col.g
          colors[v * 3 + 2] = col.b
        }
        v++
      }
    }
    const row = segs + 1
    const indices = new Uint32Array(totalRings * segs * 6)
    let k = 0
    for (let i = 0; i < totalRings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * row + j
        const b = a + 1
        const c = a + row
        const d = c + 1
        indices[k++] = a
        indices[k++] = c
        indices[k++] = b
        indices[k++] = b
        indices[k++] = c
        indices[k++] = d
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.setIndex(new THREE.BufferAttribute(indices, 1))
    return { g, baseH, baseCol, dirs, isTop }
  }, [planet, course, radius])

  useLayoutEffect(() => {
    const { g, baseH, baseCol, dirs, isTop } = base
    const pos = g.attributes.position as THREE.BufferAttribute
    const colAttr = g.attributes.color as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const carr = colAttr.array as Float32Array
    const c = new THREE.Color()
    const list = built[course.index]
    for (let i = 0; i < pos.count; i++) {
      if (!isTop[i]) continue
      _dir.set(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2])
      const bump = bumpsAt(list, _dir)
      arr[i * 3 + 1] = baseH[i] + bump
      c.setRGB(baseCol[i * 3], baseCol[i * 3 + 1], baseCol[i * 3 + 2])
      if (bump > 0.01) c.offsetHSL(0, -0.05, Math.min(0.14, (bump / BUMP_HEIGHT) * 0.14))
      carr[i * 3] = c.r
      carr[i * 3 + 1] = c.g
      carr[i * 3 + 2] = c.b
    }
    pos.needsUpdate = true
    colAttr.needsUpdate = true
    g.computeVertexNormals()
    g.computeBoundingSphere()
  }, [base, built, course])

  useEffect(() => () => base.g.dispose(), [base])

  const material = useMemo(
    () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: THREE.DoubleSide }),
    [],
  )
  return <mesh geometry={base.g} material={material} />
}

function DioramaCreature({
  planet,
  topic,
  pset,
  built,
  radius,
  onSelect,
  selected,
}: {
  planet: Planet
  topic: Topic
  pset: number
  built: Concept[][]
  /** diorama disc radius, so nobody walks off the cliff */
  radius: number
  onSelect: (s: Selection) => void
  selected: boolean
}) {
  const course = topic.course
  const group = useRef<THREE.Group>(null)
  const motion = useRef<BlobMotion>({ moving: false, t: 0 })
  const state = useRef(
    (() => {
      const rng = makeRng(hashString(planet.seed + ':p2dcreature:' + course.code + ':' + pset))
      const pos = topic.pos.clone().add(new THREE.Vector2(rng() - 0.5, rng() - 0.5).multiplyScalar(R * topic.radius * 0.8))
      return { pos, angle: rng() * Math.PI * 2, timer: rng() * 2, moving: rng() > 0.5, rng }
    })(),
  )
  const roam = R * topic.radius * 0.8

  useFrame((_, dt) => {
    const s = state.current
    const g = group.current
    if (!g) return
    motion.current.t += dt
    s.timer -= dt
    if (s.timer <= 0) {
      s.moving = !s.moving
      s.timer = s.moving ? 1.5 + s.rng() * 3 : 1 + s.rng() * 2.5
      if (s.moving) s.angle += (s.rng() - 0.5) * 2.4
    }
    motion.current.moving = s.moving
    if (s.moving) {
      const home = topic.pos
      if (s.pos.distanceTo(home) > roam) {
        const toHome = Math.atan2(home.x - s.pos.x, home.y - s.pos.y)
        s.angle = THREE.MathUtils.lerp(s.angle, toHome, dt * 2)
      }
      s.pos.x += Math.sin(s.angle) * dt * 1.4
      s.pos.y += Math.cos(s.angle) * dt * 1.4
      // hard limits: the steering above is soft and can overshoot
      if (s.pos.distanceTo(home) > roam * 1.3) s.pos.sub(home).setLength(roam * 1.3).add(home)
      if (s.pos.length() > radius - 4) s.pos.setLength(radius - 4)
    }
    unprojectFromPatch(course, s.pos.x, s.pos.y, _dir)
    const y = groundHeight(planet, _dir, built, course)
    g.position.set(s.pos.x, y, s.pos.y)
    g.rotation.y = s.angle
  })

  return (
    <group ref={group} scale={CREATURE_SCALE.diorama}>
      <Creature
        biome={topic.biome}
        index={pset}
        water={topic.kind.profile === 'water'}
        motion={motion}
        selected={selected}
        onClick={() => onSelect({ kind: 'creature', index: pset, cluster: topic, course })}
      />
    </group>
  )
}

export function BiomeDiorama({
  planet,
  course,
  progress,
  built,
  selection,
  onSelect,
  focusTopic,
}: {
  planet: Planet
  course: Course
  progress: number
  built: Concept[][]
  selection: Selection | null
  onSelect: (s: Selection | null) => void
  focusTopic: Topic | null
}) {
  const radius = R * course.extent
  const controls = useRef<CameraControls>(null)
  const mounted = useRef(false)

  const heightAt = useCallback(
    (x: number, z: number) => groundHeight(planet, unprojectFromPatch(course, x, z, _dir), built, course),
    [planet, course, built],
  )

  // overview → topic snapping, same idea as the Island's snap levels
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const transition = mounted.current
    mounted.current = true
    if (focusTopic && focusTopic.course === course) {
      const x = focusTopic.pos.x
      const z = focusTopic.pos.y
      // approach from outside the disc, biased to the south like the Island snap
      const o = new THREE.Vector2(x, z)
      if (o.lengthSq() < 1e-3) o.set(0, 1)
      o.normalize()
      const d = 1.15 * radius
      c.setLookAt(x + o.x * d * 0.45 + 2, d * 0.72, z + o.y * d * 0.45 + d * 0.4, x, 1.5, z, transition)
    } else {
      const d = 3.9 * radius
      c.setLookAt(0, d * Math.sin(0.66), d * Math.cos(0.66), 0, -1, 0, transition)
    }
  }, [focusTopic, course, radius])

  const placeFlat = useCallback(
    (item: DecorItem): Placement => {
      let h = baseHeight(planet, item.dir, course)
      if (FLOATING.has(item.recipe)) h = Math.max(h, WATER_LEVEL)
      return { position: new THREE.Vector3(item.pos.x, h + 0.02, item.pos.y), quaternion: new THREE.Quaternion().setFromAxisAngle(UP, item.yaw) }
    },
    [planet, course],
  )
  const decor = useMemo(() => course.topics.flatMap((t) => t.decor), [course])
  const spots = useMemo<SpotPlacement[]>(
    () =>
      course.topics.flatMap((t) =>
        t.spots.map((c) => ({
          concept: c,
          position: new THREE.Vector3(c.pos.x, heightAt(c.pos.x, c.pos.y), c.pos.y),
          quaternion: new THREE.Quaternion(),
          scale: PROP_SCALE,
        })),
      ),
    [course, heightAt],
  )
  const creatures = creatureCount(course, progress) * useAssets().crowd

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, radius * 3.5, radius * 8]} />
      <hemisphereLight args={['#fff4e6', '#b9a7c9', 0.9]} />
      <directionalLight position={[60, 90, 50]} intensity={1.6} color="#fff1dc" />
      <GlbDecorLayer items={decor} place={placeFlat} />
      {course.topics
        .filter((t) => t.kind.profile === 'water')
        .map((t) => (
          <mesh key={t.index} position={[t.pos.x, WATER_LEVEL, t.pos.y]} rotation={[-Math.PI / 2, 0, 0]} material={toonMaterial(t.kind.alt)}>
            <circleGeometry args={[R * waterRadius(t), 48]} />
          </mesh>
        ))}
      <group onPointerMissed={() => onSelect(null)}>
        <DioramaTerrain planet={planet} course={course} built={built} radius={radius} />
        <LandmarkLayer
          spots={spots}
          progress={progress}
          selectedIndex={selection?.kind === 'concept' ? selection.concept.index : null}
          onSelect={(concept) => onSelect({ kind: 'concept', concept })}
        />
        {Array.from({ length: creatures }).map((_, p) => (
          <DioramaCreature
            key={p}
            planet={planet}
            topic={course.topics[p % course.topics.length]}
            pset={p}
            built={built}
            radius={radius}
            onSelect={onSelect}
            selected={selection?.kind === 'creature' && selection.index === p && selection.course?.index === course.index}
          />
        ))}
        {course.topics.map((t) => (
          <group key={t.index} position={[t.pos.x, heightAt(t.pos.x, t.pos.y), t.pos.y]}>
            <mesh
              position={[0, 0.15, 0]}
              material={toonMaterial(course.biome.accent)}
              onClick={(e) => {
                if (e.delta > 4) return
                e.stopPropagation()
                onSelect({ kind: 'cluster', cluster: t })
              }}
            >
              <cylinderGeometry args={[1.1, 1.3, 0.3, 16]} />
            </mesh>
            <Label position={[0, 2.4, 0]} text={`${t.name} · ${t.kind.id}`} color={course.biome.accent} small />
          </group>
        ))}
      </group>
      <ContactShadows position={[0, -CLIFF - 3, 0]} opacity={0.35} scale={radius * 3.2} blur={2.5} far={CLIFF + 10} frames={1} color="#5a3f6b" />
      <CameraControls
        ref={controls}
        minPolarAngle={0.25}
        maxPolarAngle={1.25}
        minDistance={18}
        maxDistance={radius * 5.5}
        smoothTime={0.6}
      />
    </>
  )
}
