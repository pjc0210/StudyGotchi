export type BiomeId = "forest" | "meadow" | "ice" | "city" | "sand";

export type SpotState = 0 | 1 | 2;

export type CharacterKind = "resident" | "wisp";

export type CharacterState = "idle" | "evolved" | "exploded" | "recovered" | "faded";

export interface PlaceOut {
  id: string;
  label: string;
  biome: BiomeId;
  concept_ids: string[];
}

export interface SpotOut {
  concept_id: string;
  place_id: string;
  name: string;
  state: SpotState;
  height: number;
  cracked: boolean;
  discovery_state: string;
  citation: string | null;
}

export interface CharacterOut {
  id: string;
  kind: CharacterKind;
  place_id: string;
  label: string;
  state: CharacterState;
  mean_outcome: number | null;
  concept_ids: string[];
  occurred_at: string;
}

export interface WorldOut {
  course_id: string;
  student_id: string;
  version: string;
  seed: string;
  hidden_concept_count: number;
  places: PlaceOut[];
  spots: SpotOut[];
  characters: CharacterOut[];
}

export interface WorldCanvasProps {
  world: WorldOut;
  readOnly?: boolean;
  selectedId: string | null;
  onSelect: (conceptId: string | null) => void;
}
