import type { DistrictProgress } from './layout/biome-layout'
import type { CameraOverride, StationId } from './camera/stations'

export type CatastrophePhase = 'calm' | 'dust' | 'impact' | 'ruin' | 'recovering'

export interface LabState {
  progress: DistrictProgress
  residents: number
  seed: number
  night: boolean
  dust: boolean
  train: boolean
  wildlife: boolean
  pixel: boolean
  station: StationId
  focusDistrict: string | null
  camera: CameraOverride
  catastrophe: { districtId: string | null; phase: CatastrophePhase }
}
