import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { conceptState, nearestCluster, type CourseWorld } from '../lib/world'
import { toonGradient, toonMaterial } from '../lib/toon'
import { LandmarkLayer } from '../components/LandmarkLayer'
import type { SpotPlacement } from '../lib/landmarks'
import type { BlobMotion } from '../components/Blob'
import { Creature } from '../components/Creature'
import { CREATURE_SCALE } from '../lib/scale'
import { makeRng, hashString } from '../lib/seed'
import type { Selection } from '../App'

// small radius + chunky props is the "tiny planet" read; a big sphere just looks like a ball
const R = 4.5
const UP = new THREE.Vector3(0, 1, 0)

interface Terrain {
  radiusAt: (dir: THREE.Vector3) => number
  place: (dir: THREE.Vector3, lift?: number) => { position: THREE.Vector3; quaternion: THREE.Quaternion }
}

function useTerrain(world: CourseWorld, progress: number): Terrain {
  return useMemo(() => {
    const built = world.concepts.filter((c) => conceptState(c, progress) === 2)
    const sigma = 0.18
    const radiusAt = (dir: THREE.Vector3) => {
      let bump = 0
      for (const c of built) {
        const ang = Math.acos(THREE.MathUtils.clamp(c.dir.dot(dir), -1, 1))
        bump += 0.35 * Math.exp(-(ang * ang) / (sigma * sigma))
      }
      return R + Math.min(bump, 0.9)
    }
    const place = (dir: THREE.Vector3, lift = 0) => {
      const position = dir.clone().multiplyScalar(radiusAt(dir) + lift)
      const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir)
      return { position, quaternion }
    }
    return { radiusAt, place }
  }, [world, progress])
}

function PlanetTerrain({ world, terrain }: { world: CourseWorld; terrain: Terrain }) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 128, 96)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const dir = new THREE.Vector3()
    const col = new THREE.Color()
    const rock = new THREE.Color('#b7a58f')
    for (let i = 0; i < pos.count; i++) {
      dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize()
      const r = terrain.radiusAt(dir)
      pos.setXYZ(i, dir.x * r, dir.y * r, dir.z * r)
      const cluster = nearestCluster(world.clusters, dir)
      col.set(cluster.biome.ground)
      const height = (r - R) / 0.9
      col.lerp(rock, THREE.MathUtils.clamp((height - 0.45) * 2, 0, 0.8))
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [world, terrain])

  const material = useMemo(
    () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() }),
    [],
  )
  return <mesh geometry={geometry} material={material} receiveShadow />
}

function Anchored({ dir, terrain, children }: { dir: THREE.Vector3; terrain: Terrain; children: React.ReactNode }) {
  const { position, quaternion } = useMemo(() => terrain.place(dir), [dir, terrain])
  return (
    <group position={position} quaternion={quaternion} scale={1.1}>
      {children}
    </group>
  )
}

/** Wanders on the sphere with a tangent heading; pauses and hops. */
function PlanetCreature({
  index,
  world,
  terrain,
  onSelect,
  selected,
}: {
  index: number
  world: CourseWorld
  terrain: Terrain
  onSelect: (s: Selection) => void
  selected: boolean
}) {
  const cluster = world.clusters[index % world.clusters.length]
  const group = useRef<THREE.Group>(null)
  const motion = useRef<BlobMotion>({ moving: false, t: 0 })
  const state = useRef(
    (() => {
      const rng = makeRng(hashString(world.seed + ':creature:' + index))
      const dir = cluster.dir.clone().add(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.5)).normalize()
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
      if (s.moving) {
        const turn = (s.rng() - 0.5) * 2.4
        s.heading.applyAxisAngle(s.dir, turn)
      }
    }
    motion.current.moving = s.moving
    if (s.moving) {
      // keep to the home biome: steer back when drifting too far
      const home = cluster.dir
      if (s.dir.dot(home) < Math.cos(0.5)) {
        const toHome = home.clone().sub(s.dir.clone().multiplyScalar(home.dot(s.dir))).normalize()
        s.heading.lerp(toHome, dt * 2).normalize()
      }
      s.dir.addScaledVector(s.heading, dt * 0.12).normalize()
      s.heading.sub(s.dir.clone().multiplyScalar(s.heading.dot(s.dir))).normalize()
    }
    const r = terrain.radiusAt(s.dir)
    g.position.copy(s.dir).multiplyScalar(r)
    // local +Z is the face, so basis = (up x heading, up, heading)
    const right = new THREE.Vector3().crossVectors(s.dir, s.heading).normalize()
    const m = new THREE.Matrix4().makeBasis(right, s.dir, s.heading)
    g.quaternion.setFromRotationMatrix(m)
  })

  return (
    <group ref={group} scale={CREATURE_SCALE.planet}>
      <Creature
        biome={cluster.biome}
        index={index}
        motion={motion}
        selected={selected}
        onClick={() => onSelect({ kind: 'creature', index, cluster })}
      />
    </group>
  )
}

export function PlanetScene({
  world,
  progress,
  onSelect,
  selection,
}: {
  world: CourseWorld
  progress: number
  onSelect: (s: Selection | null) => void
  selection: Selection | null
}) {
  const terrain = useTerrain(world, progress)
  const creatureCount = Math.floor(progress * world.psets + 1e-6)
  const spots = useMemo<SpotPlacement[]>(
    () => world.concepts.map((c) => ({ concept: c, ...terrain.place(c.dir), scale: 1.1 })),
    [world, terrain],
  )

  return (
    <>
      <color attach="background" args={['#f3e4ee']} />
      <fog attach="fog" args={['#f3e4ee', 22, 40]} />
      <hemisphereLight args={['#fff4e6', '#b9a7c9', 0.9]} />
      <directionalLight position={[10, 14, 8]} intensity={1.6} color="#fff1dc" />
      <group onPointerMissed={() => onSelect(null)}>
        <PlanetTerrain world={world} terrain={terrain} />
        <LandmarkLayer
          spots={spots}
          progress={progress}
          selectedIndex={selection?.kind === 'concept' ? selection.concept.index : null}
          onSelect={(concept) => onSelect({ kind: 'concept', concept })}
        />
        {Array.from({ length: creatureCount }).map((_, i) => (
          <PlanetCreature
            key={i}
            index={i}
            world={world}
            terrain={terrain}
            onSelect={onSelect}
            selected={selection?.kind === 'creature' && selection.index === i}
          />
        ))}
        {world.clusters.map((cl) => (
          <Anchored key={cl.index} dir={cl.dir} terrain={terrain}>
            <mesh position={[0, 0.15, 0]} material={toonMaterial(cl.biome.accent)}>
              <cylinderGeometry args={[0.5, 0.6, 0.3, 16]} />
            </mesh>
          </Anchored>
        ))}
      </group>
      <OrbitControls enablePan={false} minDistance={9} maxDistance={26} autoRotate={!selection} autoRotateSpeed={0.5} makeDefault />
    </>
  )
}
