/**
 * A world family is the per-biome kit: building components keyed by the layout's `building`
 * string, anchor composites keyed by `anchorKind`, and prop components keyed by prop kind. Every
 * piece is primitive geometry on the shared `Surf` toon material, two or three flat colours from
 * the layout palette plus one accent. Skylines and landmarks are generic (see Skyline.tsx and
 * WorldLandmark.tsx). Anything a family does not define falls back to the generic kit here.
 */
import type { ReactElement } from 'react'
import type { AnchorKind, BiomeLayout, DistrictDef, WorldColours, WorldFamily } from '../layout/biome-layout'
import type { Pt } from '../layout/geometry'
import { Glow, Surf } from '../render/materials'
import { academyFamily } from './families/academy'
import { candyFamily } from './families/candy'
import { industryFamily } from './families/industry'
import { utopiaFamily } from './families/utopia'

export interface BuildingProps {
  /** Layout `building` string, e.g. 'dorm-block'. */
  kind: string
  /** Slot index in the district (fixed order); use it for deterministic variants. */
  index: number
  lit: boolean
  /** Target height in metres from the layout. */
  height: number
  c: WorldColours
  accent: string
}

export interface AnchorProps {
  kind: AnchorKind
  c: WorldColours
  accent: string
  /** 25 %+: the warm accent object is present / coloured. */
  accentOn: boolean
  /** Night and not ruined. */
  lit: boolean
  night: boolean
  /** Population band 0–4 (extras at 4). */
  band: number
  /** Unit direction from the anchor toward the nearest water (docks point this way). */
  toWater: Pt
  layout: BiomeLayout
  district: DistrictDef
}

export interface PropProps {
  kind: string
  c: WorldColours
  accent: string
  lit: boolean
  scale: number
  /** Deterministic variant seed. */
  index: number
  /** Bridges and long props: deck length. */
  length?: number
}

export type BuildingComponent = (p: BuildingProps) => ReactElement | null
export type AnchorComponent = (p: AnchorProps) => ReactElement | null
export type PropComponent = (p: PropProps) => ReactElement | null

/** What a family file exports: component maps keyed by the layout strings. */
export interface FamilyKit {
  buildings: Record<string, BuildingComponent>
  anchors: Partial<Record<AnchorKind, AnchorComponent>>
  props: Record<string, PropComponent>
}

export interface Family {
  building: (kind: string) => BuildingComponent
  anchor: (kind: AnchorKind) => AnchorComponent
  prop: (kind: string) => PropComponent
}

/* ---------- generic fallbacks ---------- */

export function GenericBuilding({ index, lit, height, c, accent }: BuildingProps) {
  const w = 5 + (index % 3) * 0.6
  const d = 4.4 + ((index + 1) % 2) * 0.8
  const wall = index % 3 === 0 ? c.structureA : index % 3 === 1 ? c.structureB : c.structureC
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[w, height, d]} />
        <Surf color={wall} />
      </mesh>
      <mesh position={[0, height + 0.15, 0]}>
        <boxGeometry args={[w + 0.3, 0.3, d + 0.3]} />
        <Surf color={index % 4 === 0 ? accent : c.groundAlt} />
      </mesh>
      {[-w * 0.25, w * 0.25].map((x) => (
        <mesh key={x} position={[x, height * 0.45, d / 2 + 0.03]}>
          <boxGeometry args={[0.7, 0.9, 0.05]} />
          <Glow color={c.window} on={lit} intensity={1.2} />
        </mesh>
      ))}
    </group>
  )
}

export function GenericAnchor({ c, accent, accentOn }: AnchorProps) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <cylinderGeometry args={[3.2, 3.4, 0.6, 12]} />
        <Surf color={c.paving} />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.24, 6, 6]} />
        <Surf color={c.steel} />
      </mesh>
      <mesh position={[0.7, 6.1, 0]}>
        <boxGeometry args={[1.4, 0.9, 0.06]} />
        <Surf color={accentOn ? accent : c.structureA} />
      </mesh>
    </group>
  )
}

export function GenericProp({ kind, c, accent, lit }: PropProps) {
  switch (kind) {
    case 'lamp':
      return (
        <group>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 3.2, 5]} />
            <Surf color={c.ink} />
          </mesh>
          <mesh position={[0, 3.35, 0]}>
            <octahedronGeometry args={[0.32, 0]} />
            <Glow color={c.lamp} on={lit} intensity={1.6} />
          </mesh>
        </group>
      )
    case 'bench':
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.8, 0.1, 0.5]} />
            <Surf color={c.structureB} />
          </mesh>
          <mesh position={[0, 0.8, -0.22]}>
            <boxGeometry args={[1.8, 0.4, 0.08]} />
            <Surf color={c.structureB} />
          </mesh>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} position={[x, 0.22, 0]}>
              <boxGeometry args={[0.1, 0.44, 0.46]} />
              <Surf color={c.ink} />
            </mesh>
          ))}
        </group>
      )
    case 'tree':
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.24, 2.4, 6]} />
            <Surf color={c.structureB} />
          </mesh>
          <mesh position={[0, 3.4, 0]} castShadow>
            <dodecahedronGeometry args={[2.0, 1]} />
            <Surf color={c.tree} />
          </mesh>
        </group>
      )
    case 'pennant':
      return (
        <group>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 7, 5]} />
            <Surf color={c.structureA} />
          </mesh>
          <mesh position={[0.7, 6.5, 0]}>
            <boxGeometry args={[1.4, 0.7, 0.04]} />
            <Surf color={accent} />
          </mesh>
        </group>
      )
    case 'crate':
      return (
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <Surf color={c.structureB} />
        </mesh>
      )
    case 'string-lights':
      return (
        <group>
          {[-2.2, 2.2].map((x) => (
            <mesh key={x} position={[x, 1.5, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 3, 4]} />
              <Surf color={c.ink} />
            </mesh>
          ))}
          {Array.from({ length: 9 }, (_, i) => {
            const t = i / 8
            return (
              <mesh key={i} position={[-2.2 + 4.4 * t, 2.9 - Math.sin(t * Math.PI) * 0.4, 0]}>
                <sphereGeometry args={[0.1, 6, 5]} />
                <Glow color={i % 2 ? accent : c.window} on={lit} intensity={1.4} />
              </mesh>
            )
          })}
        </group>
      )
    default:
      return (
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <Surf color={c.structureC} />
        </mesh>
      )
  }
}

const EMPTY_KIT: FamilyKit = { buildings: {}, anchors: {}, props: {} }

/** A family may implement only some kinds; the generic kit handles the rest. */
export function withFallback(kit: Partial<FamilyKit>): Family {
  const k: FamilyKit = { ...EMPTY_KIT, ...kit }
  return {
    building: (kind) => k.buildings[kind] ?? GenericBuilding,
    anchor: (kind) => k.anchors[kind] ?? GenericAnchor,
    prop: (kind) => k.props[kind] ?? GenericProp,
  }
}

const REGISTRY: Record<WorldFamily, Family> = {
  academy: withFallback(academyFamily),
  industry: withFallback(industryFamily),
  utopia: withFallback(utopiaFamily),
  candy: withFallback(candyFamily),
  generic: withFallback({}),
}

export function familyKit(family: WorldFamily): Family {
  return REGISTRY[family]
}
