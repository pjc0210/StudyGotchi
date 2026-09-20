/**
 * Canvas palette. Mirrors the CSS tokens in globals.css - canvas cannot read
 * CSS custom properties per-draw cheaply, so the values live here once.
 */

import { stateTable } from "./state";
import type { ArtifactType, ConceptState, SourceOrigin } from "./types";

export interface SpacePalette {
  /** The sky the stars sit on; also the halo behind labels. */
  halo: string;
  star: string;
  starDim: string;
  /** Mastered and strong ideas keep the lamp. */
  lamp: string;
  /** Struggling and fragile ideas carry the one live colour. */
  live: string;
  edge: string;
  edgeStrong: string;
  edgeResource: string;
  label: string;
  labelDim: string;
  labelStrong: string;
  /** Cluster tints: world colours, faint, for the dust behind a topic. */
  nebula: string[];
}

/**
 * Space follows the globe's sky: cream stars on indigo at night, ink stars on
 * paper by day. The world colours are the only accents.
 */
export function spacePalette(theme: "light" | "dark"): SpacePalette {
  if (theme === "dark") {
    return {
      halo: "#17152c",
      star: "#fff6df",
      starDim: "rgba(255, 246, 223, 0.42)",
      lamp: "#ffe7a3",
      live: "#e88a8a",
      edge: "rgba(255, 246, 223, 0.16)",
      edgeStrong: "rgba(255, 246, 223, 0.62)",
      edgeResource: "rgba(185, 216, 234, 0.14)",
      label: "#efe6d3",
      labelDim: "rgba(239, 230, 211, 0.66)",
      labelStrong: "#fff6df",
      nebula: ["#8fc9d8", "#c9a2e6", "#e88a8a", "#ffe7a3", "#a9cfe8", "#b7e7b0"],
    };
  }
  return {
    halo: "#f4f0e5",
    star: "#17151d",
    starDim: "rgba(23, 21, 29, 0.42)",
    lamp: "#d9a92e",
    live: "#dc756f",
    edge: "rgba(23, 21, 29, 0.14)",
    edgeStrong: "rgba(23, 21, 29, 0.55)",
    edgeResource: "rgba(23, 21, 29, 0.1)",
    label: "#29303a",
    labelDim: "rgba(41, 48, 58, 0.66)",
    labelStrong: "#17151d",
    nebula: ["#8fc9d8", "#c9a2e6", "#e88a8a", "#f0d77d", "#a9cfe8", "#9fd39a"],
  };
}

export const CANVAS = {
  background: "transparent",
  edge: "rgba(23, 21, 29, 0.14)",
  edgeStrong: "rgba(23, 21, 29, 0.55)",
  edgeResource: "rgba(23, 21, 29, 0.1)",
  label: "#29303a",
  labelDim: "rgba(41, 48, 58, 0.66)",
  labelStrong: "#17151d",
  halo: "#f4f0e5",
  focus: "#29303a",
  brand: "#29303a",
  surface: "#ffffff",
  resourceFill: "#ffffff",
  resourceStroke: "#29303a",
} as const;

// State colour, fill and label come from lib/state so the graph, the island
// and the badges can never disagree about a state.
export const STATE_COLOR: Record<ConceptState, string> = stateTable((p) => p.color);
export const STATE_FILL_ALPHA: Record<ConceptState, number> = stateTable((p) => p.fill);
export const STATE_LABEL: Record<ConceptState, string> = stateTable((p) => p.label);

export const ORIGIN_LABEL: Record<SourceOrigin, string> = {
  instructor: "Instructor",
  ta: "TA",
  student_self: "My Material",
  classmate: "Classmate",
  external: "External",
};

export const ARTIFACT_LABEL: Record<ArtifactType, string> = {
  lecture: "Lecture",
  reading: "Reading",
  syllabus: "Syllabus",
  study_guide: "Study Guide",
  homework: "Homework",
  quiz: "Quiz",
  exam: "Exam",
  solution_key: "Solution Key",
  student_notes: "Student Notes",
  classmate_notes: "Classmate Notes",
  worked_solution: "Worked Solution",
  handwritten_work: "Handwritten Work",
  photo: "Photo",
  course_bundle: "Course Bundle",
  other: "Other",
};
