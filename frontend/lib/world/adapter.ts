import { spotStateOf } from "@/lib/state";
import type {
  BiomeId,
  CanvasCharacter,
  CanvasPlace,
  CanvasSpot,
  CanvasWorld,
  CharacterState,
  CreatureState,
  WorldResponse,
} from "./types";

const BIOME_ORDER: BiomeId[] = ["forest", "meadow", "ice", "sand", "city"];

const CHARACTER_STATE: Record<CreatureState, CharacterState> = {
  unhatched: "idle",
  weak: "exploded",
  normal: "idle",
  evolved: "evolved",
  ascended: "evolved",
  sleepy: "faded",
};

/** Check a payload has the shape the canvas needs before trusting it. */
export function asWorldResponse(raw: unknown): WorldResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as WorldResponse;
  if (!Array.isArray(obj.regions) || typeof obj.world_version !== "string") return null;
  return obj;
}

/**
 * Regions to island. Places are the engine's clusters; a region without one
 * lands in a shared "Loose ends" place so nothing disappears.
 */
export function toCanvasWorld(world: WorldResponse): CanvasWorld {
  const groups = new Map<string, { label: string; concept_ids: string[] }>();
  for (const region of world.regions) {
    const key = region.cluster_id ?? "loose";
    const label = region.cluster ?? (region.cluster_id ? `Topic ${region.cluster_id}` : "Loose ends");
    const group = groups.get(key) ?? { label, concept_ids: [] };
    group.concept_ids.push(region.concept_id);
    groups.set(key, group);
  }

  const places: CanvasPlace[] = [...groups.entries()]
    .sort(([a], [b]) => (a === "loose" ? 1 : b === "loose" ? -1 : a.localeCompare(b)))
    .map(([id, group], index) => ({
      id,
      label: group.label,
      biome: BIOME_ORDER[index % BIOME_ORDER.length],
      concept_ids: group.concept_ids,
    }));

  const spots: CanvasSpot[] = world.regions.map((region) => ({
    concept_id: region.concept_id,
    place_id: region.cluster_id ?? "loose",
    name: region.name,
    state: spotStateOf(region.semantic_state),
    height: region.terrain_height,
    fog: region.fog,
    cracked: region.semantic_state === "struggling",
    semantic_state: region.semantic_state,
    cluster: region.cluster ?? null,
  }));

  const characters: CanvasCharacter[] = world.regions
    .filter((region) => region.creature_state !== "unhatched")
    .map((region) => ({
      id: `res:${region.concept_id}`,
      place_id: region.cluster_id ?? "loose",
      concept_id: region.concept_id,
      label: region.name,
      state: CHARACTER_STATE[region.creature_state],
      creature_state: region.creature_state,
    }));

  return {
    course_id: world.course_id,
    student_id: world.student_id,
    version: world.world_version,
    seed: `${world.course_id}/${world.student_id}`,
    hidden_concept_count: world.hidden_concept_count,
    places,
    spots,
    characters,
  };
}

/** Concepts whose look changed between two payloads, so the island can pulse them. */
export function changedRegions(previous: WorldResponse | null, next: WorldResponse): Set<string> {
  const changed = new Set<string>();
  const before = new Map((previous?.regions ?? []).map((r) => [r.concept_id, r]));
  for (const region of next.regions) {
    const old = before.get(region.concept_id);
    if (
      !old ||
      old.semantic_state !== region.semantic_state ||
      old.creature_state !== region.creature_state ||
      Math.abs(old.terrain_height - region.terrain_height) > 0.02
    ) {
      changed.add(region.concept_id);
    }
  }
  return changed;
}
