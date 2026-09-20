"use client";

import type { ArtifactType, SourceOrigin } from "@/lib/types";

const ORIGINS: { id: SourceOrigin; label: string }[] = [
  { id: "instructor", label: "Instructor" },
  { id: "ta", label: "TA" },
  { id: "student_self", label: "My Material" },
  { id: "classmate", label: "Classmate" },
  { id: "external", label: "External" },
];

const ARTIFACTS: { id: ArtifactType; label: string }[] = [
  { id: "lecture", label: "Lecture" },
  { id: "reading", label: "Reading" },
  { id: "syllabus", label: "Syllabus" },
  { id: "study_guide", label: "Study Guide" },
  { id: "homework", label: "Homework" },
  { id: "quiz", label: "Quiz" },
  { id: "exam", label: "Exam" },
  { id: "solution_key", label: "Solution Key" },
  { id: "student_notes", label: "Student Notes" },
  { id: "classmate_notes", label: "Classmate Notes" },
  { id: "worked_solution", label: "Worked Solution" },
  { id: "handwritten_work", label: "Handwritten Work" },
  { id: "photo", label: "Photo" },
  { id: "other", label: "Other" },
];

/** Sensible artifact default for a given origin, per the product spec. */
export function defaultArtifactFor(origin: SourceOrigin): ArtifactType {
  switch (origin) {
    case "student_self":
      return "student_notes";
    case "classmate":
      return "classmate_notes";
    case "instructor":
    case "ta":
      return "lecture";
    default:
      return "other";
  }
}

export function SourceClassifier({
  origin,
  artifactType,
  onOriginChange,
  onArtifactChange,
}: {
  origin: SourceOrigin;
  artifactType: ArtifactType;
  onOriginChange: (o: SourceOrigin) => void;
  onArtifactChange: (a: ArtifactType) => void;
}) {
  return (
    <div className="space-y-3.5">
      <fieldset>
        <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Where did this come from?
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {ORIGINS.map((o) => {
            const on = origin === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  onOriginChange(o.id);
                  onArtifactChange(defaultArtifactFor(o.id));
                }}
                className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                  on
                    ? "border-ink bg-ink text-canvas"
                    : "border-line-strong text-ink-dim hover:border-ink-faint hover:text-ink"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="artifact-type"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint"
        >
          What kind of material?
        </label>
        <select
          id="artifact-type"
          value={artifactType}
          onChange={(e) => onArtifactChange(e.target.value as ArtifactType)}
          className="h-8 w-full rounded-md border border-line-strong bg-raised px-2 text-[13px] text-ink"
        >
          {ARTIFACTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-ink-faint">
          ZIP archives are treated as course bundles and expanded server-side.
        </p>
      </div>
    </div>
  );
}
