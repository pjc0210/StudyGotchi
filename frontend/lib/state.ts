/**
 * One place that says how a concept state looks and reads.
 *
 * The engine owns the state itself (`ConceptState`, nine values) and the
 * island's smaller vocabulary (`SemanticState`, seven). This module owns how
 * each is painted and named in the two skins, so a label or colour bug has
 * exactly one home. The CSS `--state-*` tokens mirror the dark values.
 */

import type { components } from "@/lib/api/schema";
import type { ConceptState } from "@/lib/types";

export type SemanticState = components["schemas"]["WorldRegionOut"]["semantic_state"];
export type CreatureState = components["schemas"]["WorldRegionOut"]["creature_state"];

export type Skin = "dark" | "paper";

export type StateIcon = "check" | "trend" | "alert" | "question" | "clock" | "sprout" | "dot";

export interface StatePresentation {
  label: string;
  /** Hex colour for the requested skin. */
  color: string;
  /** CSS custom property that carries the dark colour, for stylesheet use. */
  token: `--state-${ConceptState}`;
  icon: StateIcon;
  /** How solid the mark reads: 1 filled, 0 an outline. */
  fill: number;
  dashed: boolean;
}

interface Row {
  label: string;
  dark: string;
  paper: string;
  icon: StateIcon;
  fill: number;
  dashed?: boolean;
}

const ROWS: Record<ConceptState, Row> = {
  mastered: { label: "Mastered", dark: "#34d399", paper: "#4f8a4a", icon: "check", fill: 0.95 },
  strong: { label: "Strong", dark: "#6ec89a", paper: "#8fbf6a", icon: "check", fill: 0.75 },
  developing: { label: "Developing", dark: "#60a5fa", paper: "#8fb8d8", icon: "trend", fill: 0.5 },
  uncertain: { label: "Uncertain", dark: "#a3b1c2", paper: "#b9a7c9", icon: "question", fill: 0.3 },
  exposed: { label: "Seen", dark: "#8b949e", paper: "#b9a7c9", icon: "dot", fill: 0.22 },
  struggling: { label: "Struggling", dark: "#f5a524", paper: "#d98b7e", icon: "alert", fill: 0.35 },
  fragile: { label: "Fragile", dark: "#f87171", paper: "#d98b7e", icon: "alert", fill: 0.35 },
  stale: { label: "Fading", dark: "#94a3b8", paper: "#c9b58a", icon: "clock", fill: 0.22 },
  frontier: { label: "Not yet reached", dark: "#5f6a74", paper: "#a9a29a", icon: "sprout", fill: 0, dashed: true },
};

export const CONCEPT_STATES = Object.keys(ROWS) as ConceptState[];

export function statePresentation(state: ConceptState | SemanticState, skin: Skin = "dark"): StatePresentation {
  const row = ROWS[state as ConceptState] ?? ROWS.exposed;
  return {
    label: row.label,
    color: skin === "paper" ? row.paper : row.dark,
    token: `--state-${(state in ROWS ? state : "exposed") as ConceptState}`,
    icon: row.icon,
    fill: row.fill,
    dashed: row.dashed ?? false,
  };
}

/** The island's vocabulary is a subset of the graph's; the engine maps the rest. */
export function toSemanticState(state: ConceptState): SemanticState {
  switch (state) {
    case "uncertain":
      return "exposed";
    case "fragile":
      return "struggling";
    default:
      return state;
  }
}

/** Sprout, landmark, or nothing: what a state builds on the island. */
export function spotStateOf(state: SemanticState): 0 | 1 | 2 {
  switch (state) {
    case "frontier":
      return 0;
    case "strong":
    case "mastered":
    case "stale":
      return 2;
    default:
      return 1;
  }
}

export const RESIDENT_LABEL: Record<CreatureState, string> = {
  unhatched: "No resident yet",
  weak: "Knocked over",
  normal: "Resident",
  evolved: "Evolved resident",
  ascended: "Ascended resident",
  sleepy: "Sleepy resident",
};

/** Colour and label tables for callers that index by state (canvas draw loops). */
export function stateTable<T>(pick: (p: StatePresentation) => T, skin: Skin = "dark"): Record<ConceptState, T> {
  return Object.fromEntries(CONCEPT_STATES.map((s) => [s, pick(statePresentation(s, skin))])) as Record<ConceptState, T>;
}
