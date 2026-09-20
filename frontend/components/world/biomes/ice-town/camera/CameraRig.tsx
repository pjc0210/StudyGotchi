import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { type BiomeLayout, districtCentre, districtChord } from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import { residentPositions } from '../scene/Residents'
import {
  ICE_CAMERA_BOX,
  ICE_CAMERA_LIMITS,
  ICE_LOOK_AT,
  ICE_LOOK_BOX,
  ICE_OVERVIEW_CHORD,
  STATIONS,
  clampCameraPosition,
  defaultOverride,
  type CameraOverride,
  type Pose,
  type StationId,
  divePose,
  easeInOutCubic,
  poseFor,
} from './stations'

interface CameraRigProps {
  layout: BiomeLayout
  station: StationId
  override: CameraOverride
  focusDistrict: string | null
  diving: boolean
  onDiveEnd: () => void
}

const DIVE_SECONDS = 1.6

/** What the station looks at: the district shape (chord as seen from the azimuth), a resident, or the land. */
export function stationSubject(layout: BiomeLayout, station: StationId, override: CameraOverride, focusDistrict: string | null) {
  if (station === 'district' && focusDistrict) {
    const district = layout.districts.find((c) => c.id === focusDistrict)
    if (district) {
      const [x, z] = districtCentre(district)
      const y = Math.max(layout.seaLevel, sampleTerrain(layout, x, z).height)
      return { center: [x, y, z] as [number, number, number], chord: districtChord(district, override.azimuthDeg) }
    }
  }
  if (station === 'resident' && residentPositions[0]) {
    const p = residentPositions[0]
    return { center: [p.x, p.y, p.z] as [number, number, number], chord: 4 }
  }
  // Frame the mainland with the range behind it: centre sits a little back of the origin.
  return { center: [-2, layout.groundHeight, -8] as [number, number, number], chord: layout.frameRadius * 2 }
}

const LOOK_BOUNDARY = new THREE.Box3(
  new THREE.Vector3(...ICE_LOOK_BOX.min),
  new THREE.Vector3(...ICE_LOOK_BOX.max),
)
const CAMERA_BOUNDARY = new THREE.Box3(
  new THREE.Vector3(...ICE_CAMERA_BOX.min),
  new THREE.Vector3(...ICE_CAMERA_BOX.max),
)

function iceSubject(layout: BiomeLayout, focusDistrict: string | null) {
  if (focusDistrict) {
    const district = layout.districts.find((entry) => entry.id === focusDistrict)
    if (district) {
      const [x, z] = districtCentre(district)
      const y = Math.max(layout.seaLevel, sampleTerrain(layout, x, z).height)
      const pullSouth = district.id === "forest" || district.id === "glacier" ? 22 : 0
      return {
        center: [x, y, z + pullSouth] as [number, number, number],
        chord: Math.min(district.id === "station" ? 48 : 72, districtChord(district, ICE_CAMERA_LIMITS.preferredAzimuthDeg) + pullSouth * 0.4),
      }
    }
  }
  return { center: ICE_LOOK_AT, chord: ICE_OVERVIEW_CHORD }
}

/** Product land: look at the mainland on the first frame. No CameraControls delay. */
export function LockedOverviewCamera({
  layout,
  focusDistrict = null,
}: {
  layout: BiomeLayout
  focusDistrict?: string | null
}) {
  return <BoundedIceCamera layout={layout} focusDistrict={focusDistrict} />
}

/** Preferred town look, yaw/pitch/zoom clamps so the range stays the edge of the world. */
export function BoundedIceCamera({
  layout,
  focusDistrict = null,
}: {
  layout: BiomeLayout
  focusDistrict?: string | null
}) {
  const controls = useRef<CameraControls>(null)
  const size = useThree((state) => state.size)
  const camera = useThree((state) => state.camera)
  const hasPose = useRef(false)
  const lastFocus = useRef<string | null>(null)
  const userTookOver = useRef(false)
  const [controlsOn, setControlsOn] = useState(false)

  const applyPose = (smooth: boolean) => {
    const aspect = size.width / Math.max(1, size.height)
    const station = focusDistrict ? STATIONS.district : STATIONS.overview
    const pose = poseFor(station, defaultOverride(station), iceSubject(layout, focusDistrict), aspect)
    const from = new THREE.Vector3(...pose.position)
    const to = new THREE.Vector3(...pose.target)
    const dir = from.clone().sub(to)
    const distance = THREE.MathUtils.clamp(dir.length(), ICE_CAMERA_LIMITS.minDistance, ICE_CAMERA_LIMITS.maxDistance)
    dir.setLength(distance)
    const raw = to.clone().add(dir)
    const clamped = clampCameraPosition(raw.x, raw.y, raw.z, to.z)
    const position = new THREE.Vector3(...clamped)
    CAMERA_BOUNDARY.clampPoint(position, position)
    camera.position.copy(position)
    camera.lookAt(to)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = station.fov
      camera.near = 0.5
      camera.far = 3000
      camera.aspect = aspect
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()
    void controls.current?.setLookAt(position.x, position.y, position.z, to.x, to.y, to.z, smooth)
  }

  useLayoutEffect(() => {
    const focusChanged = lastFocus.current !== focusDistrict
    if (userTookOver.current && !focusChanged && hasPose.current) return
    const smooth = hasPose.current && focusChanged
    applyPose(smooth)
    lastFocus.current = focusDistrict
    if (focusChanged) userTookOver.current = false
    hasPose.current = true
    if (!controlsOn) setControlsOn(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, focusDistrict, layout, size.height, size.width])

  useFrame(() => {
    if (!controls.current) return
    if (!hasPose.current) {
      applyPose(false)
      hasPose.current = true
    }
  })

  useEffect(() => {
    const c = controls.current
    if (!c) return
    c.setBoundary(LOOK_BOUNDARY)
    const mark = () => {
      userTookOver.current = true
    }
    c.addEventListener('controlstart', mark)
    return () => c.removeEventListener('controlstart', mark)
  }, [camera])

  const minPolar = THREE.MathUtils.degToRad(90 - ICE_CAMERA_LIMITS.pitchMaxDeg)
  const maxPolar = THREE.MathUtils.degToRad(90 - ICE_CAMERA_LIMITS.pitchMinDeg)
  const yaw = THREE.MathUtils.degToRad(ICE_CAMERA_LIMITS.yawDeg)

  return (
    <>
      <PerspectiveCamera makeDefault fov={STATIONS.overview.fov} near={0.5} far={3000} position={[18, 78, 188]} />
      {controlsOn ? (
      <CameraControls
        ref={controls}
        makeDefault
        minDistance={ICE_CAMERA_LIMITS.minDistance}
        maxDistance={ICE_CAMERA_LIMITS.maxDistance}
        minPolarAngle={minPolar}
        maxPolarAngle={maxPolar}
        minAzimuthAngle={-yaw}
        maxAzimuthAngle={yaw}
        truckSpeed={0.92}
        dollySpeed={0.95}
        azimuthRotateSpeed={0.7}
        polarRotateSpeed={0.4}
        smoothTime={0.28}
        draggingSmoothTime={0.1}
      />
      ) : null}
    </>
  )
}

export function CameraRig({ layout, station, override, focusDistrict, diving, onDiveEnd }: CameraRigProps) {
  const controls = useRef<CameraControls>(null)
  const aspect = useThree((s) => s.size.width / s.size.height)
  // drei rebuilds CameraControls when the default camera changes; re-apply the pose then.
  const camera = useThree((s) => s.camera)
  const dive = useRef<{ from: Pose; to: Pose; t: number } | null>(null)
  const hasPose = useRef(false)

  const subject = () => stationSubject(layout, station, override, focusDistrict)

  useEffect(() => {
    if (diving) {
      const to = poseFor(STATIONS.arrival, { ...override, pitchDeg: STATIONS.arrival.pitchDeg, azimuthDeg: STATIONS.arrival.azimuthDeg, dolly: 1 }, subject(), aspect)
      dive.current = { from: divePose(to), to, t: 0 }
      return
    }
    dive.current = null
    const pose = poseFor(STATIONS[station], override, subject(), aspect)
    void controls.current?.setLookAt(...pose.position, ...pose.target, hasPose.current)
    hasPose.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect, camera, diving, focusDistrict, override, station, layout])

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
    }
  })

  return (
    <>
      <PerspectiveCamera makeDefault fov={override.fov} near={0.5} far={3000} position={[80, 60, 120]} />
      <CameraControls
        ref={controls}
        makeDefault
        minDistance={4}
        maxDistance={1200}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        truckSpeed={0}
        dollySpeed={0.5}
        smoothTime={0.55}
        draggingSmoothTime={0.14}
      />
    </>
  )
}
