import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { conceptState, nearestCluster2D, type Cluster, type CourseWorld } from '../lib/world'
import { toonGradient, toonMaterial } from '../lib/toon'
import { LandmarkLayer } from '../components/LandmarkLayer'
import type { SpotPlacement } from '../lib/landmarks'
import type { BlobMotion } from '../components/Blob'
import { Creature } from '../components/Creature'
import { CREATURE_SCALE } from '../lib/scale'
import { makeRng, hashString } from '../lib/seed'
import type { Selection } from '../App'

const R = 8
const CLIFF = 3

interface Terrain2D {
  heightAt: (p: THREE.Vector2) => number
}

function useTerrain2D(world: CourseWorld, progress: number): Terrain2D {
  return useMemo(() => {
    const built = world.concepts.filter((c) => conceptState(c, progress) === 2)
    const sigma = 0.16
    return {
      heightAt: (p: THREE.Vector2) => {
        let bump = 0
        for (const c of built) {
          const d2 = c.pos.distanceToSquared(p)
          bump += 0.6 * Math.exp(-d2 / (sigma * sigma))
        }
        return Math.min(bump, 1.6)
      },
    }
  }, [world, progress])
}

function IslandTerrain({ world, terrain }: { world: CourseWorld; terrain: Terrain2D }) {
  const geometry = useMemo(() => {
    // radial grid: inner rings are the island top, outer rings fall away as a cliff
    const rings = 72
    const cliffRings = 10
    const segs = 160
    const totalRings = rings + cliffRings
    const rng = makeRng(hashString(world.seed + ':coast'))
    const coast = Array.from({ length: 8 }, () => rng() * 0.5)
    const edgeAt = (ang: number) => {
      let wobble = 0
      for (let k = 0; k < coast.length; k++) wobble += Math.sin(ang * (k + 2) + coast[k] * 7) * coast[k] * 0.12
      return R * (1 + wobble)
    }
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const col = new THREE.Color()
    const rock = new THREE.Color('#8d6e57')
    const deepRock = new THREE.Color('#5e4636')
    const p = new THREE.Vector2()
    for (let i = 0; i <= totalRings; i++) {
      for (let j = 0; j <= segs; j++) {
        const ang = (j / segs) * Math.PI * 2
        const edge = edgeAt(ang)
        let r: number
        let y: number
        if (i <= rings) {
          r = (i / rings) * edge
          p.set(Math.cos(ang) * r, Math.sin(ang) * r)
          y = terrain.heightAt(p.clone().divideScalar(R))
          const cluster = nearestCluster2D(world.clusters, p.clone().divideScalar(R))
          col.set(cluster.biome.ground)
          col.lerp(rock, THREE.MathUtils.clamp((y / 1.6 - 0.45) * 2, 0, 0.8))
        } else {
          const t = (i - rings) / cliffRings
          r = edge + t * 0.9 + Math.sin(ang * 9 + t * 4) * 0.15 * t
          y = -CLIFF * Math.pow(t, 0.55) - t * t * 4
          col.copy(rock).lerp(deepRock, t)
        }
        positions.push(Math.cos(ang) * r, y, Math.sin(ang) * r)
        colors.push(col.r, col.g, col.b)
      }
    }
    const row = segs + 1
    for (let i = 0; i < totalRings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * row + j
        const b = a + 1
        const c = a + row
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [world, terrain])

  const material = useMemo(
    () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: THREE.DoubleSide }),
    [],
  )
  return <mesh geometry={geometry} material={material} />
}

function IslandCreature({
  index,
  world,
  terrain,
  onSelect,
  selected,
}: {
  index: number
  world: CourseWorld
  terrain: Terrain2D
  onSelect: (s: Selection) => void
  selected: boolean
}) {
  const cluster = world.clusters[index % world.clusters.length]
  const group = useRef<THREE.Group>(null)
  const motion = useRef<BlobMotion>({ moving: false, t: 0 })
  const state = useRef(
    (() => {
      const rng = makeRng(hashString(world.seed + ':icreature:' + index))
      const pos = cluster.pos.clone().multiplyScalar(R).add(new THREE.Vector2(rng() - 0.5, rng() - 0.5).multiplyScalar(2.5))
      return { pos, angle: rng() * Math.PI * 2, timer: rng() * 2, moving: rng() > 0.5, rng }
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
      if (s.moving) s.angle += (s.rng() - 0.5) * 2.4
    }
    motion.current.moving = s.moving
    if (s.moving) {
      const home = cluster.pos.clone().multiplyScalar(R)
      if (s.pos.distanceTo(home) > 2.6) {
        const toHome = Math.atan2(home.x - s.pos.x, home.y - s.pos.y)
        s.angle = THREE.MathUtils.lerp(s.angle, toHome, dt * 2)
      }
      s.pos.x += Math.sin(s.angle) * dt * 0.8
      s.pos.y += Math.cos(s.angle) * dt * 0.8
      if (s.pos.length() > R - 0.8) s.pos.setLength(R - 0.8)
    }
    const y = terrain.heightAt(s.pos.clone().divideScalar(R))
    g.position.set(s.pos.x, y, s.pos.y)
    g.rotation.y = s.angle
  })

  return (
    <group ref={group} scale={CREATURE_SCALE.island}>
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

export type IslandCamera = 'snap' | 'fixed'

export function IslandScene({
  world,
  progress,
  onSelect,
  selection,
  cameraMode,
  focusCluster,
}: {
  world: CourseWorld
  progress: number
  onSelect: (s: Selection | null) => void
  selection: Selection | null
  cameraMode: IslandCamera
  /** cluster to zoom to at the "patch" snap level, null for overview */
  focusCluster: Cluster | null
}) {
  const terrain = useTerrain2D(world, progress)
  const creatureCount = Math.floor(progress * world.psets + 1e-6)
  const controls = useRef<CameraControls>(null)
  const spots = useMemo<SpotPlacement[]>(
    () =>
      world.concepts.map((c) => ({
        concept: c,
        position: new THREE.Vector3(c.pos.x * R, terrain.heightAt(c.pos), c.pos.y * R),
        quaternion: new THREE.Quaternion(),
        scale: 1,
      })),
    [world, terrain],
  )

  useEffect(() => {
    const c = controls.current
    if (!c) return
    if (focusCluster) {
      const cx = focusCluster.pos.x * R
      const cz = focusCluster.pos.y * R
      const dir = new THREE.Vector3(cx, 0, cz).normalize()
      c.setLookAt(cx + dir.x * 5 + 1, 5.5, cz + dir.z * 5 + 3, cx, 0.6, cz, true)
    } else {
      c.setLookAt(0, 19, 27, 0, -0.5, 0, true)
    }
  }, [focusCluster, cameraMode])

  return (
    <>
      <color attach="background" args={['#f3e4ee']} />
      <fog attach="fog" args={['#f3e4ee', 30, 55]} />
      <hemisphereLight args={['#fff4e6', '#b9a7c9', 0.9]} />
      <directionalLight position={[10, 14, 8]} intensity={1.6} color="#fff1dc" />
      <group onPointerMissed={() => onSelect(null)}>
        <IslandTerrain world={world} terrain={terrain} />
        <LandmarkLayer
          spots={spots}
          progress={progress}
          selectedIndex={selection?.kind === 'concept' ? selection.concept.index : null}
          onSelect={(concept) => onSelect({ kind: 'concept', concept })}
        />
        {Array.from({ length: creatureCount }).map((_, i) => (
          <IslandCreature
            key={i}
            index={i}
            world={world}
            terrain={terrain}
            onSelect={onSelect}
            selected={selection?.kind === 'creature' && selection.index === i}
          />
        ))}
        {world.clusters.map((cl) => (
          <group key={cl.index} position={[cl.pos.x * R, terrain.heightAt(cl.pos), cl.pos.y * R]}>
            <mesh
              position={[0, 0.15, 0]}
              material={toonMaterial(cl.biome.accent)}
              onClick={(e) => {
                e.stopPropagation()
                onSelect({ kind: 'cluster', cluster: cl })
              }}
            >
              <cylinderGeometry args={[0.5, 0.6, 0.3, 16]} />
            </mesh>
          </group>
        ))}
      </group>
      <ContactShadows position={[0, -CLIFF - 0.5, 0]} opacity={0.35} scale={40} blur={2.5} far={12} frames={1} color="#5a3f6b" />
      <CameraControls
        ref={controls}
        enabled={cameraMode === 'snap'}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        minDistance={6}
        maxDistance={34}
        makeDefault
      />
    </>
  )
}
