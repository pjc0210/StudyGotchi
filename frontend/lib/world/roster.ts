/**
 * Which animated creature stands for a concept, per island biome.
 *
 * Generated from assets/creatures/animated/manifest.json (v1, animation v4) on 2026-09-20 with the
 * hand-picked order from prototypes/world-lab/src/data/roster.ts: archetypes alternate (blob / biped /
 * bird / sprite / bean) so neighbours never look alike. Water-only `flat` bodies and the Tripo pack
 * are left out on purpose; the ship set is the in-house animated roster.
 */

import { hashString, makeRng } from "@/lib/seed";
import { GUEST_BY_ID, guestsFor, isGuestId } from "./guest-pack";
import type { BiomeId } from "./types";

/** Shared island / ice body size so guests and locals read as one crowd. */
export const CREATURE_SCENE_SCALE = 1.22;

export type Archetype = "blob" | "bean" | "bird" | "biped" | "sprite";
export type Personality = "sleepy" | "bold" | "curious" | "grumpy" | "shy";

export interface CreatureMeta {
  id: string;
  archetype: Archetype;
  biome: BiomeId;
  personality: Personality;
  /** metres, Root at the feet */
  height: number;
  /** the once-only clip this body plays when tapped */
  happyVariant: string;
}

const LOCAL_ROSTER: Record<BiomeId, string[]> = {
  forest: ["blob-forest-1", "biped-forest-2", "bird-forest-1", "sprite-forest-1", "bean-forest-1", "blob-forest-2", "biped-forest-8132", "bird-forest-2", "sprite-forest-2", "bean-forest-2", "biped-forest-1"],
  meadow: ["bean-meadow-9218", "bird-meadow-1", "blob-meadow-1", "sprite-meadow-1", "biped-meadow-1", "blob-meadow-1422", "bean-meadow-1", "bird-meadow-2", "sprite-meadow-2", "biped-meadow-2", "blob-meadow-2", "bean-meadow-2"],
  ice: ["blob-ice-2", "biped-ice-1", "bird-ice-2", "sprite-ice-1", "bean-ice-1", "blob-ice-1706", "biped-ice-5796", "bird-ice-1", "sprite-ice-2", "blob-ice-8333", "bean-ice-2", "blob-ice-1", "biped-ice-2"],
  city: ["bean-city-1", "bird-city-1", "blob-city-2", "sprite-city-2", "biped-city-1", "blob-city-1", "bird-city-2", "sprite-city-1", "bean-city-2", "biped-city-2"],
  sand: ["bird-sand-2", "blob-sand-2", "sprite-sand-4031", "biped-sand-1", "bean-sand-1", "blob-sand-1", "sprite-sand-1", "bird-sand-1", "biped-sand-2", "bean-sand-2", "sprite-sand-2"],
};

function interleave(guests: string[], locals: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  const n = Math.max(guests.length, locals.length);
  for (let i = 0; i < n; i++) {
    for (const id of [guests[i], locals[i]]) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export const ISLAND_ROSTER: Record<BiomeId, string[]> = {
  forest: interleave(guestsFor("forest"), LOCAL_ROSTER.forest),
  meadow: interleave(guestsFor("meadow"), LOCAL_ROSTER.meadow),
  ice: interleave(guestsFor("ice"), LOCAL_ROSTER.ice),
  city: interleave(guestsFor("city"), LOCAL_ROSTER.city),
  sand: interleave(guestsFor("sand"), LOCAL_ROSTER.sand),
};

export const CREATURE_META: Record<string, CreatureMeta> = {
  "blob-forest-1": { id: "blob-forest-1", archetype: "blob", biome: "forest", personality: "bold", height: 0.9, happyVariant: "double_bounce" },
  "biped-forest-2": { id: "biped-forest-2", archetype: "biped", biome: "forest", personality: "curious", height: 0.9, happyVariant: "jump_spin" },
  "bird-forest-1": { id: "bird-forest-1", archetype: "bird", biome: "forest", personality: "bold", height: 0.9, happyVariant: "flap_hop" },
  "sprite-forest-1": { id: "sprite-forest-1", archetype: "sprite", biome: "forest", personality: "sleepy", height: 0.7, happyVariant: "cap_pop" },
  "bean-forest-1": { id: "bean-forest-1", archetype: "bean", biome: "forest", personality: "sleepy", height: 0.7, happyVariant: "pounce" },
  "blob-forest-2": { id: "blob-forest-2", archetype: "blob", biome: "forest", personality: "curious", height: 0.8125, happyVariant: "double_bounce" },
  "biped-forest-8132": { id: "biped-forest-8132", archetype: "biped", biome: "forest", personality: "sleepy", height: 0.9, happyVariant: "jump_spin" },
  "bird-forest-2": { id: "bird-forest-2", archetype: "bird", biome: "forest", personality: "sleepy", height: 0.8453, happyVariant: "flap_hop" },
  "sprite-forest-2": { id: "sprite-forest-2", archetype: "sprite", biome: "forest", personality: "shy", height: 0.7995, happyVariant: "cap_pop" },
  "bean-forest-2": { id: "bean-forest-2", archetype: "bean", biome: "forest", personality: "sleepy", height: 0.7053, happyVariant: "pounce" },
  "biped-forest-1": { id: "biped-forest-1", archetype: "biped", biome: "forest", personality: "shy", height: 0.9, happyVariant: "jump_spin" },
  "bean-meadow-9218": { id: "bean-meadow-9218", archetype: "bean", biome: "meadow", personality: "bold", height: 0.7, happyVariant: "pounce" },
  "bird-meadow-1": { id: "bird-meadow-1", archetype: "bird", biome: "meadow", personality: "curious", height: 0.9, happyVariant: "flap_hop" },
  "blob-meadow-1": { id: "blob-meadow-1", archetype: "blob", biome: "meadow", personality: "grumpy", height: 0.9, happyVariant: "double_bounce" },
  "sprite-meadow-1": { id: "sprite-meadow-1", archetype: "sprite", biome: "meadow", personality: "sleepy", height: 0.7, happyVariant: "cap_pop" },
  "biped-meadow-1": { id: "biped-meadow-1", archetype: "biped", biome: "meadow", personality: "sleepy", height: 0.9, happyVariant: "jump_spin" },
  "blob-meadow-1422": { id: "blob-meadow-1422", archetype: "blob", biome: "meadow", personality: "shy", height: 0.7051, happyVariant: "double_bounce" },
  "bean-meadow-1": { id: "bean-meadow-1", archetype: "bean", biome: "meadow", personality: "grumpy", height: 0.7493, happyVariant: "pounce" },
  "bird-meadow-2": { id: "bird-meadow-2", archetype: "bird", biome: "meadow", personality: "grumpy", height: 0.7, happyVariant: "flap_hop" },
  "sprite-meadow-2": { id: "sprite-meadow-2", archetype: "sprite", biome: "meadow", personality: "sleepy", height: 0.7, happyVariant: "cap_pop" },
  "biped-meadow-2": { id: "biped-meadow-2", archetype: "biped", biome: "meadow", personality: "shy", height: 0.9, happyVariant: "jump_spin" },
  "blob-meadow-2": { id: "blob-meadow-2", archetype: "blob", biome: "meadow", personality: "shy", height: 0.7825, happyVariant: "double_bounce" },
  "bean-meadow-2": { id: "bean-meadow-2", archetype: "bean", biome: "meadow", personality: "shy", height: 0.7351, happyVariant: "pounce" },
  "blob-ice-2": { id: "blob-ice-2", archetype: "blob", biome: "ice", personality: "bold", height: 0.7169, happyVariant: "double_bounce" },
  "biped-ice-1": { id: "biped-ice-1", archetype: "biped", biome: "ice", personality: "grumpy", height: 0.9, happyVariant: "jump_spin" },
  "bird-ice-2": { id: "bird-ice-2", archetype: "bird", biome: "ice", personality: "curious", height: 0.8676, happyVariant: "flap_hop" },
  "sprite-ice-1": { id: "sprite-ice-1", archetype: "sprite", biome: "ice", personality: "sleepy", height: 0.7, happyVariant: "cap_pop" },
  "bean-ice-1": { id: "bean-ice-1", archetype: "bean", biome: "ice", personality: "shy", height: 0.9, happyVariant: "pounce" },
  "blob-ice-1706": { id: "blob-ice-1706", archetype: "blob", biome: "ice", personality: "curious", height: 0.9, happyVariant: "double_bounce" },
  "biped-ice-5796": { id: "biped-ice-5796", archetype: "biped", biome: "ice", personality: "bold", height: 0.9, happyVariant: "jump_spin" },
  "bird-ice-1": { id: "bird-ice-1", archetype: "bird", biome: "ice", personality: "shy", height: 0.7, happyVariant: "flap_hop" },
  "sprite-ice-2": { id: "sprite-ice-2", archetype: "sprite", biome: "ice", personality: "grumpy", height: 0.7092, happyVariant: "cap_pop" },
  "blob-ice-8333": { id: "blob-ice-8333", archetype: "blob", biome: "ice", personality: "curious", height: 0.9, happyVariant: "double_bounce" },
  "bean-ice-2": { id: "bean-ice-2", archetype: "bean", biome: "ice", personality: "bold", height: 0.728, happyVariant: "pounce" },
  "blob-ice-1": { id: "blob-ice-1", archetype: "blob", biome: "ice", personality: "shy", height: 0.7937, happyVariant: "double_bounce" },
  "biped-ice-2": { id: "biped-ice-2", archetype: "biped", biome: "ice", personality: "bold", height: 0.9, happyVariant: "jump_spin" },
  "bean-city-1": { id: "bean-city-1", archetype: "bean", biome: "city", personality: "shy", height: 0.7, happyVariant: "pounce" },
  "bird-city-1": { id: "bird-city-1", archetype: "bird", biome: "city", personality: "curious", height: 0.9, happyVariant: "flap_hop" },
  "blob-city-2": { id: "blob-city-2", archetype: "blob", biome: "city", personality: "bold", height: 0.9, happyVariant: "double_bounce" },
  "sprite-city-2": { id: "sprite-city-2", archetype: "sprite", biome: "city", personality: "curious", height: 0.7, happyVariant: "cap_pop" },
  "biped-city-1": { id: "biped-city-1", archetype: "biped", biome: "city", personality: "shy", height: 0.9, happyVariant: "jump_spin" },
  "blob-city-1": { id: "blob-city-1", archetype: "blob", biome: "city", personality: "sleepy", height: 0.7, happyVariant: "double_bounce" },
  "bird-city-2": { id: "bird-city-2", archetype: "bird", biome: "city", personality: "sleepy", height: 0.9, happyVariant: "flap_hop" },
  "sprite-city-1": { id: "sprite-city-1", archetype: "sprite", biome: "city", personality: "grumpy", height: 0.7, happyVariant: "cap_pop" },
  "bean-city-2": { id: "bean-city-2", archetype: "bean", biome: "city", personality: "shy", height: 0.7, happyVariant: "pounce" },
  "biped-city-2": { id: "biped-city-2", archetype: "biped", biome: "city", personality: "sleepy", height: 0.9, happyVariant: "jump_spin" },
  "bird-sand-2": { id: "bird-sand-2", archetype: "bird", biome: "sand", personality: "curious", height: 0.8784, happyVariant: "flap_hop" },
  "blob-sand-2": { id: "blob-sand-2", archetype: "blob", biome: "sand", personality: "bold", height: 0.8616, happyVariant: "double_bounce" },
  "sprite-sand-4031": { id: "sprite-sand-4031", archetype: "sprite", biome: "sand", personality: "curious", height: 0.7, happyVariant: "cap_pop" },
  "biped-sand-1": { id: "biped-sand-1", archetype: "biped", biome: "sand", personality: "sleepy", height: 0.9, happyVariant: "jump_spin" },
  "bean-sand-1": { id: "bean-sand-1", archetype: "bean", biome: "sand", personality: "bold", height: 0.7729, happyVariant: "pounce" },
  "blob-sand-1": { id: "blob-sand-1", archetype: "blob", biome: "sand", personality: "bold", height: 0.7, happyVariant: "double_bounce" },
  "sprite-sand-1": { id: "sprite-sand-1", archetype: "sprite", biome: "sand", personality: "grumpy", height: 0.7318, happyVariant: "cap_pop" },
  "bird-sand-1": { id: "bird-sand-1", archetype: "bird", biome: "sand", personality: "grumpy", height: 0.9, happyVariant: "flap_hop" },
  "biped-sand-2": { id: "biped-sand-2", archetype: "biped", biome: "sand", personality: "shy", height: 0.9, happyVariant: "jump_spin" },
  "bean-sand-2": { id: "bean-sand-2", archetype: "bean", biome: "sand", personality: "grumpy", height: 0.7, happyVariant: "pounce" },
  "sprite-sand-2": { id: "sprite-sand-2", archetype: "sprite", biome: "sand", personality: "shy", height: 0.7, happyVariant: "cap_pop" },
};

/** every id the island may spawn, for `useGLTF.preload` */
export const ROSTER_IDS: string[] = Object.values(ISLAND_ROSTER).flat();

export function creatureUrl(id: string): string {
  if (isGuestId(id)) return GUEST_BY_ID[id].url;
  return `/assets/creatures/animated/${id}.glb`;
}

export function creatureMeta(id: string): CreatureMeta | undefined {
  if (isGuestId(id)) {
    const g = GUEST_BY_ID[id];
    return {
      id: g.id,
      archetype: g.archetype,
      biome: g.biome,
      personality: g.personality,
      height: g.height,
      happyVariant: g.happyVariant,
    };
  }
  return CREATURE_META[id];
}

/**
 * Deterministic pick. The roster is walked from a seed-dependent offset so two places of the same
 * biome do not open with the same body, while `index` (the concept's position in its place) still
 * gives every resident a distinct look until the roster wraps.
 */
export function pickCreature(seed: string, biome: BiomeId, index: number): string {
  const list = ISLAND_ROSTER[biome];
  const rng = makeRng(hashString(`${seed}:roster:${biome}`));
  const offset = Math.floor(rng() * list.length);
  return list[(offset + Math.max(0, index)) % list.length];
}
