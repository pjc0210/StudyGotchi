/**
 * Canvas palette. Mirrors the CSS tokens in globals.css - canvas cannot read
 * CSS custom properties per-draw cheaply, so the values live here once.
 */

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

/** One hue per backend state. Never computed here - the engine assigns it. */
export const STATE_COLOR: Record<ConceptState, string> = {
  mastered: "#34d399",
  strong: "#6ec89a",
  developing: "#60a5fa",
  uncertain: "#a3b1c2",
  exposed: "#8b949e",
  struggling: "#f5a524",
  fragile: "#f87171",
  stale: "#94a3b8",
  frontier: "#5f6a74",
};

/**
 * How solidly a concept reads. Consolidated knowledge looks filled in;
 * unreached knowledge is an outline. This is a second, non-colour channel.
 */
export const STATE_FILL_ALPHA: Record<ConceptState, number> = {
  mastered: 0.95,
  strong: 0.75,
  developing: 0.5,
  uncertain: 0.3,
  exposed: 0.22,
  struggling: 0.35,
  fragile: 0.35,
  stale: 0.22,
  frontier: 0.0,
};

export const STATE_LABEL: Record<ConceptState, string> = {
  mastered: "Mastered",
  strong: "Strong",
  developing: "Developing",
  uncertain: "Uncertain",
  exposed: "Exposed",
  struggling: "Struggling",
  fragile: "Fragile",
  stale: "Stale",
  frontier: "Frontier",
};

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
