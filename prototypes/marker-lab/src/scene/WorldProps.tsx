import type { MarkerDefinition, MarkerProp, PropCategory } from '../markers'
import { visibleProps, type PropCount } from '../state'
import { Glow, Surf } from '../render/materials'
import { IceProps } from './IceProps'
import { BOUQUET_PLACEMENTS, outwardRotation, type BouquetPlacement } from './bouquetGeometry'

function color(prop: MarkerProp, index = 0): string {
  return prop.colors[index] ?? prop.colors[0]
}

function Peak({ height, primary, cap }: { height: number; primary: string; cap?: string }) {
  return (
    <group>
      <mesh position={[0, height * 0.48, 0]} scale={[1, 1, 0.82]} castShadow>
        <coneGeometry args={[height * 0.28, height, 7]} />
        <Surf color={primary} />
      </mesh>
      {cap && (
        <mesh position={[0, height * 0.78, -0.4]} scale={[0.72, 1, 0.7]} castShadow>
          <coneGeometry args={[height * 0.16, height * 0.38, 6]} />
          <Surf color={cap} />
        </mesh>
      )}
    </group>
  )
}

function Tree({ height, canopy, trunk, round }: { height: number; canopy: string; trunk?: string; round?: boolean }) {
  return (
    <group>
      <mesh position={[0, height * 0.18, 0]} castShadow>
        <cylinderGeometry args={[height * 0.04, height * 0.06, height * 0.36, 6]} />
        <Surf color={trunk ?? '#4a3c36'} />
      </mesh>
      {round ? (
        <mesh position={[0, height * 0.62, 0]} scale={[1, 0.86, 1]} castShadow>
          <dodecahedronGeometry args={[height * 0.32, 0]} />
          <Surf color={canopy} />
        </mesh>
      ) : (
        [0.42, 0.64, 0.82].map((fraction, index) => (
          <mesh key={fraction} position={[0, height * fraction, 0]} castShadow>
            <coneGeometry args={[height * (0.22 - index * 0.04), height * 0.34, 7]} />
            <Surf color={canopy} />
          </mesh>
        ))
      )}
    </group>
  )
}

function Tower({ height, wall, band, cap, night, glow }: { height: number; wall: string; band?: string; cap?: string; night: boolean; glow?: string }) {
  return (
    <group>
      <mesh position={[0, height * 0.42, 0]} castShadow>
        <cylinderGeometry args={[height * 0.08, height * 0.12, height * 0.84, 8]} />
        <Surf color={wall} />
      </mesh>
      {band &&
        [0.22, 0.42, 0.62].map((fraction) => (
          <mesh key={fraction} position={[0, height * fraction, 0]} castShadow>
            <cylinderGeometry args={[height * 0.11, height * 0.12, height * 0.06, 8]} />
            <Surf color={band} />
          </mesh>
        ))}
      <mesh position={[0, height * 0.92, 0]} castShadow>
        <coneGeometry args={[height * 0.14, height * 0.18, 8]} />
        <Glow color={glow ?? cap ?? wall} on={night && Boolean(glow)} />
      </mesh>
    </group>
  )
}

function Building({ height, wall, roof, night, glow }: { height: number; wall: string; roof?: string; night: boolean; glow?: string }) {
  const width = height * 0.42
  return (
    <group>
      <mesh position={[0, height * 0.28, 0]} castShadow>
        <boxGeometry args={[width, height * 0.56, width * 0.78]} />
        <Surf color={wall} />
      </mesh>
      <mesh position={[0, height * 0.68, 0]} rotation={[0, 0, 0.02]} castShadow>
        <coneGeometry args={[width * 0.72, height * 0.32, 4]} />
        <Surf color={roof ?? wall} />
      </mesh>
      <mesh position={[0, height * 0.32, width * 0.4]}>
        <boxGeometry args={[width * 0.16, height * 0.14, 0.12]} />
        <Glow color={glow ?? '#ffe9a8'} on={night} />
      </mesh>
    </group>
  )
}

function Ring({ height, color, tilt = 0.7 }: { height: number; color: string; tilt?: number }) {
  return (
    <group>
      <mesh position={[0, height * 0.28, 0]} castShadow>
        <cylinderGeometry args={[height * 0.05, height * 0.07, height * 0.56, 8]} />
        <Surf color={color} />
      </mesh>
      <mesh position={[0, height * 0.72, 0]} rotation={[tilt, 0.2, 0.15]} castShadow>
        <torusGeometry args={[height * 0.28, height * 0.035, 8, 24]} />
        <Surf color={color} />
      </mesh>
    </group>
  )
}

function Crane({ height, frame, cab }: { height: number; frame: string; cab?: string }) {
  return (
    <group>
      <mesh position={[0, height * 0.42, 0]} castShadow>
        <boxGeometry args={[height * 0.08, height * 0.84, height * 0.08]} />
        <Surf color={frame} />
      </mesh>
      <mesh position={[height * 0.22, height * 0.82, 0]} castShadow>
        <boxGeometry args={[height * 0.52, height * 0.08, height * 0.08]} />
        <Surf color={frame} />
      </mesh>
      <mesh position={[height * 0.28, height * 0.7, 0]} castShadow>
        <boxGeometry args={[height * 0.16, height * 0.14, height * 0.14]} />
        <Surf color={cab ?? frame} />
      </mesh>
    </group>
  )
}

function Ship({ height, hull, sail, accent }: { height: number; hull: string; sail?: string; accent?: string }) {
  return (
    <group>
      <mesh position={[0, height * 0.12, 0]} scale={[1.4, 0.45, 0.55]} castShadow>
        <boxGeometry args={[height * 0.42, height * 0.22, height * 0.22]} />
        <Surf color={hull} />
      </mesh>
      <mesh position={[0, height * 0.52, 0]} castShadow>
        <cylinderGeometry args={[height * 0.02, height * 0.03, height * 0.72, 6]} />
        <Surf color={hull} />
      </mesh>
      <mesh position={[height * 0.12, height * 0.48, 0]} castShadow>
        <boxGeometry args={[height * 0.28, height * 0.42, 0.08]} />
        <Surf color={sail ?? '#f4e9d2'} />
      </mesh>
      <mesh position={[-height * 0.08, height * 0.86, 0]} castShadow>
        <boxGeometry args={[height * 0.12, height * 0.08, 0.06]} />
        <Surf color={accent ?? sail ?? hull} />
      </mesh>
    </group>
  )
}

function Mesa({ height, rock, cap }: { height: number; rock: string; cap?: string }) {
  return (
    <group>
      <mesh position={[0, height * 0.38, 0]} castShadow>
        <cylinderGeometry args={[height * 0.22, height * 0.3, height * 0.76, 6]} />
        <Surf color={rock} />
      </mesh>
      <mesh position={[0, height * 0.8, 0]} castShadow>
        <cylinderGeometry args={[height * 0.24, height * 0.24, height * 0.08, 6]} />
        <Surf color={cap ?? rock} />
      </mesh>
    </group>
  )
}

function Volcano({ height, rock, glow, night }: { height: number; rock: string; glow?: string; night: boolean }) {
  return (
    <group>
      <mesh position={[0, height * 0.42, 0]} castShadow>
        <coneGeometry args={[height * 0.32, height * 0.84, 7]} />
        <Surf color={rock} />
      </mesh>
      <mesh position={[0, height * 0.78, 0]}>
        <cylinderGeometry args={[height * 0.1, height * 0.16, height * 0.12, 8]} />
        <Glow color={glow ?? '#ff7a3a'} on={night} intensity={2} />
      </mesh>
    </group>
  )
}

function Pyramid({ height, sand, step }: { height: number; sand: string; step?: string }) {
  return (
    <group>
      {[0.18, 0.4, 0.6, 0.76].map((fraction, index) => (
        <mesh key={fraction} position={[0, height * fraction, 0]} castShadow>
          <boxGeometry args={[height * (0.62 - index * 0.12), height * 0.18, height * (0.62 - index * 0.12)]} />
          <Surf color={index % 2 === 0 ? sand : (step ?? sand)} />
        </mesh>
      ))}
    </group>
  )
}

function Spire({ height, wall, band }: { height: number; wall: string; band?: string }) {
  return (
    <group>
      <mesh position={[0, height * 0.48, 0]} castShadow>
        <coneGeometry args={[height * 0.12, height, 8]} />
        <Surf color={wall} />
      </mesh>
      {band &&
        [0.28, 0.48, 0.68].map((fraction) => (
          <mesh key={fraction} position={[0, height * fraction, 0]} castShadow>
            <cylinderGeometry args={[height * (0.1 - fraction * 0.04), height * (0.11 - fraction * 0.04), height * 0.05, 8]} />
            <Surf color={band} />
          </mesh>
        ))}
    </group>
  )
}

function renderCategory(prop: MarkerProp, night: boolean) {
  const height = prop.height
  const primary = color(prop, 0)
  const secondary = color(prop, 1)
  const tertiary = color(prop, 2)
  const category: PropCategory = prop.category

  switch (category) {
    case 'mountain':
    case 'brush-peak':
    case 'alpine-peak':
      return <Peak height={height} primary={primary} cap={secondary} />
    case 'tree':
    case 'waterfall-tree':
      return <Tree height={height} canopy={primary} trunk={secondary} />
    case 'round-tree':
    case 'fractal-tree':
      return <Tree height={height} canopy={primary} trunk={secondary} round />
    case 'tower':
    case 'spiral-tower':
      return <Tower height={height} wall={primary} band={secondary} cap={tertiary} night={night} glow={prop.emissive} />
    case 'building':
      return <Building height={height} wall={primary} roof={secondary} night={night} glow={prop.emissive} />
    case 'ring':
      return <Ring height={height} color={primary} />
    case 'crane':
      return <Crane height={height} frame={primary} cab={secondary} />
    case 'ship':
      return <Ship height={height} hull={primary} sail={secondary} accent={tertiary} />
    case 'mesa':
      return <Mesa height={height} rock={primary} cap={secondary} />
    case 'volcano':
      return <Volcano height={height} rock={primary} glow={prop.emissive ?? secondary} night={night} />
    case 'pyramid':
      return <Pyramid height={height} sand={primary} step={secondary} />
    case 'spire':
      return <Spire height={height} wall={primary} band={secondary} />
  }
}

function GenericProp({ prop, placement, night }: { prop: MarkerProp; placement: BouquetPlacement; night: boolean }) {
  return (
    <group position={placement.position} rotation={outwardRotation(placement)} scale={placement.height / prop.height}>
      {renderCategory(prop, night)}
    </group>
  )
}

export function WorldProps({
  marker,
  propCount,
  night,
}: {
  marker: MarkerDefinition
  propCount: PropCount
  night: boolean
}) {
  if (marker.id === 'ice-town') return <IceProps propCount={propCount} night={night} />
  return (
    <group>
      {visibleProps(marker, propCount).map((prop, index) => (
        <GenericProp key={prop.id} prop={prop} placement={BOUQUET_PLACEMENTS[index]} night={night} />
      ))}
    </group>
  )
}
