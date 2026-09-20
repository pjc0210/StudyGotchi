import { spotStateOf } from "@/lib/state";
import { ISLAND_RADIUS, characterOffset, placeCenter, spotOffset, worldPosition } from "./layout";
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

type WorldRegionLike = { concept_id: string; cluster_id?: string | null };

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

  const ordered = [...groups.entries()].sort(([a], [b]) =>
    a === "loose" ? 1 : b === "loose" ? -1 : a.localeCompare(b),
  );
  // Positions are decided here, once, from ids: new regions append, old ones stay put.
  const places: CanvasPlace[] = ordered.map(([id, group], index) => ({
    id,
    label: group.label,
    biome: BIOME_ORDER[index % BIOME_ORDER.length],
    concept_ids: group.concept_ids,
    center: placeCenter(id, index, ordered.length),
  }));
  const centers = new Map(places.map((p) => [p.id, p.center]));
  const positionOf = (region: WorldRegionLike) =>
    worldPosition(centers.get(region.cluster_id ?? "loose") ?? { x: 0, z: 0 }, spotOffset(region.concept_id));

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
    position: positionOf(region),
  }));

  const characters: CanvasCharacter[] = world.regions
    .filter((region) => region.creature_state !== "unhatched")
    .map((region) => {
      const spot = positionOf(region);
      const drift = characterOffset(`res:${region.concept_id}`);
      return {
        id: `res:${region.concept_id}`,
        place_id: region.cluster_id ?? "loose",
        concept_id: region.concept_id,
        label: region.name,
        state: CHARACTER_STATE[region.creature_state],
        creature_state: region.creature_state,
        home: { x: spot.x + drift.x * ISLAND_RADIUS * 0.5, z: spot.z + drift.z * ISLAND_RADIUS * 0.5 },
      };
    });

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

export type WorldChangeKind =
  | "hatch"
  | "sprout"
  | "landmark"
  | "upgrade"
  | "grow"
  | "master"
  | "explode"
  | "recover"
  | "fade";

export interface WorldChange {
  concept_id: string;
  kind: WorldChangeKind;
  /** landmark size when `kind` is `landmark`, from the concept's understanding */
  stage?: 1 | 2 | 3;
}

/** loudest news first, so a capped sound budget spends itself on what matters */
export const WORLD_CHANGE_PRIORITY: WorldChangeKind[] = ["explode", "recover", "master", "landmark", "upgrade", "hatch", "sprout", "grow", "fade"];

function landmarkStage(height: number): 1 | 2 | 3 {
  return height < 0.45 ? 1 : height < 0.75 ? 2 : 3;
}

/**
 * What actually happened between two payloads, in the island's own words (a sprout came up, a
 * landmark was built, a resident was knocked over). The first paint has no previous world and
 * therefore no changes: arriving is not news.
 */
export function describeChanges(previous: WorldResponse | null, next: WorldResponse): WorldChange[] {
  if (!previous) return [];
  const before = new Map(previous.regions.map((r) => [r.concept_id, r]));
  const out: WorldChange[] = [];
  for (const region of next.regions) {
    const old = before.get(region.concept_id);
    const id = region.concept_id;
    if (!old) {
      if (spotStateOf(region.semantic_state) === 1) out.push({ concept_id: id, kind: "sprout" });
      continue;
    }
    const s0 = spotStateOf(old.semantic_state);
    const s1 = spotStateOf(region.semantic_state);
    const rise = region.terrain_height - old.terrain_height;
    if (s0 === 0 && s1 === 1) out.push({ concept_id: id, kind: "sprout" });
    else if (s0 < 2 && s1 === 2) out.push({ concept_id: id, kind: "landmark", stage: landmarkStage(region.terrain_height) });
    else if (s0 === 2 && s1 === 2 && rise > 0.1) out.push({ concept_id: id, kind: "upgrade" });
    else if (rise > 0.02) out.push({ concept_id: id, kind: "grow" });
    if (old.semantic_state !== "mastered" && region.semantic_state === "mastered") out.push({ concept_id: id, kind: "master" });

    const c0 = old.creature_state;
    const c1 = region.creature_state;
    if (c0 === c1) continue;
    if (c0 === "unhatched") out.push({ concept_id: id, kind: "hatch" });
    else if (c1 === "weak") out.push({ concept_id: id, kind: "explode" });
    else if (c0 === "weak") out.push({ concept_id: id, kind: "recover" });
    else if (c1 === "sleepy") out.push({ concept_id: id, kind: "fade" });
  }
  return out;
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
