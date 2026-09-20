import { useEffect } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { statePresentation } from '@/lib/state'
import { placeStateAtProgress, type GrowthPlace } from '@/lib/world/growth-studio'
import { landmarkStage, type GeneratedKingdom } from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import type { LabState } from '../state'

const LANDMARK_STATUS: Record<ReturnType<typeof landmarkStage>, string> = {
  stake: 'Stake',
  s1: 'Rising',
  s2: 'Standing',
  s3: 'Crowned',
}

const PICK_RADIUS = 0.16

function placeForDistrict(layout: GeneratedKingdom, districtId: string): GrowthPlace {
  const ordered = [...layout.districts].sort((a, b) => a.band - b.band)
  const index = Math.max(0, ordered.findIndex((district) => district.id === districtId))
  const district = ordered[index] ?? layout.districts[0]
  return {
    cluster: district.anchor,
    conceptCount: 1,
    districtId: district.id,
    districtName: district.name,
    index,
    total: ordered.length,
  }
}

function HoverCard({
  name,
  status,
  statusColor,
  detail,
}: {
  name: string
  status: string
  statusColor: string
  detail?: string
}) {
  return (
    <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 10]}>
      <div className="world-marker">
        <div className="card">
          <strong>{name}</strong>
          <div className="meta">
            <span style={{ color: statusColor }}>{status}</span>
            {detail ? <span>· {detail}</span> : null}
          </div>
        </div>
        <span className="stem" />
        <span className="dot" />
      </div>
    </Html>
  )
}

export function HoverTabs({
  layout,
  state,
  hoveredId,
  onHover,
}: {
  layout: GeneratedKingdom
  state: LabState
  hoveredId: string | null
  onHover: (id: string | null) => void
}) {
  const gl = useThree((three) => three.gl)
  const camera = useThree((three) => three.camera)
  const size = useThree((three) => three.size)
  const fraction =
    Object.values(state.progress).reduce((sum, value) => sum + value, 0) / Math.max(1, layout.districts.length)
  const castle = sampleTerrain(layout, ...layout.landmark.position)
  const castleStage = landmarkStage(fraction)
  const castleLook = statePresentation('strong', 'paper')
  const hoveredDistrict = layout.districts.find((district) => district.id === hoveredId)
  const hoveredHeight = hoveredDistrict ? sampleTerrain(layout, ...hoveredDistrict.centre).height : 0

  useEffect(() => {
    const element = gl.domElement
    const projected = new THREE.Vector3()
    const targets = [
      ...layout.districts.map((district) => {
        const height = sampleTerrain(layout, ...district.centre).height
        return {
          id: district.id,
          point: new THREE.Vector3(
            district.centre[0],
            (district.id === 'castle-court' ? 2.2 : height) + 4,
            district.centre[1],
          ),
        }
      }),
      {
        id: 'castle-landmark',
        point: new THREE.Vector3(layout.landmark.position[0], castle.height + 8, layout.landmark.position[1]),
      },
    ]

    const pick = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1
      let best: { id: string; distance: number } | null = null
      for (const target of targets) {
        projected.copy(target.point).project(camera)
        if (projected.z < -1 || projected.z > 1) continue
        const distance = Math.hypot(projected.x - nx, projected.y - ny)
        if (distance > PICK_RADIUS) continue
        if (!best || distance < best.distance) best = { id: target.id, distance }
      }
      onHover(best?.id ?? null)
      element.style.cursor = best ? 'pointer' : ''
    }

    const leave = () => {
      onHover(null)
      element.style.cursor = ''
    }

    element.addEventListener('pointermove', pick)
    element.addEventListener('pointerleave', leave)
    return () => {
      element.removeEventListener('pointermove', pick)
      element.removeEventListener('pointerleave', leave)
    }
  }, [camera, castle.height, gl.domElement, layout, onHover, size.height, size.width])

  return (
    <>
      {hoveredDistrict ? (
        <group
          position={[
            hoveredDistrict.centre[0],
            hoveredDistrict.id === 'castle-court' ? 2.2 + 12 : hoveredHeight + 12,
            hoveredDistrict.centre[1],
          ]}
        >
          <HoverCard
            name={hoveredDistrict.name}
            status={statePresentation(placeStateAtProgress(placeForDistrict(layout, hoveredDistrict.id), state.progress[hoveredDistrict.id] ?? fraction).semantic, 'paper').label}
            statusColor={statePresentation(placeStateAtProgress(placeForDistrict(layout, hoveredDistrict.id), state.progress[hoveredDistrict.id] ?? fraction).semantic, 'paper').color}
            detail={`${Math.round((state.progress[hoveredDistrict.id] ?? fraction) * 100)}%`}
          />
        </group>
      ) : null}
      {hoveredId === 'castle-landmark' ? (
        <group position={[layout.landmark.position[0], castle.height + 18, layout.landmark.position[1]]}>
          <HoverCard
            name="Crown Headland Castle"
            status={LANDMARK_STATUS[castleStage]}
            statusColor={castleLook.color}
            detail={layout.landmark.kind}
          />
        </group>
      ) : null}
    </>
  )
}
