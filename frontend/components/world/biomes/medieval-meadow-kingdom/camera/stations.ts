/**
 * Camera stations (biome-world-structure.md §6, district station per the pass-3 review).
 * Pitch = elevation above the tangent plane, azimuth measured from +z (front) toward +x.
 * Distances derived from what must fit the frame.
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
  arrival: { id: 'arrival', label: 'Arrival', pitchDeg: 22, azimuthDeg: 8, fov: 36, fitWidth: 0.82, targetLift: 3 },
  overview: { id: 'overview', label: 'Overview', pitchDeg: 22, azimuthDeg: 8, fov: 36, fitWidth: 0.9, targetLift: 3 },
  /** Frames the district shape at ~70 % of the frame width (creature size follows the scale rule). */
  district: { id: 'district', label: 'District', pitchDeg: 20, azimuthDeg: 8, fov: 36, fitWidth: 0.8, targetLift: 2.4 },
  resident: { id: 'resident', label: 'Resident', pitchDeg: 18, azimuthDeg: 8, fov: 36, distance: 9, targetLift: 1.2 },
}

/** Product-land roam: preferred heading, side clamps, zoom — not a 6° pitch rail. */
export const CAMERA_LIMITS = {
  preferredHeadingDeg: 8,
  yawDeg: 42,
  pitchMinDeg: 16,
  pitchMaxDeg: 48,
  minDistance: 22,
  maxDistance: 300,
  minDolly: 0.42,
  maxDolly: 1.65,
} as const

export function clampDioramaYaw(yawDeg: number): number {
  return Math.min(CAMERA_LIMITS.yawDeg, Math.max(-CAMERA_LIMITS.yawDeg, yawDeg))
}

export function clampDioramaPitch(pitchDeg: number): number {
  return Math.min(CAMERA_LIMITS.pitchMaxDeg, Math.max(CAMERA_LIMITS.pitchMinDeg, pitchDeg))
}

export function clampDolly(dolly: number): number {
  return Math.min(CAMERA_LIMITS.maxDolly, Math.max(CAMERA_LIMITS.minDolly, dolly))
}

/** Fixed front-facing acceptance pose used for the −35/0/+35 yaw checks. */
export function overviewPoseForYaw(yawDeg: number, dolly = 1): CameraOverride {
  return {
    pitchDeg: STATIONS.overview.pitchDeg,
    azimuthDeg: clampDioramaYaw(yawDeg),
    dolly: clampDolly(dolly),
    fov: STATIONS.overview.fov,
  }
}

export interface CameraOverride {
  pitchDeg: number
  azimuthDeg: number
  dolly: number
  fov: number
}

export function defaultOverride(station: Station): CameraOverride {
  return {
    pitchDeg: clampDioramaPitch(station.pitchDeg),
    azimuthDeg: clampDioramaYaw(station.azimuthDeg),
    dolly: 1,
    fov: station.fov,
  }
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
  const pitch = (clampDioramaPitch(override.pitchDeg) * Math.PI) / 180
  const azimuth = (clampDioramaYaw(override.azimuthDeg) * Math.PI) / 180
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
