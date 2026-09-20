/**
 * Pure choice of what the music bus should hold for a given view of the world. The runtime
 * feeds it a scene and crossfades to whatever comes back; nothing here touches Web Audio.
 */

import type { BiomeId } from "@/lib/world/types";
// Explicit extension so `node --test` can run this module without a bundler.
import { AMBIENCE_FOR_BIOME, BGM_FOR_BIOME, DUCK_RATIO, GLOBE_BGM, NIGHT_BGM_FOR_BIOME, SPACE_BGM, type BgmId } from "./catalog.ts";

/** `space` is the Information tab (/knowledge): the knowledge sky. */
export type SceneView = "none" | "globe" | "island" | "space";

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
  // The sky has no day or night; the astral bed is the same at every hour.
  if (scene.view === "space") return { bgm: SPACE_BGM, ambience: null };
  if (scene.view === "island" && scene.biome) {
    return {
      bgm: scene.night ? NIGHT_BGM_FOR_BIOME[scene.biome] : BGM_FOR_BIOME[scene.biome],
      ambience: AMBIENCE_FOR_BIOME[scene.biome] ?? null,
    };
  }
  return { bgm: null, ambience: null };
}

/**
 * Rate limiter for sounds that fire from pointer movement (star hover). Returns true when at
 * least `minGapMs` has passed since the last accepted call, so a sweep across the sky is a
 * few twinkles, not a rattle.
 */
export function makeThrottle(minGapMs: number): (nowMs: number) => boolean {
  let last = -Infinity;
  return (nowMs: number) => {
    if (nowMs - last < minGapMs) return false;
    last = nowMs;
    return true;
  };
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
