import type { BiomeLayout, DistrictProgress } from '../layout/biome-layout'
import type { CatastrophePhase } from '../state'
import { OurWalkers } from './OurWalkers'

export { residentPositions, ICE_CAST } from './OurWalkers'

export function Residents({
  layout,
  progress,
  phase,
}: {
  layout: BiomeLayout
  progress: DistrictProgress
  count?: number
  seed?: number
  phase: CatastrophePhase
  night?: boolean
}) {
  return <OurWalkers layout={layout} progress={progress} phase={phase} />
}
