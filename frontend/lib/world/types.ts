import type { components } from "@/lib/api/schema";

/** The engine's world payload, exactly as `GET .../world` returns it. */
export type WorldResponse = components["schemas"]["WorldResponse"];
export type WorldRegion = components["schemas"]["WorldRegionOut"];
export type SemanticState = WorldRegion["semantic_state"];
export type CreatureState = WorldRegion["creature_state"];

export type BiomeId = "forest" | "meadow" | "ice" | "city" | "sand";

/** 0 hidden (frontier), 1 sprout (touched), 2 landmark (demonstrated). */
export type SpotState = 0 | 1 | 2;

export type CharacterState = "idle" | "evolved" | "exploded" | "recovered" | "faded";

export interface Vec2 {
  x: number;
  z: number;
}

export interface CanvasPlace {
  id: string;
  label: string;
  biome: BiomeId;
  concept_ids: string[];
  /** Centre on the island disc, in normalised units (-0.5..0.5). */
  center: Vec2;
}

export interface CanvasSpot {
  concept_id: string;
  place_id: string;
  name: string;
  state: SpotState;
  /** Terrain rise, 0..1, straight from the engine. */
  height: number;
  fog: number;
  cracked: boolean;
  semantic_state: SemanticState;
  cluster: string | null;
  /** World-space position on the island (y comes from the terrain). */
  position: Vec2;
}

export interface CanvasCharacter {
  id: string;
  place_id: string;
  concept_id: string;
  label: string;
  state: CharacterState;
  creature_state: CreatureState;
  /** Where the resident stands and returns to, in world space. */
  home: Vec2;
}

export interface CanvasWorld {
  course_id: string;
  student_id: string;
  version: string;
  seed: string;
  hidden_concept_count: number;
  places: CanvasPlace[];
  spots: CanvasSpot[];
  characters: CanvasCharacter[];
}

export interface HoverInfo {
  concept_id: string;
  name: string;
  semantic_state: SemanticState;
  height: number;
  cluster: string | null;
  resident: CreatureState | null;
}

export interface WorldCanvasProps {
  world: CanvasWorld;
  readOnly?: boolean;
  selectedId: string | null;
  onSelect: (conceptId: string | null) => void;
  /** Hover is controlled: the owner passes the id back in after `onHover`. */
  hoveredId: string | null;
  onHover: (conceptId: string | null) => void;
  /** Concepts to pulse because they just changed. */
  changedIds?: ReadonlySet<string>;
}
