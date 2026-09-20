import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { GeneratedKingdom } from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import { residentPositions } from '../scene/Residents'
import {
  CAMERA_LIMITS,
  STATIONS,
  type CameraOverride,
  type Pose,
  type StationId,
  divePose,
  easeInOutCubic,
  poseFor,
} from './stations'

interface CameraRigProps {
  layout: GeneratedKingdom
  station: StationId
  override: CameraOverride
  focusDistrict: string | null
  diving: boolean
  onDiveEnd: () => void
}

const DIVE_SECONDS = 1.6
const HEADING_IDLE = 1.6
const HEADING_DAMP = 1.15

/** What the station looks at: the district shape (chord as seen from the azimuth), a resident, or the land. */
export function stationSubject(layout: GeneratedKingdom, station: StationId, _override: CameraOverride, focusDistrict: string | null) {
  if (station === 'district' && focusDistrict) {
    const district = layout.districts.find((c) => c.id === focusDistrict)
    if (district) {
      const [x, z] = district.centre
      const y = sampleTerrain(layout, x, z).height
      return { center: [x, y, z] as [number, number, number], chord: district.stationChord }
    }
  }
  if (station === 'resident' && residentPositions[0]) {
    const p = residentPositions[0]
    return { center: [p.x, p.y, p.z] as [number, number, number], chord: 4 }
  }
  // Frame the mainland with the range behind it: centre sits a little back of the origin.
  return { center: [0, layout.groundHeight, 0] as [number, number, number], chord: layout.frameSize[0] }
}

export function CameraRig({ layout, station, override, focusDistrict, diving, onDiveEnd }: CameraRigProps) {
  const controls = useRef<CameraControls>(null)
  const aspect = useThree((s) => s.size.width / s.size.height)
  // drei rebuilds CameraControls when the default camera changes; re-apply the pose then.
  const camera = useThree((s) => s.camera)
  const dive = useRef<{ from: Pose; to: Pose; t: number } | null>(null)
  const hasPose = useRef(false)
  const userTookOver = useRef(false)
  const dragging = useRef(false)
  const idle = useRef(0)
  const lastStation = useRef(station)

  const subject = () => stationSubject(layout, station, override, focusDistrict)

  useEffect(() => {
    if (diving) {
      userTookOver.current = false
      idle.current = 0
      const to = poseFor(
        STATIONS.arrival,
        { ...override, pitchDeg: STATIONS.arrival.pitchDeg, azimuthDeg: STATIONS.arrival.azimuthDeg, dolly: 1 },
        subject(),
        aspect,
      )
      dive.current = { from: divePose(to), to, t: 0 }
      return
    }
    dive.current = null
    if (userTookOver.current && lastStation.current === station) return
    lastStation.current = station
    const pose = poseFor(STATIONS[station], override, subject(), aspect)
    void controls.current?.setLookAt(...pose.position, ...pose.target, hasPose.current)
    hasPose.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect, camera, diving, focusDistrict, override, station, layout])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const halfX = layout.worldSize[0] * 0.38
    const box = new THREE.Box3(new THREE.Vector3(-halfX, -2, -60), new THREE.Vector3(halfX, 40, 100))
    c.setBoundary(box)
    const mark = () => {
      userTookOver.current = true
      dragging.current = true
      idle.current = 0
    }
    const rest = () => {
      dragging.current = false
      idle.current = 0
    }
    c.addEventListener('controlstart', mark)
    c.addEventListener('controlend', rest)
    return () => {
      c.removeEventListener('controlstart', mark)
      c.removeEventListener('controlend', rest)
    }
  }, [camera, layout.worldSize])

  useFrame((_, delta) => {
    const c = controls.current
    if (!c) return
    if (dive.current) {
      dive.current.t = Math.min(1, dive.current.t + delta / DIVE_SECONDS)
      const k = easeInOutCubic(dive.current.t)
      const { from, to } = dive.current
      const p = new THREE.Vector3(...from.position).lerp(new THREE.Vector3(...to.position), k)
      const t = new THREE.Vector3(...from.target).lerp(new THREE.Vector3(...to.target), k)
      void c.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, false)
      if (dive.current.t >= 1) {
        dive.current = null
        hasPose.current = true
        onDiveEnd()
      }
      return
    }
    if (station === 'resident' && residentPositions[0]) {
      const pose = poseFor(STATIONS.resident, override, subject(), aspect)
      void c.setLookAt(...pose.position, ...pose.target, true)
      return
    }
    if (dragging.current) {
      idle.current = 0
      return
    }
    idle.current += delta
    if (idle.current < HEADING_IDLE) return
    const preferred = THREE.MathUtils.degToRad(CAMERA_LIMITS.preferredHeadingDeg)
    const current = c.azimuthAngle
    if (Math.abs(current - preferred) < 0.01) return
    c.rotateAzimuthTo(THREE.MathUtils.damp(current, preferred, HEADING_DAMP, delta), false)
  })

  const minPolar = THREE.MathUtils.degToRad(90 - CAMERA_LIMITS.pitchMaxDeg)
  const maxPolar = THREE.MathUtils.degToRad(90 - CAMERA_LIMITS.pitchMinDeg)
  const yaw = THREE.MathUtils.degToRad(CAMERA_LIMITS.yawDeg)

  return (
    <>
      <PerspectiveCamera makeDefault fov={override.fov} near={0.5} far={3000} position={[80, 48, 140]} />
      <CameraControls
        ref={controls}
        makeDefault
        minDistance={CAMERA_LIMITS.minDistance}
        maxDistance={CAMERA_LIMITS.maxDistance}
        minPolarAngle={minPolar}
        maxPolarAngle={maxPolar}
        minAzimuthAngle={-yaw}
        maxAzimuthAngle={yaw}
        truckSpeed={0.45}
        dollySpeed={0.7}
        smoothTime={0.45}
        draggingSmoothTime={0.12}
      />
    </>
  )
}
