/**
 * Pure choice of what the music bus should hold for a given view of the world. The runtime
 * feeds it a scene and crossfades to whatever comes back; nothing here touches Web Audio.
 */

import type { BiomeId } from "@/lib/world/types";
// Explicit extension so `node --test` can run this module without a bundler.
import { AMBIENCE_FOR_BIOME, BGM_FOR_BIOME, DUCK_RATIO, GLOBE_BGM, NIGHT_BGM_FOR_BIOME, type BgmId } from "./catalog.ts";

export type SceneView = "none" | "globe" | "island";

export interface Scene {
  view: SceneView;
  /** the island's dominant biome; ignored off the island */
  biome: BiomeId | null;
  night: boolean;
}

export interface MusicChoice {
  bgm: BgmId | null;
  ambience: BgmId | null;
}

export const EMPTY_SCENE: Scene = { view: "none", biome: null, night: false };

export function pickMusic(scene: Scene): MusicChoice {
  if (scene.view === "globe") return { bgm: GLOBE_BGM, ambience: null };
  if (scene.view === "island" && scene.biome) {
    return {
      bgm: scene.night ? NIGHT_BGM_FOR_BIOME[scene.biome] : BGM_FOR_BIOME[scene.biome],
      ambience: AMBIENCE_FOR_BIOME[scene.biome] ?? null,
    };
  }
  return { bgm: null, ambience: null };
}

/** The music bus gain while someone is speaking, from the listener's chosen level. */
export function duckTarget(base: number): number {
  return base * DUCK_RATIO;
}

/**
 * The biome a whole island "is": the place holding the most concepts wins, first place on a
 * tie, so the bed does not flip when a small cluster grows by one.
 */
export function dominantBiome(places: ReadonlyArray<{ biome: BiomeId; concept_ids: ReadonlyArray<string> }>): BiomeId | null {
  let best: { biome: BiomeId; n: number } | null = null;
  for (const p of places) {
    if (!best || p.concept_ids.length > best.n) best = { biome: p.biome, n: p.concept_ids.length };
  }
  return best?.biome ?? null;
}
