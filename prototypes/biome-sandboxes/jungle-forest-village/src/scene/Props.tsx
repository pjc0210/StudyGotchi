import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ICE_TOWN_PALETTE as P, type BuildingKind } from '../layout/biome-layout'
import type { PropKind } from '../layout/terrain'
import { Glow, Surf } from '../render/materials'

/* Every object here is primitive geometry with the shared toon material: two or three flat
 * colours plus one accent. Sizes are metres at scale 1 (houses 4.5–6 m, per the pass-3 scale
 * rethink); the forest town and harbour pieces are built at scale 1, the older ones are scaled
 * up in Structures. */

/* ---------- shared bits ---------- */

function SnowRoof({ w, d, h = 0.7, y }: { w: number; d: number; h?: number; y: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[Math.max(w, d) * 0.78, h, 4]} />
      <Surf color={P.snow} />
    </mesh>
  )
}

const gableCache = new Map<string, THREE.BufferGeometry>()

/** Triangular prism: ridge along z, base `w` wide (x), `d` deep (z), `h` tall; base at y = 0. */
export function gableGeometry(w: number, d: number, h: number): THREE.BufferGeometry {
  const key = `${w}:${d}:${h}`
  const cached = gableCache.get(key)
  if (cached) return cached
  const hw = w / 2
  const hd = d / 2
  // Six corners: base rectangle plus the two ridge ends.
  const v = [
    [-hw, 0, -hd],
    [hw, 0, -hd],
    [hw, 0, hd],
    [-hw, 0, hd],
    [0, h, -hd],
    [0, h, hd],
  ]
  const faces = [
    // left slope, right slope (quads as two triangles), two gable ends, bottom
    [0, 3, 5, 0, 5, 4],
    [1, 4, 5, 1, 5, 2],
    [0, 4, 1],
    [3, 2, 5],
    [0, 1, 2, 0, 2, 3],
  ].flat()
  const positions: number[] = []
  for (const i of faces) positions.push(...v[i])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  gableCache.set(key, geo)
  return geo
}

/**
 * Steep gable roof with a thick snow slab (winter-forest-town ref): dark timber gable ends poke
 * out under a white ridge. `w` across the gable, `d` along the ridge.
 */
export function GableRoof({ w, d, h, y, color = P.timberDark }: { w: number; d: number; h: number; y: number; color?: string }) {
  const timber = useMemo(() => gableGeometry(w + 0.1, d + 0.5, h), [w, d, h])
  const snow = useMemo(() => gableGeometry(w + 0.5, d + 0.2, h + 0.22), [w, d, h])
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={timber} castShadow>
        <Surf color={color} />
      </mesh>
      <mesh geometry={snow} position={[0, 0.16, 0]} castShadow>
        <Surf color={P.snow} />
      </mesh>
    </group>
  )
}

function Chimney({ position, h = 1.6 }: { position: [number, number, number]; h?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[0.7, h, 0.7]} />
        <Surf color={P.stone} />
      </mesh>
      <mesh position={[0, h + 0.08, 0]}>
        <boxGeometry args={[0.8, 0.16, 0.8]} />
        <Surf color={P.snow} />
      </mesh>
    </group>
  )
}

function Window({ position, lit, w = 0.28, h = 0.32 }: { position: [number, number, number]; lit: boolean; w?: number; h?: number }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[w, h, 0.05]} />
      <Glow color={P.light} on={lit} intensity={1.1} />
    </mesh>
  )
}

function Post({ position, h = 1.0, r = 0.06, color = P.timberDark }: { position: [number, number, number]; h?: number; r?: number; color?: string }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[r, r * 1.2, h, 5]} />
      <Surf color={color} />
    </mesh>
  )
}

/* ---------- buildings ---------- */

const WALLS = [P.cream, P.timberTeal, P.timberSlate, P.timberDark]

export function TimberHouse({ index, lit }: { index: number; lit: boolean }) {
  const wall = index === 0 ? P.timberRed : WALLS[index % WALLS.length]
  const tall = index % 3 === 1
  const h = tall ? 1.8 : 1.4
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[1.8, h, 1.5]} />
        <Surf color={wall} />
      </mesh>
      <SnowRoof w={1.9} d={1.6} h={0.9} y={h + 0.42} />
      <Window position={[-0.42, h * 0.6, 0.78]} lit={lit} />
      <Window position={[0.42, h * 0.6, 0.78]} lit={lit} />
      <mesh position={[0, 0.42, 0.78]}>
        <boxGeometry args={[0.36, 0.72, 0.05]} />
        <Surf color={P.ink} />
      </mesh>
      <mesh position={[0.6, h + 0.6, -0.3]} castShadow>
        <boxGeometry args={[0.3, 0.7, 0.3]} />
        <Surf color={P.rockDeep} />
      </mesh>
    </group>
  )
}

/**
 * Harbour house on stilts (fishing-village ref): a plank deck 1.3 m up on posts that stand in the
 * shallows, a red / teal / slate cabin with a snow gable, a lamp on the deck corner. ~5.6 m tall.
 */
export function StiltHouse({ index, lit }: { index: number; lit: boolean }) {
  const wall = index % 3 === 0 ? P.timberRed : index % 3 === 1 ? P.timberTeal : P.timberSlate
  const deck = 1.3
  const w = 3.8
  const d = 3.0
  const wallH = 2.5
  return (
    <group>
      {[-2.0, 2.0].flatMap((x) =>
        [-1.6, 1.6].map((z) => <Post key={`${x}:${z}`} position={[x, deck / 2 - 0.4, z]} h={deck + 0.8} r={0.11} color={P.timberDark} />),
      )}
      <mesh position={[0, deck, 0]} receiveShadow castShadow>
        <boxGeometry args={[5.0, 0.16, 4.2]} />
        <Surf color={P.planks} />
      </mesh>
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, deck + 0.45, 0]} castShadow>
          <boxGeometry args={[0.06, 0.06, 4.2]} />
          <Surf color={P.cream} />
        </mesh>
      ))}
      <mesh position={[-0.3, deck + wallH / 2, -0.3]} castShadow>
        <boxGeometry args={[w, wallH, d]} />
        <Surf color={wall} />
      </mesh>
      <GableRoof w={w} d={d} h={1.7} y={deck + wallH} color={wall} />
      <Window position={[-0.9, deck + 1.5, d / 2 - 0.3 + 0.03]} lit={lit} w={0.55} h={0.6} />
      <Window position={[0.4, deck + 1.5, d / 2 - 0.3 + 0.03]} lit={lit} w={0.55} h={0.6} />
      <mesh position={[w / 2 - 0.3 + 0.03, deck + 0.9, 0.4]}>
        <boxGeometry args={[0.05, 1.7, 0.8]} />
        <Surf color={P.ink} />
      </mesh>
      <Chimney position={[-1.4, deck + wallH + 0.9, -1.0]} h={1.1} />
      <mesh position={[2.0, deck / 2, 2.4]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.7, 0.06, deck * 1.25]} />
        <Surf color={P.planks} />
      </mesh>
    </group>
  )
}

/**
 * Forest-town house (winter-forest-town ref): dark timber walls with log lines, a steep gable
 * with a thick snow ridge, a stone chimney, warm windows. Variants: tall two-storey, porch,
 * pale slate walls. 4.9–5.9 m tall at scale 1.
 */
export function ForestHouse({ index, lit }: { index: number; lit: boolean }) {
  const tall = index % 3 === 1
  const porch = index % 4 === 2
  const wall = index % 5 === 3 ? P.timberSlate : index % 7 === 6 ? P.trunk : P.timberDark
  const w = tall ? 4.6 : 4.2
  const d = tall ? 3.8 : 3.4
  const wallH = tall ? 3.4 : 2.4
  const roofH = tall ? 2.6 : 2.5
  const logColor = wall === P.timberSlate ? '#5f6f86' : P.trunk
  return (
    <group>
      <mesh position={[0, wallH / 2, 0]} castShadow>
        <boxGeometry args={[w, wallH, d]} />
        <Surf color={wall} />
      </mesh>
      {[0.5, 1.3, ...(tall ? [2.2, 3.0] : [])].map((y) => (
        <mesh key={y} position={[0, y, d / 2 + 0.02]}>
          <boxGeometry args={[w + 0.04, 0.09, 0.05]} />
          <Surf color={logColor} />
        </mesh>
      ))}
      <GableRoof w={w} d={d} h={roofH} y={wallH} color={wall === P.timberSlate ? P.timberDark : wall} />
      <Chimney position={[w * 0.28, wallH + roofH * 0.55, -d * 0.2]} h={roofH * 0.7} />
      <Window position={[-w * 0.25, wallH * 0.55, d / 2 + 0.03]} lit={lit} w={0.55} h={0.65} />
      <Window position={[w * 0.28, wallH * 0.55, d / 2 + 0.03]} lit={lit} w={0.55} h={0.65} />
      {tall && <Window position={[0, wallH + 0.7, d / 2 + 0.3]} lit={lit} w={0.5} h={0.6} />}
      <mesh position={[0, 0.9, d / 2 + 0.03]}>
        <boxGeometry args={[0.8, 1.8, 0.06]} />
        <Surf color={P.ink} />
      </mesh>
      {porch && (
        <group position={[0, 0, d / 2 + 1.1]}>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[w * 0.8, 0.3, 2.0]} />
            <Surf color={P.planks} />
          </mesh>
          {[-w * 0.36, w * 0.36].map((x) => (
            <Post key={x} position={[x, 1.3, 0.8]} h={2.2} r={0.09} />
          ))}
          <mesh position={[0, 2.5, 0.2]} rotation={[0.35, 0, 0]} castShadow>
            <boxGeometry args={[w * 0.9, 0.18, 2.4]} />
            <Surf color={P.snow} />
          </mesh>
        </group>
      )}
    </group>
  )
}

export function FishingHut({ index, lit }: { index: number; lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.2, 1.1, 1.1]} />
        <Surf color={index === 0 ? P.coral : index % 2 === 0 ? P.timberSlate : P.cream} />
      </mesh>
      <mesh position={[0, 1.18, 0]} castShadow>
        <boxGeometry args={[1.4, 0.18, 1.3]} />
        <Surf color={P.snow} />
      </mesh>
      <Window position={[0, 0.62, 0.58]} lit={lit} />
      <Post position={[0.5, 1.6, -0.4]} h={0.8} r={0.03} color={P.ink} />
    </group>
  )
}

export function Tent({ index }: { index: number }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.25, 1.1, 4]} />
        <Surf color={index === 0 ? P.peach : index % 2 ? P.cream : P.lilac} />
      </mesh>
      <mesh position={[0, 0.2, 0.62]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <Surf color={P.ink} />
      </mesh>
    </group>
  )
}

export function Quonset({ index, lit }: { index: number; lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 2.6, 10, 1, false, 0, Math.PI]} />
        <Surf color={index === 0 ? P.timberRed : P.stationBlue} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.3, 0.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.95, 10, 0, Math.PI]} />
        <Surf color={P.cream} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-1.3, 0.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[0.95, 10, 0, Math.PI]} />
        <Surf color={P.cream} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.15, 0]} scale={[1, 0.3, 1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.9, 0.9, 2.4, 10, 1, false, 0, Math.PI]} />
        <Surf color={P.snow} side={THREE.DoubleSide} />
      </mesh>
      <Window position={[1.33, 0.5, 0]} lit={lit} w={0.3} h={0.36} />
    </group>
  )
}

export function Building({ kind, index, lit }: { kind: BuildingKind; index: number; lit: boolean }) {
  switch (kind) {
    case 'stilt-house':
      return <StiltHouse index={index} lit={lit} />
    case 'timber-house':
      return <TimberHouse index={index} lit={lit} />
    case 'fishing-hut':
      return <FishingHut index={index} lit={lit} />
    case 'forest-house':
      return <ForestHouse index={index} lit={lit} />
    case 'tent':
      return <Tent index={index} />
    case 'quonset':
      return <Quonset index={index} lit={lit} />
  }
}

/* ---------- trees, rocks ---------- */

export function Pine({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.0, 6]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <coneGeometry args={[0.85, 1.4, 7]} />
        <Surf color={P.pine} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <coneGeometry args={[0.62, 1.2, 7]} />
        <Surf color={P.pineLight} />
      </mesh>
      <mesh position={[0, 2.4, 0]} castShadow>
        <coneGeometry args={[0.38, 0.8, 7]} />
        <Surf color={P.snow} />
      </mesh>
    </group>
  )
}

export function PineTrio({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <Pine scale={1.15} />
      <group position={[1.6, 0, 0.6]}>
        <Pine scale={0.85} />
      </group>
      <group position={[-1.1, 0, 1.3]}>
        <Pine scale={0.65} />
      </group>
    </group>
  )
}

export function BareTree({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.14, 1.8, 5]} />
        <Surf color={P.trunk} />
      </mesh>
      {[
        [0.35, 1.7, 0, 0.5, 0.9],
        [-0.3, 1.9, 0.1, -0.6, 0.8],
        [0.05, 2.2, -0.3, 0.2, 0.7],
        [-0.1, 1.5, 0.3, -0.3, 0.5],
      ].map(([x, y, z, rz, l], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0.3 * (i % 2), 0, rz]} castShadow>
          <cylinderGeometry args={[0.02, 0.05, l, 4]} />
          <Surf color={P.trunk} />
        </mesh>
      ))}
    </group>
  )
}

export function Boulders({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      {[
        [0, 0.55, 0, 0.9],
        [1.3, 0.35, 0.5, 0.6],
        [-0.9, 0.3, 0.9, 0.5],
      ].map(([x, y, z, r], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh castShadow>
            <dodecahedronGeometry args={[r, 0]} />
            <Surf color={P.rock} />
          </mesh>
          <mesh position={[0, r * 0.55, 0]} scale={[1, 0.35, 1]}>
            <dodecahedronGeometry args={[r * 0.9, 0]} />
            <Surf color={P.snow} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function CrystalCluster({ scale = 1, glow }: { scale?: number; glow: boolean }) {
  return (
    <group scale={scale}>
      {[
        [0, 1.6, 0, 0.6, 3.2],
        [1.1, 1.0, 0.4, 0.42, 2.0],
        [-0.8, 0.8, 0.9, 0.36, 1.6],
      ].map(([x, y, z, r, h], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0.05 * i, 0.4 * i, -0.06]} castShadow>
          <coneGeometry args={[r, h, 5]} />
          <Surf color={P.crystal} emissive={P.crystal} emissiveIntensity={glow ? 0.7 : 0.18} />
        </mesh>
      ))}
    </group>
  )
}

export function CrystalSpire({ glow }: { glow: boolean }) {
  return (
    <mesh position={[0, 2.4, 0]} rotation={[0.04, 0.6, -0.05]} castShadow>
      <coneGeometry args={[0.9, 4.8, 5]} />
      <Surf color={P.crystal} emissive={P.crystal} emissiveIntensity={glow ? 0.8 : 0.4} />
    </mesh>
  )
}

/* ---------- small props ---------- */

export function Lamp({ lit }: { lit: boolean }) {
  return (
    <group>
      <Post position={[0, 1.4, 0]} h={2.8} r={0.07} color={P.ink} />
      <mesh position={[0, 2.95, 0]}>
        <octahedronGeometry args={[0.3, 0]} />
        <Glow color={P.light} on={lit} intensity={1.6} />
      </mesh>
      <mesh position={[0, 3.28, 0]}>
        <coneGeometry args={[0.32, 0.24, 6]} />
        <Surf color={P.snow} />
      </mesh>
    </group>
  )
}

export function Fence() {
  return (
    <group>
      {[-1.2, 0, 1.2].map((x) => (
        <Post key={x} position={[x, 0.45, 0]} h={0.9} r={0.05} />
      ))}
      {[0.35, 0.7].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[2.6, 0.07, 0.05]} />
          <Surf color={P.trunk} />
        </mesh>
      ))}
    </group>
  )
}

export function Bench() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.3, 0.08, 0.4]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[0, 0.72, -0.18]} castShadow>
        <boxGeometry args={[1.3, 0.3, 0.06]} />
        <Surf color={P.timberTeal} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.36]} />
          <Surf color={P.ink} />
        </mesh>
      ))}
    </group>
  )
}

export function Crate() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[0, 0.62, 0]} scale={[1, 0.15, 1]}>
        <boxGeometry args={[0.62, 0.6, 0.62]} />
        <Surf color={P.snow} />
      </mesh>
    </group>
  )
}

export function Barrel() {
  return (
    <group>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.76, 8]} />
        <Surf color={P.trunk} />
      </mesh>
      {[0.2, 0.56].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.06, 8]} />
          <Surf color={P.ink} />
        </mesh>
      ))}
    </group>
  )
}

export function FuelDrum() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.84, 8]} />
        <Surf color={P.timberRed} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.18, 8]} />
        <Surf color={P.cream} />
      </mesh>
    </group>
  )
}

export function Snowman() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <dodecahedronGeometry args={[0.45, 1]} />
        <Surf color={P.snow} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <dodecahedronGeometry args={[0.3, 1]} />
        <Surf color={P.snow} />
      </mesh>
      <mesh position={[0, 1.05, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.3, 5]} />
        <Surf color={P.peach} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.24, 8]} />
        <Surf color={P.ink} />
      </mesh>
    </group>
  )
}

export function LogPile() {
  const rows: Array<[number, number]> = [
    [-0.4, 0.2],
    [0, 0.2],
    [0.4, 0.2],
    [-0.2, 0.54],
    [0.2, 0.54],
    [0, 0.88],
  ]
  return (
    <group>
      {rows.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 1.6, 7]} />
          <Surf color={i % 2 ? P.trunk : P.timberDark} />
        </mesh>
      ))}
      <mesh position={[0, 1.1, 0]} scale={[1, 0.25, 1]}>
        <boxGeometry args={[1.0, 0.5, 1.6]} />
        <Surf color={P.snow} />
      </mesh>
    </group>
  )
}

export function Cart() {
  return (
    <group>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1.6, 0.5, 1.0]} />
        <Surf color={P.trunk} />
      </mesh>
      {[-0.5, 0.5].flatMap((x) =>
        [-0.55, 0.55].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.1, 8]} />
            <Surf color={P.ink} />
          </mesh>
        )),
      )}
      <mesh position={[1.3, 0.55, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[1.0, 0.08, 0.1]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[1.3, 0.3, 0.7]} />
        <Surf color={P.timberDark} />
      </mesh>
    </group>
  )
}

export function Stump() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.4, 0.4, 7]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 7]} />
        <Surf color={P.cream} />
      </mesh>
    </group>
  )
}

export function Sawhorse() {
  return (
    <group>
      {[-0.6, 0.6].map((x) =>
        [-0.25, 0.25].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.4, z]} rotation={[z * 1.1, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.85, 0.08]} />
            <Surf color={P.trunk} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1.5, 0.1, 0.12]} />
        <Surf color={P.timberDark} />
      </mesh>
      <mesh position={[0.2, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.4, 6]} />
        <Surf color={P.trunk} />
      </mesh>
    </group>
  )
}

export function Sled() {
  return (
    <group>
      {[-0.3, 0.3].map((z) => (
        <mesh key={z} position={[0, 0.08, z]} castShadow>
          <boxGeometry args={[1.5, 0.06, 0.08]} />
          <Surf color={P.timberRed} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.7]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[0.62, 0.3, 0]} rotation={[0, 0, 0.8]}>
        <boxGeometry args={[0.5, 0.06, 0.7]} />
        <Surf color={P.timberRed} />
      </mesh>
    </group>
  )
}

export function Boat() {
  return (
    <group position={[0, 0.1, 0]}>
      <mesh scale={[1.4, 0.35, 0.6]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={P.timberTeal} />
      </mesh>
      <mesh position={[0, 0.2, 0]} scale={[1.1, 0.1, 0.4]}>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={P.cream} />
      </mesh>
    </group>
  )
}

export function Flag({ color = P.coral }: { color?: string }) {
  return (
    <group>
      <Post position={[0, 1.4, 0]} h={2.8} r={0.04} color={P.ink} />
      <mesh position={[0.35, 2.5, 0]}>
        <boxGeometry args={[0.7, 0.45, 0.04]} />
        <Surf color={color} />
      </mesh>
    </group>
  )
}

export function StringLights({ lit }: { lit: boolean }) {
  const n = 7
  return (
    <group>
      <Post position={[-1.6, 1.1, 0]} h={2.2} r={0.04} color={P.ink} />
      <Post position={[1.6, 1.1, 0]} h={2.2} r={0.04} color={P.ink} />
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1)
        const x = -1.6 + 3.2 * t
        const y = 2.1 - Math.sin(t * Math.PI) * 0.35
        return (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[0.08, 6, 5]} />
            <Glow color={i % 2 ? P.coral : P.light} on={lit} intensity={1.4} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Timber watchtower (forest-town ref): four splayed legs, a cabin with a steep snow gable, a ladder. ~10 m. */
export function Watchtower({ lit }: { lit: boolean }) {
  const legH = 6.2
  return (
    <group>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}:${z}`} position={[x * 1.1, legH / 2, z * 1.1]} rotation={[z * 0.09, 0, -x * 0.09]} castShadow>
            <cylinderGeometry args={[0.12, 0.17, legH, 5]} />
            <Surf color={P.timberDark} />
          </mesh>
        )),
      )}
      {[1.6, 3.4, 5.0].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[2.3 - y * 0.06, 0.12, 2.3 - y * 0.06]} />
          <Surf color={P.trunk} />
        </mesh>
      ))}
      <mesh position={[0, legH + 0.1, 0]} castShadow>
        <boxGeometry args={[3.0, 0.2, 3.0]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[0, legH + 1.3, 0]} castShadow>
        <boxGeometry args={[2.3, 2.2, 2.3]} />
        <Surf color={P.timberDark} />
      </mesh>
      <Window position={[0, legH + 1.5, 1.17]} lit={lit} w={0.7} h={0.6} />
      <Window position={[1.17, legH + 1.5, 0]} lit={lit} w={0.05} h={0.6} />
      <GableRoof w={2.6} d={2.6} h={1.9} y={legH + 2.4} />
      <mesh position={[1.35, legH / 2, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.08, legH, 0.6]} />
        <Surf color={P.trunk} />
      </mesh>
    </group>
  )
}

/** Timber windmill (forest-town ref): a tapered dark tower, snow cap, four lattice sails ~9 m across. */
export function Windmill() {
  const blades = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (blades.current) blades.current.rotation.z += delta * 0.5
  })
  return (
    <group>
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[1.3, 2.0, 6.4, 8]} />
        <Surf color={P.timberDark} />
      </mesh>
      {[1.4, 3.0, 4.6].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[2.05 - y * 0.11, 2.05 - y * 0.11, 0.14, 8]} />
          <Surf color={P.trunk} />
        </mesh>
      ))}
      <mesh position={[0, 6.4, 0]} castShadow>
        <boxGeometry args={[2.4, 1.4, 3.0]} />
        <Surf color={P.trunk} />
      </mesh>
      <GableRoof w={2.6} d={3.0} h={1.5} y={7.1} />
      <mesh position={[0, 4.2, 1.35]}>
        <boxGeometry args={[0.7, 1.4, 0.06]} />
        <Surf color={P.ink} />
      </mesh>
      <group ref={blades} position={[0, 6.6, 1.9]}>
        {[0, Math.PI / 2].map((r) => (
          <group key={r} rotation={[0, 0, r]}>
            <mesh>
              <boxGeometry args={[9.0, 0.16, 0.12]} />
              <Surf color={P.trunk} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 2.7, 0.45, 0]}>
                <boxGeometry args={[3.4, 0.9, 0.05]} />
                <Surf color={P.cream} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.9, 6]} />
          <Surf color={P.ink} />
        </mesh>
      </group>
    </group>
  )
}

/** Fenced plot (forest-town ref): a rail fence around rows of snow-capped crop mounds. 6 × 4 m. */
export function FencedPlot() {
  const w = 6
  const d = 4
  const posts: Array<[number, number]> = []
  for (let x = -w / 2; x <= w / 2 + 0.01; x += 1.5) posts.push([x, -d / 2], [x, d / 2])
  for (let z = -d / 2 + 1.33; z < d / 2; z += 1.33) posts.push([-w / 2, z], [w / 2, z])
  return (
    <group>
      {posts.map(([x, z], i) => (
        <Post key={i} position={[x, 0.5, z]} h={1.0} r={0.06} />
      ))}
      {[0.4, 0.8].map((y) => (
        <group key={y}>
          <mesh position={[0, y, -d / 2]} castShadow>
            <boxGeometry args={[w, 0.08, 0.06]} />
            <Surf color={P.trunk} />
          </mesh>
          <mesh position={[0, y, d / 2]} castShadow>
            <boxGeometry args={[w * 0.62, 0.08, 0.06]} />
            <Surf color={P.trunk} />
          </mesh>
          <mesh position={[-w / 2, y, 0]} castShadow>
            <boxGeometry args={[0.06, 0.08, d]} />
            <Surf color={P.trunk} />
          </mesh>
          <mesh position={[w / 2, y, 0]} castShadow>
            <boxGeometry args={[0.06, 0.08, d]} />
            <Surf color={P.trunk} />
          </mesh>
        </group>
      ))}
      {[-1.2, 0, 1.2].flatMap((z) =>
        [-2.1, -0.7, 0.7, 2.1].map((x) => (
          <group key={`${x}:${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <coneGeometry args={[0.42, 0.55, 5]} />
              <Surf color={P.pine} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.2, 0.22, 5]} />
              <Surf color={P.snow} />
            </mesh>
          </group>
        )),
      )}
    </group>
  )
}

/** Arched plank footbridge over the river, `length` along local x, rails both sides. */
export function Footbridge({ length }: { length: number }) {
  const n = Math.max(6, Math.round(length / 0.5))
  const planks = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n
    const x = (t - 0.5) * length
    return { x, y: 0.35 + Math.sin(t * Math.PI) * 0.55, tilt: -Math.cos(t * Math.PI) * 0.35 }
  })
  return (
    <group>
      {planks.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0]} rotation={[0, 0, p.tilt]} castShadow>
          <boxGeometry args={[length / n + 0.04, 0.14, 2.0]} />
          <Surf color={i % 2 ? P.planks : P.planksLight} />
        </mesh>
      ))}
      {[-0.95, 0.95].map((z) =>
        [0.08, 0.3, 0.5, 0.7, 0.92].map((t) => (
          <Post key={`${z}:${t}`} position={[(t - 0.5) * length, 0.35 + Math.sin(t * Math.PI) * 0.55 + 0.5, z]} h={1.0} r={0.05} />
        )),
      )}
      {[-0.95, 0.95].map((z) => (
        <mesh key={z} position={[0, 1.25, z]} castShadow>
          <boxGeometry args={[length * 0.9, 0.08, 0.08]} />
          <Surf color={P.trunk} />
        </mesh>
      ))}
    </group>
  )
}

export function Helicopter() {
  const rotor = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (rotor.current) rotor.current.rotation.y += delta * 1.2
  })
  return (
    <group position={[0, 0.3, 0]}>
      <mesh position={[0, 0.7, 0]} scale={[1.4, 0.8, 0.8]} castShadow>
        <sphereGeometry args={[1, 8, 6]} />
        <Surf color={P.stationBlue} />
      </mesh>
      <mesh position={[0.9, 0.75, 0]} scale={[0.5, 0.5, 0.6]}>
        <sphereGeometry args={[1, 8, 6]} />
        <Surf color={P.ink} />
      </mesh>
      <mesh position={[-1.9, 0.95, 0]} rotation={[0, 0, 0.1]} castShadow>
        <boxGeometry args={[2.0, 0.22, 0.22]} />
        <Surf color={P.stationBlue} />
      </mesh>
      <mesh position={[-2.8, 1.25, 0]}>
        <boxGeometry args={[0.15, 0.7, 0.1]} />
        <Surf color={P.timberRed} />
      </mesh>
      <mesh ref={rotor} position={[0, 1.6, 0]}>
        <boxGeometry args={[4.4, 0.05, 0.22]} />
        <Surf color={P.ink} />
      </mesh>
      {[-0.5, 0.5].map((z) => (
        <mesh key={z} position={[0, 0.1, z]}>
          <boxGeometry args={[1.8, 0.08, 0.08]} />
          <Surf color={P.ink} />
        </mesh>
      ))}
    </group>
  )
}

export function Antenna() {
  return (
    <group>
      <Post position={[0, 1.6, 0]} h={3.2} r={0.05} color={P.cream} />
      {[1.2, 2.0, 2.8].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, i * 0.7, 0]}>
          <boxGeometry args={[1.2 - i * 0.3, 0.04, 0.04]} />
          <Surf color={P.ink} />
        </mesh>
      ))}
      <mesh position={[0, 3.3, 0]}>
        <sphereGeometry args={[0.1, 6, 5]} />
        <Surf color={P.timberRed} emissive={P.timberRed} emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

export function WarmTent({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.5, 1.4, 4]} />
        <Surf color={P.peach} />
      </mesh>
      <mesh position={[0, 0.35, 0.8]}>
        <boxGeometry args={[0.5, 0.6, 0.05]} />
        <Glow color={P.light} on={lit} intensity={1.2} />
      </mesh>
    </group>
  )
}

/* ---------- anchors ---------- */

export function PlazaTree({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[3.6, 3.8, 0.24, 12]} />
        <Surf color={P.paleIce} />
      </mesh>
      <group position={[0, 0.24, 0]}>
        <Pine scale={2.6} />
      </group>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const r = 1.8 - (i % 2) * 0.5
        return (
          <mesh key={i} position={[Math.cos(a) * r, 3.0 + (i % 3) * 0.9, Math.sin(a) * r]}>
            <sphereGeometry args={[0.2, 6, 5]} />
            <Glow color={i % 2 ? P.coral : P.light} on={lit} intensity={1.4} />
          </mesh>
        )
      })}
    </group>
  )
}

export function FrozenFountain() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[1.6, 1.7, 0.5, 10]} />
        <Surf color={P.rock} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.08, 10]} />
        <Surf color={P.paleIce} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <coneGeometry args={[0.5, 1.2, 6]} />
        <Surf color={P.crystal} emissive={P.crystal} emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

export function SkatingRing() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 4.5, 20]} />
        <Surf color={P.snow} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 4.6, 0.3, Math.sin(a) * 4.6]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[0.1, 0.6, 1.2]} />
            <Surf color={i === 0 ? P.coral : P.cream} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Forest-town anchor (present at 0 %): an open-sided sawmill shed on the river bank with a
 * waterwheel dipping toward the river (local +z), a saw bed, and log piles. ~8 × 6 m, 5.5 m tall.
 */
export function Sawmill({ lit }: { lit: boolean }) {
  const wheel = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.x += delta * 0.7
  })
  return (
    <group>
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[8.0, 0.4, 5.5]} />
        <Surf color={P.planks} />
      </mesh>
      {[-3.4, 3.4].flatMap((x) => [-2.2, 2.2].map((z) => <Post key={`${x}:${z}`} position={[x, 2.0, z]} h={3.6} r={0.14} />))}
      <mesh position={[-2.2, 1.8, -2.4]} castShadow>
        <boxGeometry args={[3.4, 2.8, 0.5]} />
        <Surf color={P.timberDark} />
      </mesh>
      <Window position={[-2.2, 2.0, -2.1]} lit={lit} w={0.7} h={0.6} />
      <GableRoof w={6.4} d={8.6} h={2.4} y={3.8} />
      <mesh position={[0.6, 1.05, 0.2]} castShadow>
        <boxGeometry args={[5.4, 0.3, 1.2]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[1.2, 1.2, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 4.8, 8]} />
        <Surf color={P.trunk} />
      </mesh>
      <mesh position={[-0.6, 1.5, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.8, 0.8, 0.08, 14]} />
        <Surf color={P.stone} />
      </mesh>
      <group ref={wheel} position={[1.6, 1.3, 3.5]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <torusGeometry args={[1.5, 0.16, 6, 12]} />
          <Surf color={P.trunk} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[(i / 6) * Math.PI, 0, 0]}>
            <boxGeometry args={[0.7, 0.14, 3.1]} />
            <Surf color={P.timberDark} />
          </mesh>
        ))}
      </group>
      <mesh position={[1.6, 0.8, 3.1]} castShadow>
        <boxGeometry args={[0.3, 1.6, 0.3]} />
        <Surf color={P.timberDark} />
      </mesh>
      <group position={[-2.6, 0.4, 2.2]} rotation={[0, 0.3, 0]} scale={1.3}>
        <LogPile />
      </group>
      <group position={[3.2, 0.4, -1.8]} rotation={[0, -0.5, 0]} scale={1.3}>
        <LogPile />
      </group>
    </group>
  )
}

export function DishTower({ lit }: { lit: boolean }) {
  const dish = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (dish.current) dish.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.6
  })
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[2.2, 1.8, 2.2]} />
        <Surf color={P.cream} />
      </mesh>
      <mesh position={[0, 4.6, 0]} castShadow>
        <boxGeometry args={[1.5, 5.6, 1.5]} />
        <Surf color={P.cream} />
      </mesh>
      {[0.3, 3.4, 6.4].map((y) => (
        <mesh key={y} position={[0, y + 0.3, 0]}>
          <boxGeometry args={[1.56, 0.5, 1.56]} />
          <Surf color={P.timberRed} />
        </mesh>
      ))}
      <Window position={[0, 6.9, 0.78]} lit={lit} w={0.9} h={0.4} />
      <mesh position={[0, 7.5, 0]}>
        <boxGeometry args={[1.8, 0.12, 1.8]} />
        <Surf color={P.ink} />
      </mesh>
      <group ref={dish} position={[0, 8.6, 0]}>
        <mesh rotation={[0.9, 0, 0]}>
          <sphereGeometry args={[1.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 3]} />
          <Surf color={P.cream} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 1.1, 5]} />
          <Surf color={P.ink} />
        </mesh>
      </group>
    </group>
  )
}

export function Helipad() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[5.0, 0.24, 5.0]} />
        <Surf color={P.cream} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.9, 16]} />
        <Surf color={P.timberRed} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.35, 1.6]} />
        <Surf color={P.timberRed} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/**
 * Harbour anchor: a whale skeleton hung as a display from a timber A-frame gantry on the quay
 * (Philote: "the whale skeleton hanging"). Spine along local x, 11 m; gantry 7 m tall.
 */
export function WhaleSkeletonGantry() {
  const ribs = 8
  const spineY = 3.6
  return (
    <group>
      {[-5.2, 5.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, 3.5, s * 1.2]} rotation={[s * 0.33, 0, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.2, 7.2, 5]} />
              <Surf color={P.timberDark} />
            </mesh>
          ))}
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[0.16, 0.16, 3.0]} />
            <Surf color={P.trunk} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 7.0, 0]} castShadow>
        <boxGeometry args={[11.4, 0.34, 0.34]} />
        <Surf color={P.timberDark} />
      </mesh>
      {[-3.6, 0, 3.6].map((x) => (
        <mesh key={x} position={[x, (7.0 + spineY) / 2, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 7.0 - spineY, 4]} />
          <Surf color={P.cream} />
        </mesh>
      ))}
      <mesh position={[-0.6, spineY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.2, 0.26, 9.4, 6]} />
        <Surf color={P.bone} />
      </mesh>
      {Array.from({ length: ribs }, (_, i) => {
        const t = i / (ribs - 1)
        const r = 1.9 - Math.abs(t - 0.35) * 2.2
        return (
          <mesh key={i} position={[-3.6 + t * 5.6, spineY - 0.1, 0]} rotation={[0, Math.PI / 2, Math.PI]} castShadow>
            <torusGeometry args={[Math.max(0.6, r), 0.11, 5, 9, Math.PI]} />
            <Surf color={P.bone} />
          </mesh>
        )
      })}
      <mesh position={[3.3, spineY - 0.2, 0]} scale={[1.6, 0.75, 0.9]} castShadow>
        <dodecahedronGeometry args={[1.1, 0]} />
        <Surf color={P.bone} />
      </mesh>
      <mesh position={[3.6, spineY - 0.95, 0]} scale={[1.4, 0.3, 0.7]} castShadow>
        <dodecahedronGeometry args={[1.0, 0]} />
        <Surf color={P.bone} />
      </mesh>
      <mesh position={[-5.0, spineY + 0.1, 0]} scale={[1.0, 0.14, 1.7]} castShadow>
        <dodecahedronGeometry args={[1.0, 0]} />
        <Surf color={P.bone} />
      </mesh>
    </group>
  )
}

/**
 * Icebreaker (arctic-base ref): red hull with a black band, cream superstructure, black funnel
 * with a red ring, crane mast and bridge. 17 m long, bow toward local +z. Sits at sea level.
 */
export function Icebreaker({ lit }: { lit: boolean }) {
  return (
    <group position={[0, -0.2, 0]}>
      <mesh position={[0, 1.2, -1.2]} castShadow>
        <boxGeometry args={[5.2, 2.6, 12.0]} />
        <Surf color={P.timberRed} />
      </mesh>
      <mesh position={[0, 1.2, 5.6]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.68]} castShadow>
        <coneGeometry args={[2.6, 3.6, 4]} />
        <Surf color={P.timberRed} />
      </mesh>
      <mesh position={[0, 0.25, -1.2]}>
        <boxGeometry args={[5.3, 0.5, 12.1]} />
        <Surf color={P.ink} />
      </mesh>
      <mesh position={[0, 2.6, -1.2]} receiveShadow>
        <boxGeometry args={[5.0, 0.2, 11.6]} />
        <Surf color={P.cream} />
      </mesh>
      <mesh position={[0, 3.8, -2.8]} castShadow>
        <boxGeometry args={[4.4, 2.2, 5.6]} />
        <Surf color={P.cream} />
      </mesh>
      <mesh position={[0, 5.6, -1.8]} castShadow>
        <boxGeometry args={[3.6, 1.6, 2.6]} />
        <Surf color={P.cream} />
      </mesh>
      {[-1.1, 0, 1.1].map((x) => (
        <Window key={x} position={[x, 5.7, -0.47]} lit={lit} w={0.7} h={0.6} />
      ))}
      {[-1.6, 0, 1.6].map((z) => (
        <Window key={z} position={[2.23, 3.9, -2.8 + z]} lit={lit} w={0.05} h={0.5} />
      ))}
      <mesh position={[0, 6.6, -4.4]} castShadow>
        <cylinderGeometry args={[0.7, 0.8, 2.6, 8]} />
        <Surf color={P.ink} />
      </mesh>
      <mesh position={[0, 7.4, -4.4]}>
        <cylinderGeometry args={[0.74, 0.74, 0.4, 8]} />
        <Surf color={P.timberRed} />
      </mesh>
      <mesh position={[0, 8.0, -1.0]}>
        <cylinderGeometry args={[0.06, 0.1, 3.6, 4]} />
        <Surf color={P.ink} />
      </mesh>
      <mesh position={[0.9, 4.4, 2.2]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 3.4, 0.3]} />
        <Surf color={P.peach} />
      </mesh>
      <mesh position={[0.9, 6.0, 3.4]} rotation={[0.9, 0, 0]}>
        <boxGeometry args={[0.2, 0.2, 3.2]} />
        <Surf color={P.peach} />
      </mesh>
      {[-2.3, 2.3].map((x) => (
        <mesh key={x} position={[x, 3.0, -1.2]}>
          <boxGeometry args={[0.06, 0.6, 11.4]} />
          <Surf color={P.cream} />
        </mesh>
      ))}
    </group>
  )
}

export function IceArch({ span, height }: { span: number; height: number }) {
  return (
    <group>
      <mesh position={[0, height * 0.35, 0]} scale={[1, height / (span * 0.6), 1]} castShadow>
        <torusGeometry args={[span * 0.5, span * 0.16, 5, 9, Math.PI]} />
        <Surf color={P.paleIce} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * span * 0.5, 0, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <dodecahedronGeometry args={[span * 0.2, 0]} />
            <Surf color={P.cliffIce} />
          </mesh>
          <mesh position={[s * 1.2, 0.5, 1.0]} castShadow>
            <dodecahedronGeometry args={[span * 0.11, 0]} />
            <Surf color={P.paleIce} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function IceCave({ glow }: { glow: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.6, -0.6]} castShadow>
        <sphereGeometry args={[2.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Surf color={P.rock} />
      </mesh>
      <mesh position={[0, 0.5, 0.9]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[1.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Surf color={P.ink} />
      </mesh>
      <mesh position={[0, 0.8, 0.5]} castShadow>
        <octahedronGeometry args={[0.55, 0]} />
        <Surf color={P.crystal} emissive={P.crystal} emissiveIntensity={glow ? 1.4 : 0.8} />
      </mesh>
      {glow && <pointLight position={[0, 0.9, 0.9]} color={P.crystal} intensity={6} distance={9} decay={2} />}
      <mesh position={[1.6, 0.5, 1.4]} castShadow>
        <dodecahedronGeometry args={[0.7, 0]} />
        <Surf color={P.rockDeep} />
      </mesh>
    </group>
  )
}

/* ---------- dispatcher ---------- */

export function Prop({ kind, lit, scale = 1, length = 6 }: { kind: PropKind; lit: boolean; scale?: number; length?: number }) {
  switch (kind) {
    case 'lamp':
      return <Lamp lit={lit} />
    case 'fence':
      return <Fence />
    case 'fenced-plot':
      return <FencedPlot />
    case 'footbridge':
      return <Footbridge length={length} />
    case 'bench':
      return <Bench />
    case 'crate':
      return <Crate />
    case 'barrel':
      return <Barrel />
    case 'snowman':
      return <Snowman />
    case 'bare-tree':
      return <BareTree scale={scale} />
    case 'pine':
      return <Pine scale={scale * 1.2} />
    case 'pine-trio':
      return <PineTrio scale={scale} />
    case 'log-pile':
      return <LogPile />
    case 'cart':
      return <Cart />
    case 'stump':
      return <Stump />
    case 'sawhorse':
      return <Sawhorse />
    case 'sled':
      return <Sled />
    case 'fuel-drum':
      return <FuelDrum />
    case 'boat':
      return <Boat />
    case 'flag':
      return <Flag color={P.lilac} />
    case 'crystal':
      return <CrystalCluster scale={scale * 0.8} glow={lit} />
    case 'boulder':
      return <Boulders scale={scale} />
    case 'string-lights':
      return <StringLights lit={lit} />
    case 'watchtower':
      return <Watchtower lit={lit} />
    case 'windmill':
      return <Windmill />
    case 'helicopter':
      return <Helicopter />
    case 'antenna':
      return <Antenna />
    case 'warm-tent':
      return <WarmTent lit={lit} />
  }
}
