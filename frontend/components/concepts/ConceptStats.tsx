import { ScoreBar } from "@/components/common/ScoreBar";
import type { ConceptNode } from "@/lib/types";

/**
 * What a student actually wants to know about a concept at a glance:
 * how well they know it, how much the course weighs it, and how relevant
 * it is to their own path through the material. Deliberately not raw
 * evidence counts (positive/negative event tallies read as internal
 * bookkeeping, not something a learner acts on) - importance and personal
 * relevance are what make a concept worth attention or not.
 */
export function ConceptStats({ concept }: { concept: ConceptNode }) {
  return (
    <div className="space-y-3">
      <ScoreBar label="Understanding" value={concept.understanding} />
      <ScoreBar
        label="Course importance"
        value={concept.importance}
        tone="var(--color-brand, #f0b429)"
      />
      <ScoreBar
        label="Personal relevance"
        value={concept.personal_relevance}
        hint="How closely this connects to what you've actually worked with."
      />
    </div>
  );
}
