import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { GeneratedKingdom } from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import { residentPositions } from '../scene/Residents'
import { STATIONS, type CameraOverride, type Pose, type StationId, divePose, easeInOutCubic, poseFor } from './stations'

interface CameraRigProps {
  layout: GeneratedKingdom
  station: StationId
  override: CameraOverride
  focusDistrict: string | null
  diving: boolean
  onDiveEnd: () => void
}

const DIVE_SECONDS = 1.6

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
        maxDistance={520}
        minPolarAngle={THREE.MathUtils.degToRad(50)}
        maxPolarAngle={THREE.MathUtils.degToRad(56)}
        minAzimuthAngle={THREE.MathUtils.degToRad(-35)}
        maxAzimuthAngle={THREE.MathUtils.degToRad(35)}
        truckSpeed={0}
        dollySpeed={0.5}
        smoothTime={0.55}
        draggingSmoothTime={0.14}
      />
    </>
  )
}
