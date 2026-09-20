/**
 * Front-facing biome diorama stations. The camera always remains south/front (+z), looking
 * north/back. Pitch is restricted to 34–40° and yaw to ±35°; district stations retarget only.
 */

export type StationId = 'arrival' | 'overview' | 'district' | 'resident'

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
  arrival: { id: 'arrival', label: 'Arrival', pitchDeg: 34, azimuthDeg: 18, fov: 30, fitWidth: 0.7, targetLift: 4 },
  overview: { id: 'overview', label: 'Overview', pitchDeg: 38, azimuthDeg: 0, fov: 34, fitWidth: 0.8, targetLift: 3 },
  /** Frames the district shape at ~70 % of the frame width (creature size follows the scale rule). */
  district: { id: 'district', label: 'District', pitchDeg: 36, azimuthDeg: 0, fov: 26, fitWidth: 0.75, targetLift: 1.6 },
  resident: { id: 'resident', label: 'Resident', pitchDeg: 34, azimuthDeg: 0, fov: 26, distance: 9, targetLift: 1.2 },
}

export interface CameraOverride {
  pitchDeg: number
  azimuthDeg: number
  dolly: number
  fov: number
}

export function clampBiomeYaw(azimuthDeg: number): number {
  return Math.min(35, Math.max(-35, azimuthDeg))
}

export function defaultOverride(station: Station): CameraOverride {
  return { pitchDeg: station.pitchDeg, azimuthDeg: clampBiomeYaw(station.azimuthDeg), dolly: 1, fov: station.fov }
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
  const pitch = (override.pitchDeg * Math.PI) / 180
  const azimuth = (clampBiomeYaw(override.azimuthDeg) * Math.PI) / 180
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

/** Dive start: high above the arrival pose, so the flight passes the cloud layer (h ≈ 14 m). */
export function divePose(arrival: Pose): Pose {
  return {
    position: [arrival.position[0] * 1.35, arrival.position[1] * 5.2, arrival.position[2] * 1.35],
    target: arrival.target,
  }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
