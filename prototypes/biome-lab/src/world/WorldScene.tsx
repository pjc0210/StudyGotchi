/**
 * Generic renderer for layouts loaded from JSON (`layout.world`). Minimal, ship-state version:
 * terrain mesh coloured from the layout palette (land, lawn, paving, inland water, cliffs), the
 * sea plane, one paved lane per district, districts from the shared slot system with the family
 * kit (generic fallbacks today), a block skyline that grows by the layout's growth table, and the
 * landmark plinth with block stages. Ice / Chilly Town never takes this path.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import {
  type BiomeLayout,
  type DistrictProgress,
  type LandmarkStage,
  type SkylineBand,
  type WorldSpec,
  bandForProgress,
  courseProgress,
  landmarkStage,
  populationFor,
  seeded,
} from '../layout/biome-layout'
import { fbm, pointAlong, polylineLength } from '../layout/geometry'
import { type GroundMaterial, sampleTerrain } from '../layout/terrain'
import { Glow, Surf } from '../render/materials'
import { familyKit } from './family'
import { toWaterDir, worldAnchorPoint, worldPaths, worldSlots } from './world-terrain'

const SEGMENTS = 300

function groundColour(world: WorldSpec, m: GroundMaterial, steep: boolean): string {
  const c = world.colours
  if (steep && m !== 'water' && m !== 'sea') return c.cliff
  switch (m) {
    case 'lawn':
      return c.lawn
    case 'paving':
    case 'plinth':
      return c.paving
    case 'groundAlt':
      return c.groundAlt
    case 'water':
      return c.inlandWater
    case 'bank':
      return c.groundAlt
    case 'shore':
      return c.shore
    case 'sea':
      return c.water
    default:
      return c.ground
  }
}

export function WorldTerrainMesh({ layout, world, night }: { layout: BiomeLayout; world: WorldSpec; night: boolean }) {
  const geometry = useMemo(() => {
    const extent = layout.worldExtent * 1.25
    const geo = new THREE.PlaneGeometry(extent * 2, extent * 2, SEGMENTS, SEGMENTS)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const mats: GroundMaterial[] = []
    for (let i = 0; i < pos.count; i++) {
      const s = sampleTerrain(layout, pos.getX(i), pos.getZ(i))
      pos.setY(i, s.height)
      mats.push(s.material)
    }
    geo.computeVertexNormals()
    const normals = geo.attributes.normal as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const steep = normals.getY(i) < 0.8
      c.set(groundColour(world, mats[i], steep))
      if (!steep && mats[i] !== 'water' && mats[i] !== 'sea') c.offsetHSL(0, 0, 0.02 * fbm(pos.getX(i) * 0.08, pos.getZ(i) * 0.08))
      if (night) c.offsetHSL(0.02, 0.04, -0.18)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [layout, world, night])
  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <Surf color="#ffffff" vertexColors />
    </mesh>
  )
}

function ribbon(points: Array<[number, number, number]>, width: number): THREE.BufferGeometry {
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
    verts.push(x + (-dz / len) * half, y, z + (dx / len) * half, x - (-dz / len) * half, y, z - (dx / len) * half)
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

function WorldPaths({ layout, world, progress }: { layout: BiomeLayout; world: WorldSpec; progress: DistrictProgress }) {
  const paths = useMemo(() => worldPaths(layout, world).map((p) => ({ path: p, geometry: ribbon(p.points, p.width) })), [layout, world])
  return (
    <group>
      {paths.map(({ path, geometry }, i) => {
        const band = path.districtId ? bandForProgress(progress[path.districtId] ?? 0) : 4
        if (band < path.minBand) return null
        const colour = path.colour === 'road' ? world.colours.road : path.colour === 'lawn' ? world.colours.lawn : world.colours.paving
        return (
          <mesh key={i} geometry={geometry} receiveShadow>
            <Surf color={colour} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

function WorldDistricts({ layout, world, progress, seed, night, darkDistrict }: { layout: BiomeLayout; world: WorldSpec; progress: DistrictProgress; seed: number; night: boolean; darkDistrict: string | null }) {
  const kit = familyKit(world.family)
  const slotsById = useMemo(() => new Map(layout.districts.map((d) => [d.id, worldSlots(layout, world, d)])), [layout, world])
  // Lamps along each lane from 50 %: the one generic prop every district shares.
  const lamps = useMemo(() => {
    const out: Array<{ districtId: string; position: [number, number, number]; yaw: number }> = []
    for (const p of worldPaths(layout, world)) {
      if (!p.districtId || p.kind === 'road') continue
      const flat = p.points.map(([x, , z]) => [x, z] as [number, number])
      const total = polylineLength(flat)
      for (let s = 6, n = 0; s < total - 3; s += 9, n++) {
        const q = pointAlong(flat, s)
        const side = n % 2 === 0 ? 1 : -1
        const x = q.x + -q.dz * (p.width / 2 + 0.8) * side
        const z = q.z + q.dx * (p.width / 2 + 0.8) * side
        const smp = sampleTerrain(layout, x, z)
        if (smp.material === 'water' || smp.material === 'sea') continue
        out.push({ districtId: p.districtId, position: [x, smp.height, z], yaw: Math.atan2(q.dx, q.dz) })
      }
    }
    return out
  }, [layout, world])
  const rng = useMemo(() => seeded(seed), [seed])
  void rng
  return (
    <group>
      {layout.districts.map((district) => {
        const pop = populationFor(district, progress[district.id] ?? 0)
        const dark = darkDistrict === district.id
        const lit = night && !dark
        const slots = slotsById.get(district.id) ?? []
        const [ax, az] = worldAnchorPoint(district)
        const ay = Math.max(layout.seaLevel, sampleTerrain(layout, ax, az).height)
        const Anchor = kit.anchor(district.anchorKind ?? 'none')
        const Building = kit.building(district.building)
        const Lamp = kit.prop('lamp')
        const Pennant = kit.prop('pennant')
        const c = world.colours
        return (
          <group key={district.id}>
            <group position={[ax, ay, az]} rotation={[0, district.laneYaw, 0]}>
              <Anchor kind={district.anchorKind ?? 'none'} c={c} accent={district.accent} accentOn={pop.accent} lit={lit} night={night} band={pop.band} toWater={toWaterDir(world, ax, az)} layout={layout} district={district} />
            </group>
            {pop.accent && (
              <group position={[ax + 4, ay, az + 3]}>
                <Pennant kind="pennant" c={c} accent={district.accent} lit={lit} scale={1} index={0} />
              </group>
            )}
            {slots.slice(0, pop.buildings).map((slot) => (
              <group key={slot.index} position={slot.position} rotation={[0, slot.yaw, 0]}>
                <Building kind={district.building} index={slot.index} lit={lit} height={district.buildingHeight ?? 5.5} c={c} accent={district.accent} />
              </group>
            ))}
            {pop.fences &&
              lamps
                .filter((l) => l.districtId === district.id)
                .map((l, i) => (
                  <group key={`l${i}`} position={l.position} rotation={[0, l.yaw, 0]}>
                    <Lamp kind="lamp" c={c} accent={district.accent} lit={lit} scale={1} index={i} />
                  </group>
                ))}
          </group>
        )
      })}
    </group>
  )
}

/**
 * Block skyline: `count` primary silhouettes along the arc at `height`, `secondary` thinner ones
 * between, `tertiary` wide low ones in a back row; rows haze toward the fog colour. The shape
 * vocabulary per kind (gantries, halls, spires, whipped peaks) is not yet realised.
 */
function BlockSkyline({ layout, world, band, night }: { layout: BiomeLayout; world: WorldSpec; band: SkylineBand; night: boolean }) {
  const s = world.skyline
  const c = world.colours
  const rng = useMemo(() => seeded(77), [])
  void rng
  const items = useMemo(() => {
    const out: Array<{ x: number; z: number; w: number; d: number; h: number; colour: string; row: number }> = []
    const arcZ = (x: number) => s.arcZ + s.arcCurve * x * x
    const order = (n: number) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2))
    const kindColour = s.kind === 'gantry-wall' ? c.steel : s.kind === 'spire-rows' ? c.structureA : s.kind === 'candy-peaks' ? (world.palette.peakPink ?? c.structureB) : c.structureA
    order(band.count).forEach((k, i) => {
      const x = k * s.pitch
      const w = s.kind === 'spire-rows' ? 6 : s.kind === 'candy-peaks' ? s.pitch * 0.95 : s.pitch * 0.7
      out.push({ x, z: arcZ(x), w, d: w * 0.8, h: band.height * (0.8 + 0.2 * ((i * 7) % 3) / 2), colour: s.kind === 'candy-peaks' && i % 2 ? (world.palette.peakBlue ?? c.structureC) : kindColour, row: 0 })
    })
    order(band.secondary).forEach((k) => {
      const x = k * s.pitch + s.pitch / 2
      out.push({ x, z: arcZ(x) - 6, w: 3, d: 3, h: band.secondaryHeight, colour: s.kind === 'gantry-wall' ? c.structureA : c.structureB, row: 1 })
    })
    order(band.tertiary).forEach((k) => {
      const x = k * s.pitch * 1.6
      out.push({ x, z: arcZ(x) - 16, w: 10, d: 10, h: band.tertiaryHeight, colour: c.structureA, row: 2 })
    })
    if (band.hero > 0 && band.rows > 0) {
      const [hx, hz] = s.heroPosition ?? [-(s.pitch * 1.5), arcZ(-(s.pitch * 1.5)) + 4]
      out.push({ x: hx, z: hz, w: 4, d: 4, h: band.hero, colour: c.structureB, row: 0 })
    }
    return out
  }, [band, s, c, world.palette])
  const haze = new THREE.Color(night ? c.skyNight : c.fog)
  return (
    <group>
      <mesh position={[0, layout.groundHeight + 0.5, s.footZ - 30]} receiveShadow>
        <boxGeometry args={[layout.worldExtent * 2.6, 1.2, 70]} />
        <Surf color={c.groundAlt} />
      </mesh>
      {items.map((it, i) => {
        const col = new THREE.Color(it.colour).lerp(haze, [0.1, 0.28, 0.45][it.row])
        if (night) col.offsetHSL(0, 0, -0.15)
        const geo = s.kind === 'candy-peaks' || s.kind === 'mountain-range' ? 'cone' : s.kind === 'spire-rows' && it.row === 0 ? 'spire' : 'box'
        return (
          <group key={i} position={[it.x, layout.groundHeight + 1.1, it.z]}>
            {geo === 'cone' ? (
              <mesh position={[0, it.h / 2, 0]} castShadow>
                <coneGeometry args={[it.w * 0.6, it.h, 7]} />
                <Surf color={`#${col.getHexString()}`} />
              </mesh>
            ) : geo === 'spire' ? (
              <mesh position={[0, it.h / 2, 0]} castShadow>
                <cylinderGeometry args={[it.w * 0.18, it.w * 0.5, it.h, 6]} />
                <Surf color={`#${col.getHexString()}`} />
              </mesh>
            ) : (
              <mesh position={[0, it.h / 2, 0]} castShadow>
                <boxGeometry args={[it.w, it.h, it.d]} />
                <Surf color={`#${col.getHexString()}`} />
              </mesh>
            )}
            {band.lit > 0 && it.row === 0 && (
              <mesh position={[0, it.h * 0.9, it.d / 2 + 0.1]}>
                <boxGeometry args={[Math.min(it.w * 0.5, 2), 0.6, 0.1]} />
                <Glow color={c.accent} on={night} intensity={1.4} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

function WorldLandmark({ layout, world, stage, night }: { layout: BiomeLayout; world: WorldSpec; stage: LandmarkStage; night: boolean }) {
  const lm = world.landmark
  const c = world.colours
  const [x, z] = lm.position
  const y = Math.max(layout.seaLevel, sampleTerrain(layout, x, z).height)
  const idx = stage === 'stake' ? -1 : stage === 's1' ? 0 : stage === 's2' ? 1 : 2
  const st = idx >= 0 ? lm.stages[idx] : null
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, lm.plinthHeight / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[lm.plinthRadius, lm.plinthRadius + 0.3, lm.plinthHeight, 12]} />
        <Surf color={c.paving} />
      </mesh>
      {!st && (
        <mesh position={[0, lm.plinthHeight + 1, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 2, 5]} />
          <Surf color={c.steel} />
        </mesh>
      )}
      {st && (
        <group position={[0, lm.plinthHeight, 0]}>
          <mesh position={[0, st.height * 0.3, 0]} castShadow>
            <boxGeometry args={[st.footprint[0], st.height * 0.6, st.footprint[1]]} />
            <Surf color={c.structureA} />
          </mesh>
          <mesh position={[0, st.height * 0.8, 0]} castShadow>
            {lm.motif === 'dome' ? <sphereGeometry args={[st.footprint[1] * 0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /> : lm.motif === 'spire' ? <coneGeometry args={[st.footprint[1] * 0.2, st.height * 0.6, 6]} /> : <boxGeometry args={[st.footprint[0] * 0.5, st.height * 0.4, st.footprint[1] * 0.5]} />}
            <Surf color={lm.motif === 'gear' ? c.structureB : c.structureC} />
          </mesh>
          <mesh position={[0, st.height * 0.45, st.footprint[1] / 2 + 0.05]}>
            <boxGeometry args={[Math.min(3, st.footprint[0] * 0.3), 1, 0.08]} />
            <Glow color={c.window} on={night} intensity={1.4} />
          </mesh>
        </group>
      )}
    </group>
  )
}

export interface WorldSceneProps {
  layout: BiomeLayout
  world: WorldSpec
  progress: DistrictProgress
  seed: number
  night: boolean
  darkDistrict: string | null
}

export function WorldScene({ layout, world, progress, seed, night, darkDistrict }: WorldSceneProps) {
  const fraction = courseProgress(layout, progress)
  const band = world.skyline.growth[bandForProgress(fraction)]
  return (
    <>
      <mesh position={[0, layout.seaLevel, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2400, 64]} />
        <Surf color={night ? world.colours.waterNight : world.colours.water} />
      </mesh>
      <WorldTerrainMesh layout={layout} world={world} night={night} />
      <WorldPaths layout={layout} world={world} progress={progress} />
      <WorldDistricts layout={layout} world={world} progress={progress} seed={seed} night={night} darkDistrict={darkDistrict} />
      <BlockSkyline layout={layout} world={world} band={band} night={night} />
      <WorldLandmark layout={layout} world={world} stage={landmarkStage(fraction)} night={night} />
    </>
  )
}
