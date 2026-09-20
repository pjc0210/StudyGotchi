import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ICE_TOWN_PALETTE as P, type BiomeLayout, type MountainProfile } from '../layout/biome-layout'
import { ambientScatter, fbm, floePositions, forestPines, harbourShoreMask, mountainPeaks, sampleTerrain, type GroundMaterial, type Sample } from '../layout/terrain'
import { Surf, toonRamp } from '../render/materials'
import { IceArch, IceCave, Pine } from './Props'

/** Generic-world materials never occur on the Ice terrain; the world terrain mesh colours them from its palette. */
const WORLD_UNUSED = { ground: P.snow, groundAlt: P.snowShadow, lawn: P.snow, paving: P.paleIce, water: P.openWater, bank: P.riverBank, shore: P.rock, plinth: P.paleIce } as const

/** Plan §6: fewer, paler ground colours. Snow, pale ice, lavender rock, dark water; the river is the one teal. */
const GROUND: Record<GroundMaterial, string> = {
  sea: '#2a5474',
  snow: P.snow,
  ice: P.paleIce,
  lake: '#cfe3f1',
  openWater: P.openWater,
  rock: P.rock,
  mountain: P.snow,
  river: P.river,
  riverBank: P.riverBank,
  ...WORLD_UNUSED,
}

/** Steep faces: ice-blue at the coasts, lavender rock on the mountains and the outcrop. */
const STEEP: Record<GroundMaterial, string> = {
  sea: '#2a5474',
  snow: P.cliffIce,
  ice: P.cliffIce,
  lake: P.cliffIce,
  openWater: P.openWater,
  rock: P.rockDeep,
  mountain: P.rock,
  river: P.river,
  riverBank: P.riverBank,
  ...WORLD_UNUSED,
}
/** The harbour beach: a sloped shore keeps its snow instead of turning into cliff ice. */
const BEACH = '#e3ebf0'
/** Damp snow at the harbour waterline; the beach lerps toward it as it nears the sea. */
const WET_SNOW = new THREE.Color('#b9c9d6')

const SEGMENTS = 340
/** Cool blue-lavender for the range faces (ice-arch-horizon ref); caps stay snow. */
const MOUNTAIN_FACE = '#a3adca'
/** Shelf seams near the mainland read as a lighter crack, not a shadow. */
const SEAM_LIGHT = '#f7fafc'
/**
 * Facet shading baked into the range's vertex colours: the pale snow palette blows out under the
 * key light and the toon ramp, so the lit / half / shade steps are written into the albedo where
 * the fog and tone mapping cannot flatten them. Back rows are hazed toward the sky per row.
 */
const FACET_STEPS: [number, number, number] = [1, 0.86, 0.7]
const ROW_HAZE = [0, 0, 0.22, 0.42]
const DAY_LIGHT = new THREE.Vector3(60, 90, 70).normalize()
const NIGHT_LIGHT = new THREE.Vector3(-40, 60, 30).normalize()

function facetStep(nx: number, ny: number, nz: number, light: THREE.Vector3): number {
  const ndl = nx * light.x + ny * light.y + nz * light.z
  return ndl > 0.62 ? FACET_STEPS[0] : ndl > 0.3 ? FACET_STEPS[1] : FACET_STEPS[2]
}

interface TerrainProps {
  layout: BiomeLayout
  profile: MountainProfile
  night: boolean
}

export function Terrain({ layout, profile, night }: TerrainProps) {
  const extent = layout.worldExtent
  // Geometry depends only on the mountain band: clusters never move the ground (plan §3).
  const built = useMemo(() => {
    const geo = new THREE.PlaneGeometry(extent * 2, extent * 2, SEGMENTS, SEGMENTS)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const samples: Sample[] = Array.from({ length: pos.count })
    const peaks = mountainPeaks(layout, profile)
    for (let i = 0; i < pos.count; i++) {
      const s = sampleTerrain(layout, pos.getX(i), pos.getZ(i), profile, peaks)
      pos.setY(i, s.height)
      samples[i] = s
    }
    geo.computeVertexNormals()
    return { geo, samples }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, profile.band, extent])

  const geometry = useMemo(() => {
    const { geo, samples } = built
    const pos = geo.attributes.position as THREE.BufferAttribute
    const normals = geo.attributes.normal as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    const haze = new THREE.Color(night ? P.skyNight : P.sky)
    const light = night ? NIGHT_LIGHT : DAY_LIGHT
    for (let i = 0; i < pos.count; i++) {
      const s = samples[i]
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const ny = normals.getY(i)
      const steep = ny < 0.8
      if (s.material === 'mountain') {
        const cap = s.peakFrac >= profile.snowLine
        c.set(cap ? P.snow : steep ? MOUNTAIN_FACE : P.snowShadow)
        const step = facetStep(normals.getX(i), ny, normals.getZ(i), light)
        // Caps keep more of their white on the shade side; rock faces take the full step.
        c.multiplyScalar(cap ? 0.55 + 0.45 * step : step)
        c.lerp(haze, ROW_HAZE[s.mountainRow])
      } else if (s.material === 'ice' && !steep && s.height < layout.shelfHeight - 0.2) {
        c.set(SEAM_LIGHT)
      } else if (steep && s.material === 'snow' && s.height > layout.seaLevel && harbourShoreMask(layout, x, z) > 0.5) {
        c.set(BEACH)
      } else {
        c.set(steep ? STEEP[s.material] : GROUND[s.material])
      }
      // Ground variation (grammar §g): a few percent of lightness, never hue.
      const l = s.material === 'sea' || s.material === 'openWater' ? 0 : 0.02 * fbm(x * 0.08, z * 0.08) + 0.01 * fbm(x * 0.5, z * 0.5)
      c.offsetHSL(0, 0, l)
      // Harbour beach: a wet blue-grey gradient from the waterline up the incline, so the slope
      // reads even on flat-lit snow (fishing-village ref: darker, damp shore under the stilts).
      if (s.material === 'snow' && !steep) {
        const shore = harbourShoreMask(layout, x, z)
        if (shore > 0) {
          const wet = (1 - Math.min(1, Math.max(0, (s.height - layout.seaLevel) / 3.6))) * shore
          c.lerp(WET_SNOW, wet * 0.55)
        }
      }
      if (night && s.material !== 'mountain') c.offsetHSL(0.03, 0.05, -0.16)
      else if (night) c.offsetHSL(0.03, 0.05, -0.1)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [built, night, profile.snowLine, layout.shelfHeight])

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <Surf color="#ffffff" vertexColors />
    </mesh>
  )
}

export function Water({ layout, night }: { layout: BiomeLayout; night: boolean }) {
  return (
    <mesh position={[0, layout.seaLevel, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[2400, 64]} />
      <Surf color={night ? P.waterNight : P.water} />
    </mesh>
  )
}

export function Floes({ layout, seed, night }: { layout: BiomeLayout; seed: number; night: boolean }) {
  const floes = useMemo(() => floePositions(layout, seed), [layout, seed])
  return (
    <group>
      {floes.map(([x, z, r, yaw], i) => (
        <group key={i} position={[x, layout.seaLevel + 0.1, z]} rotation={[0, yaw, 0]}>
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[r, r * 1.05, 0.3, 6]} />
            <Surf color={night ? P.snowShadow : P.snow} />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[r * 1.05, r * 0.95, 0.3, 6]} />
            <Surf color={P.cliffIce} />
          </mesh>
          {i % 5 === 0 && (
            <mesh position={[r * 0.3, 0.55, 0]} scale={[1.1, 0.6, 0.6]} castShadow>
              <dodecahedronGeometry args={[0.55, 0]} />
              <Surf color={P.cream} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/** Snow-laden pines (winter-forest-town ref): pale sage-blue tiers under a white tip, dark trunk. */
const FOREST_TIERS: Array<{ color: string; y: number; r: number; h: number }> = [
  { color: '#b5cfcc', y: 1.35, r: 0.98, h: 1.7 },
  { color: '#cfe0e0', y: 2.25, r: 0.72, h: 1.5 },
  { color: P.pineSnow, y: 3.0, r: 0.42, h: 1.1 },
]

/**
 * The dense pine belt around the forest town, instanced (one draw per tier) so a few hundred trees
 * cost nothing. Ambient: present at 0 %.
 */
export function Forest({ layout, seed, night }: { layout: BiomeLayout; seed: number; night: boolean }) {
  const trees = useMemo(() => forestPines(layout, seed), [layout, seed])
  const trunk = useRef<THREE.InstancedMesh>(null)
  const tiers = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    trees.forEach((t, i) => {
      q.setFromAxisAngle(up, t.yaw)
      m.compose(new THREE.Vector3(t.x, t.y + 0.5 * t.scale, t.z), q, new THREE.Vector3(t.scale, t.scale, t.scale))
      trunk.current?.setMatrixAt(i, m)
      tiers.forEach((ref, k) => {
        const tier = FOREST_TIERS[k]
        m.compose(new THREE.Vector3(t.x, t.y + tier.y * t.scale, t.z), q, new THREE.Vector3(t.scale, t.scale, t.scale))
        ref.current?.setMatrixAt(i, m)
      })
    })
    if (trunk.current) trunk.current.instanceMatrix.needsUpdate = true
    for (const ref of tiers) if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trees])
  const ramp = toonRamp()
  const shade = night ? 0.72 : 1
  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 1.0, 5]} />
        <meshToonMaterial color={P.trunk} gradientMap={ramp} />
      </instancedMesh>
      {FOREST_TIERS.map((tier, k) => (
        <instancedMesh key={k} ref={tiers[k]} args={[undefined, undefined, trees.length]} castShadow>
          <coneGeometry args={[tier.r, tier.h, 6]} />
          <meshToonMaterial color={new THREE.Color(tier.color).multiplyScalar(shade)} gradientMap={ramp} />
        </instancedMesh>
      ))}
    </group>
  )
}

/** Ambient scatter in the empty snow: pine groves and lavender rock outcrops. Never progress. */
export function Scatter({ layout, seed }: { layout: BiomeLayout; seed: number }) {
  const items = useMemo(() => ambientScatter(layout, seed), [layout, seed])
  return (
    <group>
      {items.map((s, i) => (
        <group key={i} position={s.position} rotation={[0, s.yaw, 0]}>
          {s.items.map((it, j) =>
            s.kind === 'grove' ? (
              <group key={j} position={[it.dx, it.y, it.dz]}>
                <Pine scale={1.2 * it.scale} />
              </group>
            ) : (
              <group key={j} position={[it.dx, it.y, it.dz]} rotation={[0, j * 1.3, 0]} scale={it.scale}>
                <mesh position={[0, 0.7, 0]} castShadow>
                  <dodecahedronGeometry args={[1.1, 0]} />
                  <Surf color={j % 2 ? P.rock : P.rockDeep} />
                </mesh>
                <mesh position={[0, 1.35, 0]} scale={[1, 0.35, 1]}>
                  <dodecahedronGeometry args={[0.95, 0]} />
                  <Surf color={P.snow} />
                </mesh>
              </group>
            ),
          )}
        </group>
      ))}
    </group>
  )
}

/** Natural landmarks that live on the terrain: the hero ice arch and the outcrop's ice cave. */
export function Landforms({ layout, night }: { layout: BiomeLayout; night: boolean }) {
  const arch = layout.iceArch
  const archY = sampleTerrain(layout, arch.center[0], arch.center[1]).height
  const { center: oc, radius: orad, caveYaw } = layout.outcrop
  const cx = oc[0] + Math.sin(caveYaw) * orad * 0.62
  const cz = oc[1] + Math.cos(caveYaw) * orad * 0.62
  const caveY = sampleTerrain(layout, cx, cz).height
  return (
    <group>
      <group position={[arch.center[0], Math.max(layout.seaLevel, archY) - 0.2, arch.center[1]]} rotation={[0, arch.yaw, 0]}>
        <IceArch span={arch.span} height={arch.height} />
      </group>
      <group position={[cx, caveY - 0.3, cz]} rotation={[0, caveYaw, 0]}>
        <IceCave glow={night} />
      </group>
    </group>
  )
}
