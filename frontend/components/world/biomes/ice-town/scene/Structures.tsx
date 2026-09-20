import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ICE_TOWN_PALETTE as P,
  type BiomeLayout,
  type BuildingKind,
  type DistrictDef,
  type DistrictProgress,
  populationFor,
} from '../layout/biome-layout'
import {
  anchorPoint,
  districtSlots,
  harbourFixtures,
  helipadPoint,
  laneDir,
  localPaths,
  propPlacements,
  riverDirAt,
  sampleTerrain,
  type LocalPath,
  type Placement,
  type PropKind,
  type Slot,
} from '../layout/terrain'
import { Surf } from '../render/materials'
import {
  Building,
  CrystalSpire,
  DishTower,
  FrozenFountain,
  Helipad,
  Icebreaker,
  PlazaTree,
  Prop,
  Sawmill,
  SkatingRing,
  WhaleSkeletonGantry,
} from './Props'

/** Ruin state shared with the props so knock-over animates without React churn. */
export const ruin = { districtId: null as string | null, amount: 0 }

/**
 * The older building kinds were modelled at toy scale; the forest and harbour houses are metres.
 * Scaled so every house lands in the 4.5–6 m band of the pass-3 scale rethink.
 */
const BUILDING_SCALE: Record<BuildingKind, number> = {
  'forest-house': 1,
  'stilt-house': 1,
  'timber-house': 1.9,
  'fishing-hut': 1.8,
  tent: 1.9,
  quonset: 1.9,
}

/** Props were modelled around 1 m; the big timber structures are already metres. */
const PROP_SCALE: Partial<Record<PropKind, number>> = {
  watchtower: 1,
  windmill: 1,
  'fenced-plot': 1,
  footbridge: 1,
  lamp: 1,
  helicopter: 1.6,
  boat: 1.8,
  'log-pile': 1.6,
  cart: 1.5,
  barrel: 1.4,
  crate: 1.4,
  bench: 1.4,
  fence: 1.5,
  stump: 1.5,
  sled: 1.5,
  'string-lights': 1.6,
  snowman: 1.5,
}

/* ---------- local paths ---------- */

function ribbonGeometry(points: Array<[number, number, number]>, width: number): THREE.BufferGeometry {
  const verts: number[] = []
  const idx: number[] = []
  const half = width / 2
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i]
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const dx = next[0] - prev[0]
    const dz = next[2] - prev[2]
    const len = Math.hypot(dx, dz) || 1
    const nx = (-dz / len) * half
    const nz = (dx / len) * half
    verts.push(x + nx, y, z + nz, x - nx, y, z - nz)
    if (i > 0) {
      const a = (i - 1) * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/**
 * Plank dock (fishing-village ref): planks across the deck, pilings every 3 m down into the sea
 * bed on both sides, bollards where the pilings rise above the deck.
 */
function Dock({ path, seaLevel }: { path: LocalPath; seaLevel: number }) {
  const planks = useMemo(() => {
    const out: Array<{ position: [number, number, number]; yaw: number }> = []
    const posts: Array<{ position: [number, number, number]; bollard: boolean }> = []
    const beams: Array<{ position: [number, number, number]; yaw: number; len: number }> = []
    for (let i = 1; i < path.points.length; i++) {
      const a = new THREE.Vector3(...path.points[i - 1])
      const b = new THREE.Vector3(...path.points[i])
      const len = a.distanceTo(b)
      const n = Math.max(1, Math.round(len / 0.62))
      const yaw = Math.atan2(b.x - a.x, b.z - a.z)
      const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(path.width * 0.5 - 0.1)
      for (let k = 0; k < n; k++) {
        const p = a.clone().lerp(b, (k + 0.5) / n)
        out.push({ position: [p.x, p.y, p.z], yaw })
        if (k % 5 === 2) {
          posts.push(
            { position: [p.x + side.x, p.y, p.z + side.z], bollard: k % 10 === 2 },
            { position: [p.x - side.x, p.y, p.z - side.z], bollard: k % 10 === 7 },
          )
        }
      }
      const mid = a.clone().lerp(b, 0.5)
      beams.push({ position: [mid.x + side.x * 0.9, mid.y - 0.2, mid.z + side.z * 0.9], yaw, len }, { position: [mid.x - side.x * 0.9, mid.y - 0.2, mid.z - side.z * 0.9], yaw, len })
    }
    return { out, posts, beams }
  }, [path])
  const seaBed = seaLevel - 0.7
  return (
    <group>
      {planks.out.map((p, i) => (
        <mesh key={i} position={p.position} rotation={[0, p.yaw, 0]} receiveShadow castShadow>
          <boxGeometry args={[path.width, 0.16, 0.5]} />
          <Surf color={i % 2 ? P.planks : P.planksLight} />
        </mesh>
      ))}
      {planks.beams.map((b, i) => (
        <mesh key={`b${i}`} position={b.position} rotation={[0, b.yaw, 0]}>
          <boxGeometry args={[0.24, 0.3, b.len]} />
          <Surf color={P.timberDark} />
        </mesh>
      ))}
      {planks.posts.map((p, i) => {
        const top = p.position[1] + (p.bollard ? 0.9 : 0.35)
        const h = top - seaBed
        return (
          <mesh key={`p${i}`} position={[p.position[0], top - h / 2, p.position[2]]} castShadow>
            <cylinderGeometry args={[0.16, 0.19, h, 6]} />
            <Surf color={P.timberDark} />
          </mesh>
        )
      })}
    </group>
  )
}

export function Paths({ layout, progress }: { layout: BiomeLayout; progress: DistrictProgress }) {
  const paths = useMemo(() => localPaths(layout), [layout])
  const bands = useMemo(() => new Map<string, number>(layout.districts.map((c) => [c.id, populationFor(c, progress[c.id] ?? 0).band])), [layout, progress])
  const ribbons = useMemo(
    () => paths.filter((p) => p.kind !== 'dock').map((p) => ({ path: p, geometry: ribbonGeometry(p.points, p.width) })),
    [paths],
  )
  return (
    <group>
      {ribbons.map(({ path, geometry }, i) =>
        (bands.get(path.districtId) ?? 0) >= path.minBand ? (
          <mesh key={i} geometry={geometry} receiveShadow>
            <Surf color={path.kind === 'lane' ? '#d3dde6' : '#dfe6ec'} side={THREE.DoubleSide} />
          </mesh>
        ) : null,
      )}
      {paths
        .filter((p) => p.kind === 'dock' && (bands.get(p.districtId) ?? 0) >= p.minBand)
        .map((p, i) => <Dock key={`d${i}`} path={p} seaLevel={layout.seaLevel} />)}
    </group>
  )
}

/* ---------- props with knock-over ---------- */

function Knockable({ placement, children }: { placement: Placement; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const sign = placement.index % 2 === 0 ? 1 : -1
  const knocks = placement.knockable && placement.index % 3 !== 1
  useFrame(() => {
    if (!group.current) return
    const a = knocks && (ruin.districtId === '*' || ruin.districtId === placement.districtId) ? ruin.amount : 0
    group.current.rotation.z = a * 1.35 * sign
    group.current.rotation.x = a * 0.25
    group.current.position.y = placement.position[1] - a * 0.12
  })
  const base = PROP_SCALE[placement.kind] ?? 1.3
  const fixed = placement.kind === 'footbridge' || placement.kind === 'fenced-plot' || placement.kind === 'watchtower' || placement.kind === 'windmill' || placement.kind === 'lamp'
  return (
    <group ref={group} position={placement.position} rotation={[0, placement.yaw, 0]} scale={fixed ? base : base * placement.scale}>
      {children}
    </group>
  )
}

/* ---------- district anchors ---------- */

function Anchors({ layout, district, night, dark }: { layout: BiomeLayout; district: DistrictDef; night: boolean; dark: boolean }) {
  const lit = night && !dark
  const [ax, az] = anchorPoint(layout, district)
  const ay = sampleTerrain(layout, ax, az).height
  const [dx, dz] = laneDir(district)
  switch (district.id) {
    case 'harbour': {
      const fx = harbourFixtures(layout)
      return (
        <group>
          <group position={[ax, ay, az]} rotation={[0, fx.gantryYaw, 0]}>
            <WhaleSkeletonGantry />
          </group>
          <group position={[fx.icebreaker[0], layout.seaLevel, fx.icebreaker[1]]} rotation={[0, fx.icebreakerYaw, 0]}>
            <Icebreaker lit={lit} />
          </group>
        </group>
      )
    }
    case 'forest': {
      // The mill faces the river: its wheel (local +z) dips toward the water.
      const rd = riverDirAt(layout, ax, az)
      const toRiver: [number, number] = [rd[1], -rd[0]]
      const yaw = Math.atan2(toRiver[0], toRiver[1])
      return (
        <group position={[ax, ay, az]} rotation={[0, yaw, 0]}>
          <Sawmill lit={lit} />
        </group>
      )
    }
    case 'town': {
      const fx = ax - dz * 8
      const fz = az + dx * 8
      return (
        <group>
          <group position={[ax, ay, az]} scale={1.6}>
            <PlazaTree lit={lit} />
          </group>
          <group position={[fx, sampleTerrain(layout, fx, fz).height, fz]} scale={1.6}>
            <FrozenFountain />
          </group>
        </group>
      )
    }
    case 'lake':
      return (
        <group position={[ax, ay, az]} scale={1.5}>
          <SkatingRing />
        </group>
      )
    case 'glacier':
      return (
        <group position={[ax, ay, az]} scale={1.6}>
          <CrystalSpire glow={night} />
        </group>
      )
    case 'station': {
      const [hx, hz] = helipadPoint(layout)
      return (
        <group>
          <group position={[ax, ay, az]} rotation={[0, district.laneYaw, 0]} scale={1.5}>
            <DishTower lit={lit} />
          </group>
          <group position={[hx, sampleTerrain(layout, hx, hz).height, hz]} rotation={[0, district.laneYaw, 0]} scale={1.6}>
            <Helipad />
          </group>
        </group>
      )
    }
  }
}

/* ---------- districts ---------- */

export function Districts({
  layout,
  progress,
  seed,
  night,
  darkDistrict,
}: {
  layout: BiomeLayout
  progress: DistrictProgress
  seed: number
  night: boolean
  darkDistrict: string | null
}) {
  const slotsById = useMemo(() => new Map<string, Slot[]>(layout.districts.map((c) => [c.id, districtSlots(layout, c)])), [layout])
  const placements = useMemo(() => propPlacements(layout, seed), [layout, seed])
  return (
    <group>
      {layout.districts.map((district) => {
        const pop = populationFor(district, progress[district.id] ?? 0)
        const dark = darkDistrict === district.id || darkDistrict === '*'
        const lit = night && !dark
        const slots = slotsById.get(district.id) ?? []
        const props = placements.filter((p) => p.districtId === district.id && p.minBand <= pop.band)
        return (
          <group key={district.id}>
            <Anchors layout={layout} district={district} night={night} dark={dark} />
            {slots.slice(0, pop.buildings).map((slot) => (
              <group key={slot.index} position={slot.position} rotation={[0, slot.yaw, 0]} scale={BUILDING_SCALE[district.building]}>
                <Building kind={district.building} index={slot.index} lit={lit} />
              </group>
            ))}
            {pop.extras && district.id === 'glacier' &&
              slots.map((slot) => (
                <group key={`x${slot.index}`} position={[slot.position[0] + 3.6, slot.position[1], slot.position[2] - 2.8]} rotation={[0, slot.yaw + 0.5, 0]} scale={1.5}>
                  <Building kind="tent" index={slot.index + 1} lit={lit} />
                </group>
              ))}
            {props.map((p) => (
              <Knockable key={p.index} placement={p}>
                <Prop kind={p.kind} lit={lit && (p.kind !== 'lamp' || pop.fences)} scale={p.scale} length={p.length} />
              </Knockable>
            ))}
          </group>
        )
      })}
    </group>
  )
}
