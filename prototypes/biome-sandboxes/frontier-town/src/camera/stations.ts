export type StationId = 'arrival' | 'overview' | 'district' | 'landmark' | 'horizon' | 'resident'

export interface CameraOverride {
  pitchDeg: number
  azimuthDeg: number
  dolly: number
  fov: number
}

export const STATIONS: Record<StationId, { label: string; pitchDeg: number; azimuthDeg: number; dolly: number; fov: number }> = {
  arrival: { label: 'Arrival', pitchDeg: 34, azimuthDeg: 0, dolly: 1, fov: 30 },
  overview: { label: 'Kingdom', pitchDeg: 37, azimuthDeg: 0, dolly: 1, fov: 26 },
  district: { label: 'District', pitchDeg: 36, azimuthDeg: 0, dolly: 1, fov: 34 },
  landmark: { label: 'Landmark', pitchDeg: 36, azimuthDeg: 0, dolly: 1, fov: 32 },
  horizon: { label: 'Skyline QA', pitchDeg: 37, azimuthDeg: 0, dolly: 1, fov: 26 },
  resident: { label: 'Creature', pitchDeg: 34, azimuthDeg: 0, dolly: 1, fov: 30 },
}

export function defaultOverride(id: StationId): CameraOverride {
  const station = STATIONS[id]
  return { pitchDeg: station.pitchDeg, azimuthDeg: station.azimuthDeg, dolly: station.dolly, fov: station.fov }
}
