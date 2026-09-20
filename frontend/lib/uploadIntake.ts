/**
 * What the site accepts as an upload and how it labels the choices.
 *
 * The dialog in the graph shell and the box on the island are two skins over
 * this one policy, so "ZIP works here but not there" cannot happen.
 */

import type { ArtifactType } from "./types";

export const ACCEPTED_EXTENSIONS = [".pdf", ".zip", ".png", ".jpg", ".jpeg", ".webp", ".md", ".txt", ".docx"] as const;

/** The `accept` attribute for a file input, derived from the same list. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

/** Human copy naming what is accepted. */
export const ACCEPT_COPY = "PDF, image, text, Word, or ZIP";

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/** A ZIP is a bundle of course files; anything else keeps the chosen type. */
export function artifactTypeFor(file: File, chosen: ArtifactType): ArtifactType {
  return file.name.toLowerCase().endsWith(".zip") ? "course_bundle" : chosen;
}

/** The kinds of their own work a student can add from the island. */
export const STUDENT_WORK_KINDS: { id: ArtifactType; label: string }[] = [
  { id: "homework", label: "Problem set" },
  { id: "quiz", label: "Quiz" },
  { id: "exam", label: "Exam" },
  { id: "student_notes", label: "My notes" },
  { id: "handwritten_work", label: "Handwritten work (photo)" },
  { id: "worked_solution", label: "Worked solution" },
];
