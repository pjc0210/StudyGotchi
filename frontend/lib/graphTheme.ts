/**
 * Canvas palette. Mirrors the CSS tokens in globals.css - canvas cannot read
 * CSS custom properties per-draw cheaply, so the values live here once.
 */

import { stateTable } from "./state";
import type { ArtifactType, ConceptState, SourceOrigin } from "./types";

export const CANVAS = {
  background: "#07111f",
  edge: "#cbd5e11c",
  edgeStrong: "#e9f1ff8c",
  edgeResource: "#cbd5e112",
  label: "#eef1f5",
  labelDim: "#aeb7c4",
  labelStrong: "#ffffff",
  halo: "#07111f",
  focus: "#ffffff",
  brand: "#f0b429",
  surface: "#15181c",
  resourceFill: "#1b2026",
  resourceStroke: "#687583",
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
