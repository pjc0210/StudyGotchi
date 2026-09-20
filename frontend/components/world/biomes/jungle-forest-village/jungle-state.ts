import type { CameraOverride, StationId } from './camera/stations'
import type { DistrictId, Progress } from './layout/jungle-layout'

export type JungleCatastrophePhase = 'calm' | 'monsoon' | 'strike' | 'overgrowth' | 'recovering'

export interface JungleCatastrophe {
  districtId: DistrictId | null
  phase: JungleCatastrophePhase
  startedAt: number
}

export interface JungleState {
  progress: Progress
  residents: number
  seed: number
  night: boolean
  mist: boolean
  birds: boolean
  waterEvent: boolean
  pixel: boolean
  station: StationId
  focusDistrict: DistrictId | null
  camera: CameraOverride
  catastrophe: JungleCatastrophe
  diving: boolean
  comparison: boolean
}

export const CATASTROPHE_SECONDS: Record<JungleCatastrophePhase, number> = {
  calm: 0,
  monsoon: 1.8,
  strike: 0.7,
  overgrowth: Number.POSITIVE_INFINITY,
  recovering: 2.4,
}
