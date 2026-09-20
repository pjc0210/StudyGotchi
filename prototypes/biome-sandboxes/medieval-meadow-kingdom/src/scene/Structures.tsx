import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  MEADOW_PALETTE as P,
  type DistrictProgress,
  type GeneratedKingdom,
  populationFor,
} from '../layout/biome-layout'
import { authoredDistrictDetails, buildingSlots, districtAnchor } from '../layout/terrain'
import { Surf } from '../render/materials'
import {
  Barn,
  Bridge,
  DistrictAnchor,
  GardenPlot,
  GuildHall,
  Hedge,
  House,
  Landing,
  MarketAnchor,
  MarketStall,
  OrchardTree,
  TimberYard,
  WorkShed,
} from './Props'

export const ruin = { districtId: null as string | null, amount: 0 }

function Knockable({
  districtId,
  index,
  position,
  yaw,
  children,
}: {
  districtId: string
  index: number
  position: [number, number, number]
  yaw: number
  children: React.ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!group.current) return
    const amount = ruin.districtId === districtId && index % 3 !== 1 ? ruin.amount : 0
    group.current.rotation.z = amount * (index % 2 ? -1.15 : 1.15)
    group.current.position.y = position[1] - amount * 0.15
  })
  return (
    <group ref={group} position={position} rotation={[0, yaw, 0]}>
      {children}
    </group>
  )
}

export function Bridges({ layout }: { layout: GeneratedKingdom }) {
  return (
    <group>
      {layout.bridges.map((bridge) => (
        <group
          key={bridge.id}
          position={[bridge.center[0], 0.15, bridge.center[1]]}
          rotation={[0, (bridge.yaw * Math.PI) / 180, 0]}
        >
          <Bridge length={bridge.size[0]} width={bridge.size[1]} />
        </group>
      ))}
    </group>
  )
}

function DistrictGround({ layout }: { layout: GeneratedKingdom }) {
  return (
    <group>
      {layout.districts.map((district) => {
        const shape = new THREE.Shape()
        district.polygon.forEach(([x, z], index) => {
          if (index === 0) shape.moveTo(x, -z)
          else shape.lineTo(x, -z)
        })
        shape.closePath()
        const geometry = new THREE.ShapeGeometry(shape)
        geometry.rotateX(-Math.PI / 2)
        const color = district.id === 'castle-court' ? P.limestoneShade : district.id === 'farm-common' ? '#aeca72' : P.meadowLight
        return (
          <mesh key={district.id} geometry={geometry} position={[0, district.id === 'castle-court' ? 2.24 : 0.13, 0]} receiveShadow>
            <Surf color={color} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

function GrowthProps({
  id,
  details,
  band,
  lit,
}: {
  id: string
  details: ReturnType<typeof authoredDistrictDetails>
  band: number
  lit: boolean
}) {
  const byKind = (kind: string) => details.find((detail) => detail.kind === kind)!
  const At = ({ kind, children }: { kind: string; children: React.ReactNode }) => {
    const detail = byKind(kind)
    return <group position={detail.position} rotation={[0, detail.yaw, 0]}>{children}</group>
  }
  return (
    <group>
      {id === 'forest-hamlet' && band >= 1 && (
        <>
          <At kind="sawyard"><TimberYard /></At>
          <At kind="log-stacks">
            <group>
              {[-1.8, 0, 1.8].map((z, index) => (
                <mesh key={z} position={[0, 0.45 + index * 0.18, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.38, 0.38, 6.2, 8]} />
                  <Surf color={index % 2 ? P.timber : '#8a6245'} />
                </mesh>
              ))}
            </group>
          </At>
        </>
      )}
      {id === 'river-village' && band >= 1 && (
        <>
          <At kind="landing"><Landing /></At>
          <At kind="millrace">
            <mesh position={[0, 0.05, 0]} receiveShadow>
              <boxGeometry args={[9, 0.12, 2.4]} />
              <Surf color={P.water} />
            </mesh>
          </At>
        </>
      )}
      {id === 'river-village' && band >= 2 && <At kind="kitchen-gardens"><GardenPlot /></At>}
      {id === 'bridge-market' && band >= 1 && (
        <>
          <At kind="market-stalls"><MarketAnchor lit={lit} /></At>
          <At kind="guild-hall"><GuildHall lit={lit} /></At>
        </>
      )}
      {id === 'farm-common' && band >= 1 && (
        <At kind="l-barn">
          <Barn lit={lit} />
          <group position={[4.2, 0, -3.6]} rotation={[0, Math.PI / 2, 0]} scale={[0.78, 0.78, 0.78]}>
            <Barn lit={lit} />
          </group>
        </At>
      )}
      {id === 'farm-common' && band >= 2 && (
        <>
          <At kind="orchard">
            {[-4, 0, 4].flatMap((x) => [-3, 1.5].map((z, row) => (
              <group key={`${x}:${z}`} position={[x, 0, z]}>
                <OrchardTree scale={0.85 + row * 0.08} />
              </group>
            )))}
          </At>
          <At kind="crop-strips">
            {[-3, 0, 3].map((z, index) => (
              <mesh key={z} position={[0, 0.08, z]} receiveShadow>
                <boxGeometry args={[12 - index, 0.15, 1.8]} />
                <Surf color={index % 2 ? P.wheat : '#879f54'} />
              </mesh>
            ))}
          </At>
          <At kind="hedges">
            <Hedge length={14} />
            <group position={[-7, 0, 4]} rotation={[0, Math.PI / 2, 0]}><Hedge length={8} /></group>
          </At>
        </>
      )}
    </group>
  )
}

export function Districts({
  layout,
  progress,
  night,
  darkDistrict,
}: {
  layout: GeneratedKingdom
  progress: DistrictProgress
  night: boolean
  darkDistrict: string | null
}) {
  const slots = useMemo(
    () => new Map(layout.districts.map((district) => [district.id, buildingSlots(layout, district)])),
    [layout],
  )
  return (
    <group>
      <DistrictGround layout={layout} />
      {layout.districts.map((district) => {
        const population = populationFor(district, progress[district.id] ?? 0)
        const anchor = districtAnchor(layout, district)
        const details = authoredDistrictDetails(district)
        const lit = night && darkDistrict !== district.id
        return (
          <group key={district.id}>
            <group position={anchor} rotation={[0, district.yaw, 0]}>
              <DistrictAnchor id={district.id} lit={lit} />
            </group>
            {(slots.get(district.id) ?? []).slice(0, population.buildings).map((slot) => (
              <Knockable
                key={slot.index}
                districtId={district.id}
                index={slot.index}
                position={slot.position}
                yaw={slot.yaw}
              >
                {district.id === 'bridge-market'
                  ? <MarketStall index={slot.index} lit={lit} />
                  : district.id === 'forest-hamlet' && slot.index % 3 === 0
                    ? <WorkShed index={slot.index} />
                    : <House variant={slot.variant} lit={lit} />}
              </Knockable>
            ))}
            <GrowthProps id={district.id} details={details} band={population.band} lit={lit} />
          </group>
        )
      })}
      <Bridges layout={layout} />
    </group>
  )
}
