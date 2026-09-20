import { PROP_SCALE } from './galaxy'

/**
 * Creatures are authored at ~0.8 m (feet at y = 0). These multiply the creature group per scene so
 * a creature reads at roughly the same on-screen size as the biome landmarks around it.
 * Landmarks keep the scene's existing prop scale (1.0 island, 1.1 planet, PROP_SCALE planet2).
 */
export const CREATURE_SCALE = {
  island: 1.0,
  /** R = 4.5 tiny planet: same lift the primitives already had */
  planet: 1.1,
  /** R = 70: landmarks use PROP_SCALE (2.2); creatures ×2.37 on top (≥ 6% of the viewport at topic snap) (Tomodachi proportions: characters large next to buildings) */
  planet2: PROP_SCALE * 2.37,
  diorama: PROP_SCALE * 2.37,
} as const
