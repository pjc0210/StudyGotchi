import { useEffect, useRef } from 'react'
import { CameraControls, PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { type BiomeLayout, districtChord } from '../layout/biome-layout'
import { CAMERA_LIMITS, STATIONS, type CameraOverride, type Pose, type StationId, divePose, easeInOutCubic, poseFor } from './stations'

interface CameraRigProps {
  layout: BiomeLayout
  station: StationId
  override: CameraOverride
  focusDistrict: string | null
  diving: boolean
  onDiveEnd: () => void
}

function stationSubject(layout: BiomeLayout, station: StationId, focusDistrict: string | null) {
  if (station === 'landmark') {
    return { center: [layout.landmark.center[0], layout.groundHeight, layout.landmark.center[1]] as [number, number, number], chord: 38 }
  }
  const district = layout.districts.find((d) => d.id === focusDistrict)
  if (station === 'district' && district) {
    return { center: [district.center[0], layout.groundHeight, district.center[1]] as [number, number, number], chord: districtChord(district) }
  }
  if (station === 'resident') {
    const home = district ?? layout.districts[0]
    return { center: [home.center[0] + 7, layout.groundHeight + 0.8, home.center[1] + 4] as [number, number, number], chord: 4 }
  }
  return { center: [0, layout.groundHeight, 0] as [number, number, number], chord: layout.frameRadius * 2 }
}

export function CameraRig({ layout, station, override, focusDistrict, diving, onDiveEnd }: CameraRigProps) {
  const controls = useRef<CameraControls>(null)
  const camera = useThree((state) => state.camera)
  const aspect = useThree((state) => state.size.width / state.size.height)
  const hasPose = useRef(false)
  const dive = useRef<{ from: Pose; to: Pose; t: number } | null>(null)

  useEffect(() => {
    const subject = stationSubject(layout, station, focusDistrict)
    if (diving) {
      const to = poseFor(STATIONS.arrival, { ...override, pitchDeg: 35, azimuthDeg: 12, dolly: 1 }, subject, aspect)
      dive.current = { from: divePose(to), to, t: 0 }
      return
    }
    dive.current = null
    const pose = poseFor(STATIONS[station], override, subject, aspect)
    void controls.current?.setLookAt(...pose.position, ...pose.target, hasPose.current)
    hasPose.current = true
  }, [aspect, camera, diving, focusDistrict, layout, override, station])

  useFrame((_, delta) => {
    const active = dive.current
    const control = controls.current
    if (!active || !control) return
    active.t = Math.min(1, active.t + delta / 1.6)
    const k = easeInOutCubic(active.t)
    const position = new THREE.Vector3(...active.from.position).lerp(new THREE.Vector3(...active.to.position), k)
    const target = new THREE.Vector3(...active.from.target).lerp(new THREE.Vector3(...active.to.target), k)
    void control.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false)
    if (active.t === 1) {
      dive.current = null
      hasPose.current = true
      onDiveEnd()
    }
  })

  return (
    <>
      <PerspectiveCamera makeDefault fov={override.fov} near={0.5} far={1200} position={[80, 72, 130]} />
      <CameraControls
        ref={controls}
        makeDefault
        minDistance={5}
        maxDistance={520}
        minPolarAngle={THREE.MathUtils.degToRad(90 - CAMERA_LIMITS.pitchMax)}
        maxPolarAngle={THREE.MathUtils.degToRad(90 - CAMERA_LIMITS.pitchMin)}
        minAzimuthAngle={THREE.MathUtils.degToRad(-CAMERA_LIMITS.yaw)}
        maxAzimuthAngle={THREE.MathUtils.degToRad(CAMERA_LIMITS.yaw)}
        truckSpeed={0}
        dollySpeed={0.45}
        smoothTime={0.5}
        draggingSmoothTime={0.12}
      />
    </>
  )
}
