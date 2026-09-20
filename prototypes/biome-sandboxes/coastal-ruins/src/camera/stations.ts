/** Coastal Ruins camera stations. Pitch is elevation; azimuth runs from +z toward +x. */

export type StationId = 'arrival' | 'overview' | 'district' | 'landmark' | 'resident'

export interface Station {
  id: StationId
  label: string
  pitchDeg: number
  azimuthDeg: number
  fov: number
  /** Fraction of the frame width the subject chord should fill; undefined → fixed distance. */
  fitWidth?: number
  distance?: number
  /** Look-at height above the subject centre. */
  targetLift: number
}

export const STATIONS: Record<StationId, Station> = {
  arrival: { id: 'arrival', label: 'Arrival', pitchDeg: 36, azimuthDeg: 12, fov: 27, distance: 72, targetLift: 3.5 },
  overview: { id: 'overview', label: 'Overview', pitchDeg: 39, azimuthDeg: 0, fov: 27, distance: 76, targetLift: 3 },
  district: { id: 'district', label: 'District', pitchDeg: 36, azimuthDeg: 20, fov: 27, fitWidth: 0.75, targetLift: 2 },
  landmark: { id: 'landmark', label: 'Landmark', pitchDeg: 36, azimuthDeg: 18, fov: 27, fitWidth: 0.72, targetLift: 3 },
  resident: { id: 'resident', label: 'Resident', pitchDeg: 34, azimuthDeg: 12, fov: 27, distance: 10, targetLift: 1.25 },
}

export interface CameraOverride {
  pitchDeg: number
  azimuthDeg: number
  dolly: number
  fov: number
}

export function defaultOverride(station: Station): CameraOverride {
  return { pitchDeg: station.pitchDeg, azimuthDeg: station.azimuthDeg, dolly: 1, fov: station.fov }
}

/** Distance so that a chord of `width` metres fills `fraction` of the frame width. */
export function fitDistance(width: number, fraction: number, fovDeg: number, aspect: number): number {
  const fovV = (fovDeg * Math.PI) / 180
  const halfH = Math.atan(Math.tan(fovV / 2) * aspect)
  return width / (2 * fraction * Math.tan(halfH))
}

export interface Pose {
  position: [number, number, number]
  target: [number, number, number]
}

export function poseFor(
  station: Station,
  override: CameraOverride,
  subject: { center: [number, number, number]; chord: number },
  aspect: number,
): Pose {
  const distance =
    (station.fitWidth !== undefined
      ? fitDistance(subject.chord, station.fitWidth, override.fov, aspect)
      : (station.distance ?? 10)) * override.dolly
  const pitch = (Math.min(40, Math.max(34, override.pitchDeg)) * Math.PI) / 180
  const azimuth = (Math.min(35, Math.max(-35, override.azimuthDeg)) * Math.PI) / 180
  const horizontal = Math.cos(pitch) * distance
  const target: [number, number, number] = [
    subject.center[0],
    subject.center[1] + station.targetLift,
    subject.center[2],
  ]
  return {
    position: [
      target[0] + Math.sin(azimuth) * horizontal,
      target[1] + Math.sin(pitch) * distance,
      target[2] + Math.cos(azimuth) * horizontal,
    ],
    target,
  }
}

/** Globe-height dive start; clouds occlude the 40–60 % crossfade window. */
export function divePose(arrival: Pose): Pose {
  return {
    position: [arrival.position[0] * 1.45, arrival.position[1] * 5.4, arrival.position[2] * 1.45],
    target: arrival.target,
  }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
