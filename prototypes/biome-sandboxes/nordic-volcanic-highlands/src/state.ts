import type { DistrictProgress } from './layout/biome-layout'
import type { CameraOverride, StationId } from './camera/stations'

export type CatastrophePhase = 'calm' | 'ashfall' | 'quake' | 'ruin' | 'recovering'

export interface CatastropheState {
  districtId: string | null
  phase: CatastrophePhase
  /** Seconds since the phase began; the scene advances phases on a timer. */
  startedAt: number
}

export interface LabState {
  progress: DistrictProgress
  residents: number
  seed: number
  night: boolean
  aurora: boolean
  mist: boolean
  ambient: boolean
  pixel: boolean
  station: StationId
  focusDistrict: string | null
  camera: CameraOverride
  catastrophe: CatastropheState
  diving: boolean
}

export const PHASE_SECONDS: Record<CatastrophePhase, number> = {
  calm: 0,
  ashfall: 2.0,
  quake: 0.8,
  ruin: Number.POSITIVE_INFINITY,
  recovering: 3.0,
}
