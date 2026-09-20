import { ScoreBar } from "@/components/common/ScoreBar";
import { stateStyle } from "@/lib/graph";
import type { ConceptNode } from "@/lib/types";

export function MasteryBreakdown({ concept }: { concept: ConceptNode }) {
  const tone = `var(${stateStyle(concept.state).token})`;

  return (
    <div className="space-y-3">
      <ScoreBar
        label="Mastery"
        value={concept.mastery}
        tone={tone}
        hint={concept.mastery === null ? "No evidence yet" : undefined}
      />
      <ScoreBar label="Familiarity" value={concept.familiarity} />
      <ScoreBar label="Confidence" value={concept.confidence} />
      <ScoreBar label="Readiness" value={concept.readiness} />
      <ScoreBar
        label="Fragility"
        value={concept.fragility}
        invertTone
        hint={
          concept.fragility > 0.5
            ? "High: this rests on weak foundations"
            : undefined
        }
      />
    </div>
  );
}
