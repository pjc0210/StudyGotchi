import type { CameraOverride, StationId } from './camera/stations'
import type { DistrictProgress } from './layout/biome-layout'

export type CatastrophePhase = 'calm' | 'squall' | 'quake' | 'ruin' | 'recovering'

export interface CatastropheState {
  districtId: string | null
  phase: CatastrophePhase
  startedAt: number
}

export interface LabState {
  progress: DistrictProgress
  residents: number
  seed: number
  night: boolean
  clouds: boolean
  boatEvent: boolean
  pixel: boolean
  markerMode: boolean
  station: StationId
  focusDistrict: string | null
  camera: CameraOverride
  catastrophe: CatastropheState
  diving: boolean
}

export const PHASE_SECONDS: Record<CatastrophePhase, number> = {
  calm: 0,
  squall: 1.8,
  quake: 0.8,
  ruin: Number.POSITIVE_INFINITY,
  recovering: 2.5,
}
