import type { BiomeId } from '../lib/world'
import type { Stage } from '../lib/landmarks'

/** biomes the Landmark Artisan ships; anything else maps to the nearest one */
export const LANDMARK_BIOMES = ['forest', 'city', 'ice', 'sand', 'meadow', 'ocean', 'volcanic'] as const
export type LandmarkBiome = (typeof LANDMARK_BIOMES)[number]

export function landmarkBiome(biome: BiomeId): LandmarkBiome {
  if (biome === 'coast') return 'ocean'
  return (LANDMARK_BIOMES as readonly string[]).includes(biome) ? (biome as LandmarkBiome) : 'meadow'
}

/** manifest id of the landmark file for a biome and stage, e.g. `ice-landmark-s2` */
export function landmarkId(biome: BiomeId, stage: Stage) {
  return `${landmarkBiome(biome)}-landmark-s${stage}`
}
