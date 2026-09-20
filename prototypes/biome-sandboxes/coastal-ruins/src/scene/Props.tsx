import * as THREE from 'three'
import { COASTAL_PALETTE as P, type BuildingKind } from '../layout/biome-layout'
import type { PropKind } from '../layout/terrain'
import { Glow, Surf } from '../render/materials'

function Window({ position, lit, color = P.cobalt }: { position: [number, number, number]; lit: boolean; color?: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.72, 0.78, 0.08]} />
      {lit ? <Glow color={P.window} on intensity={1.6} /> : <Surf color={color} />}
    </mesh>
  )
}

function FlatRoof({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <group>
      <mesh position={[0, height, 0]} castShadow>
        <boxGeometry args={[width + 0.35, 0.24, depth + 0.35]} />
        <Surf color={P.plaster} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * width * 0.48, height + 0.38, 0]} castShadow>
          <boxGeometry args={[0.18, 0.72, depth + 0.25]} />
          <Surf color={P.ruin} />
        </mesh>
      ))}
    </group>
  )
}

function PlasterHouse({ index, lit }: { index: number; lit: boolean }) {
  const width = 4.5 + (index % 3) * 0.55
  const depth = 3.8 + (index % 2) * 0.65
  const height = 3.2 + (index % 4 === 1 ? 1.3 : 0)
  const ochre = index % 5 === 3
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <Surf color={ochre ? P.ochre : P.plaster} />
      </mesh>
      <FlatRoof width={width} depth={depth} height={height} />
      <Window position={[-1.15, height * 0.58, depth / 2 + 0.05]} lit={lit} />
      <Window position={[0.2, height * 0.58, depth / 2 + 0.05]} lit={lit} />
      <mesh position={[width / 2 + 0.06, 1.5, 0]}>
        <boxGeometry args={[0.1, 1.7, 0.85]} />
        <Surf color={P.cobalt} />
      </mesh>
      {index % 3 === 0 && (
        <mesh position={[0.8, height + 0.65, -0.6]} castShadow>
          <boxGeometry args={[0.35, 1.1, 0.35]} />
          <Surf color={P.ruin} />
        </mesh>
      )}
    </group>
  )
}

function SurveyShelter({ index, lit }: { index: number; lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[4.8, 2.9, 3.6]} />
        <Surf color={index % 2 ? '#e1d2b0' : P.plaster} />
      </mesh>
      <mesh position={[0, 3.05, 0]} rotation={[0, 0, index % 2 ? 0.04 : -0.03]} castShadow>
        <boxGeometry args={[5.3, 0.2, 4.1]} />
        <Surf color={index === 0 ? P.cobalt : P.ruin} />
      </mesh>
      <Window position={[0, 1.7, 1.84]} lit={lit} />
      <mesh position={[-1.4, 0.9, 1.84]}>
        <boxGeometry args={[0.9, 1.8, 0.08]} />
        <Surf color={P.ruinDark} />
      </mesh>
    </group>
  )
}

function TerraceShed({ index, lit }: { index: number; lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[5.2, 2.8, 3.8]} />
        <Surf color={index % 2 ? P.ochre : P.plaster} />
      </mesh>
      <mesh position={[0, 3.05, -0.2]} rotation={[0, 0, 0.08]} castShadow>
        <boxGeometry args={[5.6, 0.22, 4.2]} />
        <Surf color={P.ruin} />
      </mesh>
      <Window position={[0.7, 1.7, 1.94]} lit={lit} />
      <mesh position={[-1.2, 0.9, 1.94]}>
        <boxGeometry args={[0.9, 1.8, 0.08]} />
        <Surf color={P.cobalt} />
      </mesh>
    </group>
  )
}

function ForumShelter({ index, lit }: { index: number; lit: boolean }) {
  return (
    <group>
      {[-1.8, 1.8].flatMap((x) =>
        [-1.2, 1.2].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 1.5, z]} castShadow>
            <cylinderGeometry args={[0.13, 0.18, 3, 7]} />
            <Surf color={P.ruin} />
          </mesh>
        )),
      )}
      <mesh position={[0, 3.05, 0]} rotation={[0, 0, index % 2 ? 0.08 : -0.08]} castShadow>
        <boxGeometry args={[4.5, 0.24, 3.2]} />
        <Surf color={index === 0 ? P.cobalt : P.plaster} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[4.2, 0.7, 2.9]} />
        <Surf color={P.roadEdge} />
      </mesh>
      {lit && <pointLight position={[0, 2.6, 0]} color={P.window} intensity={2.2} distance={8} />}
    </group>
  )
}

function QuayWorkshop({ index, lit }: { index: number; lit: boolean }) {
  const awning = index === 0
  return (
    <group>
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[5.5, 3.6, 4.2]} />
        <Surf color={index % 3 === 2 ? '#dfc99e' : P.plaster} />
      </mesh>
      <FlatRoof width={5.5} depth={4.2} height={3.6} />
      <Window position={[-1.2, 2, 2.14]} lit={lit} />
      <Window position={[0.1, 2, 2.14]} lit={lit} />
      <mesh position={[2, 1.45, 2.14]}>
        <boxGeometry args={[1, 2.7, 0.08]} />
        <Surf color={P.cobalt} />
      </mesh>
      {awning && (
        <mesh position={[0, 2.9, 2.9]} rotation={[0.28, 0, 0]} castShadow>
          <boxGeometry args={[4.4, 0.18, 1.8]} />
          <Surf color={P.violet} />
        </mesh>
      )}
    </group>
  )
}

export function Building({ kind, index, lit }: { kind: BuildingKind; index: number; lit: boolean }) {
  switch (kind) {
    case 'plaster-house':
      return <PlasterHouse index={index} lit={lit} />
    case 'survey-shelter':
      return <SurveyShelter index={index} lit={lit} />
    case 'terrace-shed':
      return <TerraceShed index={index} lit={lit} />
    case 'forum-shelter':
      return <ForumShelter index={index} lit={lit} />
    case 'quay-workshop':
      return <QuayWorkshop index={index} lit={lit} />
  }
}

export function Lamp({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 2.8, 6]} />
        <Surf color={P.ruinDark} />
      </mesh>
      <mesh position={[0, 2.95, 0]}>
        <dodecahedronGeometry args={[0.28, 0]} />
        <Glow color={P.window} on={lit} intensity={1.7} />
      </mesh>
      {lit && <pointLight position={[0, 2.9, 0]} color={P.window} intensity={2.2} distance={9} />}
    </group>
  )
}

export function SmallBoat({ accent = P.cobalt }: { accent?: string }) {
  return (
    <group position={[0, 0.18, 0]}>
      <mesh scale={[2.8, 0.65, 1.15]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={P.plaster} />
      </mesh>
      <mesh position={[0, 0.3, 0]} scale={[2.4, 0.18, 0.8]}>
        <dodecahedronGeometry args={[1, 0]} />
        <Surf color={accent} />
      </mesh>
      <mesh position={[-0.4, 1.2, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 2.1, 5]} />
        <Surf color={P.ruinDark} />
      </mesh>
    </group>
  )
}

function Olive() {
  return (
    <group>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 2, 6]} />
        <Surf color={P.ruinDark} />
      </mesh>
      {[[0, 2.2, 0], [0.7, 1.8, 0.2], [-0.6, 1.75, -0.2]].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} scale={[1.2, 0.75, 1]} castShadow>
          <dodecahedronGeometry args={[0.85, 0]} />
          <Surf color={index ? '#82916b' : P.olive} />
        </mesh>
      ))}
    </group>
  )
}

function SurveyTable() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[2.4, 0.16, 1.5]} />
        <Surf color={P.ruin} />
      </mesh>
      {[-0.9, 0.9].flatMap((x) => [-0.5, 0.5].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 0.45, z]}>
          <boxGeometry args={[0.1, 0.9, 0.1]} />
          <Surf color={P.ruinDark} />
        </mesh>
      )))}
      <mesh position={[0, 1.03, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[1.7, 0.9]} />
        <meshBasicMaterial color={P.cobalt} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function MarketStall() {
  return (
    <group>
      {[-1.2, 1.2].flatMap((x) => [-0.7, 0.7].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 1.3, z]}>
          <cylinderGeometry args={[0.07, 0.09, 2.6, 5]} />
          <Surf color={P.ruinDark} />
        </mesh>
      )))}
      <mesh position={[0, 2.55, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[2.8, 0.14, 1.8]} />
        <Surf color={P.violet} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[2.6, 0.16, 1.2]} />
        <Surf color={P.ochre} />
      </mesh>
    </group>
  )
}

export function Prop({ kind, lit }: { kind: PropKind; lit: boolean }) {
  switch (kind) {
    case 'lamp':
      return <Lamp lit={lit} />
    case 'olive':
      return <Olive />
    case 'survey-table':
      return <SurveyTable />
    case 'market-stall':
      return <MarketStall />
    case 'boat':
      return <SmallBoat />
    case 'buoy':
      return (
        <group>
          <mesh position={[0, 0.45, 0]}>
            <sphereGeometry args={[0.45, 8, 6]} />
            <Surf color={P.cobalt} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 1.2, 5]} />
            <Surf color={P.ruinDark} />
          </mesh>
        </group>
      )
    case 'mosaic':
      return (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 12]} />
          <meshBasicMaterial color={P.cobalt} transparent opacity={0.72} />
        </mesh>
      )
    case 'crate':
    case 'amphora':
    case 'find':
      return (
        <mesh position={[0, kind === 'amphora' ? 0.55 : 0.4, 0]} castShadow>
          {kind === 'amphora' ? <cylinderGeometry args={[0.28, 0.42, 1.1, 7]} /> : <boxGeometry args={[0.8, 0.8, 0.8]} />}
          <Surf color={kind === 'find' ? P.ruin : P.ochre} />
        </mesh>
      )
  }
}
