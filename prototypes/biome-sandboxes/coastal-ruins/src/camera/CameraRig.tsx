import { useRef } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { type BiomeLayout, seededDistrictPlan } from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import { residentPositions } from '../scene/Residents'
import { STATIONS, type CameraOverride, type Pose, type StationId, divePose, easeInOutCubic, poseFor } from './stations'

interface CameraRigProps {
  layout: BiomeLayout
  seed: number
  station: StationId
  override: CameraOverride
  focusDistrict: string | null
  diving: boolean
  markerMode: boolean
  onDiveEnd: () => void
}

const DIVE_SECONDS = 1.6

export function stationSubject(layout: BiomeLayout, seed: number, station: StationId, focusDistrict: string | null, markerMode: boolean) {
  if (markerMode) return { center: [0, 5, 0] as [number, number, number], chord: 40 }
  const scale = layout.renderScale
  if (station === 'landmark') {
    return {
      center: [layout.headland.center[0] * scale, layout.headland.height * scale, layout.headland.center[1] * scale] as [number, number, number],
      chord: 30 * scale,
    }
  }
  if (station === 'district' && focusDistrict) {
    const district = layout.districts.find((candidate) => candidate.id === focusDistrict)
    if (district) {
      const [x, z] = seededDistrictPlan(layout, seed)[district.id].center
      return {
        center: [x * scale, Math.max(layout.seaLevel, sampleTerrain(layout, x, z).height) * scale, z * scale] as [number, number, number],
        chord: district.cameraChord * scale,
      }
    }
  }
  if (station === 'resident' && residentPositions[0]) {
    const position = residentPositions[0]
    return { center: [position.x * scale, position.y * scale, position.z * scale] as [number, number, number], chord: 4 * scale }
  }
  return { center: [8 * scale, layout.groundHeight * scale, 23 * scale] as [number, number, number], chord: layout.frameRadius * 2 * scale }
}

function applyPose(camera: THREE.PerspectiveCamera, pose: Pose) {
  camera.position.set(...pose.position)
  camera.lookAt(...pose.target)
  camera.updateMatrixWorld()
}

export function CameraRig({ layout, seed, station, override, focusDistrict, diving, markerMode, onDiveEnd }: CameraRigProps) {
  const camera = useRef<THREE.PerspectiveCamera>(null)
  const aspect = useThree((state) => state.size.width / state.size.height)
  const dive = useRef<{ from: Pose; to: Pose; t: number } | null>(null)

  useFrame((_, delta) => {
    const activeCamera = camera.current
    if (!activeCamera) return
    const subject = stationSubject(layout, seed, station, focusDistrict, markerMode)
    const stationDef = markerMode ? { ...STATIONS.overview, distance: 72, fitWidth: undefined } : STATIONS[station]
    const restingPose = poseFor(stationDef, override, subject, aspect)
    if (diving && !dive.current) {
      dive.current = { from: divePose(restingPose), to: restingPose, t: 0 }
      applyPose(activeCamera, dive.current.from)
    }
    if (dive.current) {
      dive.current.t = Math.min(1, dive.current.t + delta / DIVE_SECONDS)
      const progress = easeInOutCubic(dive.current.t)
      const position = new THREE.Vector3(...dive.current.from.position).lerp(new THREE.Vector3(...dive.current.to.position), progress)
      const target = new THREE.Vector3(...dive.current.from.target).lerp(new THREE.Vector3(...dive.current.to.target), progress)
      activeCamera.position.copy(position)
      activeCamera.lookAt(target)
      if (dive.current.t >= 1) {
        dive.current = null
        onDiveEnd()
      }
      return
    }
    applyPose(activeCamera, restingPose)
  })

  return <PerspectiveCamera ref={camera} makeDefault fov={override.fov} near={0.25} far={1200} position={[0, 60, 80]} />
}
