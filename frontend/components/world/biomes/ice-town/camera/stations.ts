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
  arrival: { id: 'arrival', label: 'Arrival', pitchDeg: 30, azimuthDeg: 16, fov: 34, fitWidth: 0.62, targetLift: 3 },
  overview: { id: 'overview', label: 'Overview', pitchDeg: 30, azimuthDeg: 16, fov: 36, fitWidth: 0.6, targetLift: 2.6 },
  /** Frames the district shape at ~70 % of the frame width (creature size follows the scale rule). */
  district: { id: 'district', label: 'District', pitchDeg: 30, azimuthDeg: 30, fov: 26, fitWidth: 0.75, targetLift: 1.6 },
  resident: { id: 'resident', label: 'Resident', pitchDeg: 18, azimuthDeg: 20, fov: 26, distance: 9, targetLift: 1.2 },
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

/** Product roam: whole mainland in frame, harbour through mountains, still boxed. */
export const ICE_CAMERA_LIMITS = {
  preferredAzimuthDeg: 16,
  yawDeg: 42,
  pitchMinDeg: 22,
  pitchMaxDeg: 44,
  minDistance: 88,
  maxDistance: 280,
} as const

/** Mainland centre: town plus a little south so the range stays the back edge. */
export const ICE_LOOK_AT: [number, number, number] = [2, 2.4, 8]
export const ICE_OVERVIEW_CHORD = 176

/** CameraControls.setBoundary clamps the look-at, not the camera. This box is the land. */
export const ICE_LOOK_BOX = {
  min: [-128, -1, -82] as [number, number, number],
  max: [128, 24, 102] as [number, number, number],
}

/** Where the camera may sit: further south and wider so a truck covers the mainland. */
export const ICE_CAMERA_BOX = {
  min: [-160, 20, 24] as [number, number, number],
  max: [196, 148, 300] as [number, number, number],
}

export function clampLookTarget(x: number, y: number, z: number): [number, number, number] {
  return [
    Math.min(ICE_LOOK_BOX.max[0], Math.max(ICE_LOOK_BOX.min[0], x)),
    Math.min(ICE_LOOK_BOX.max[1], Math.max(ICE_LOOK_BOX.min[1], y)),
    Math.min(ICE_LOOK_BOX.max[2], Math.max(ICE_LOOK_BOX.min[2], z)),
  ]
}

export function clampCameraPosition(
  x: number,
  y: number,
  z: number,
  targetZ: number,
): [number, number, number] {
  const south = Math.max(z, targetZ + 28, ICE_CAMERA_BOX.min[2])
  return [
    Math.min(ICE_CAMERA_BOX.max[0], Math.max(ICE_CAMERA_BOX.min[0], x)),
    Math.min(ICE_CAMERA_BOX.max[1], Math.max(ICE_CAMERA_BOX.min[1], y)),
    Math.min(ICE_CAMERA_BOX.max[2], south),
  ]
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
  const azimuth = (override.azimuthDeg * Math.PI) / 180
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
