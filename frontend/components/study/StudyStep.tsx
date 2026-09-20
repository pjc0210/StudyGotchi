"use client";

import { ArrowDown } from "lucide-react";
import { formatScore } from "@/lib/graph";
import type { StudyStep as Step } from "@/lib/types";
import { OriginChip } from "@/components/common/StatusBadge";

export function StudyStepCard({
  step,
  isLast,
  selected,
  onSelect,
}: {
  step: Step;
  isLast: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
          selected
            ? "border-focus bg-raised"
            : "border-line bg-raised/40 hover:border-line-strong hover:bg-raised/70"
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Step {step.order}
          </span>
          <span className="font-mono text-[12px] tabular-nums text-ink-dim">
            Mastery {formatScore(step.mastery)}
          </span>
        </div>

        <p className="mt-1 text-[13px] font-medium text-ink">{step.concept_name}</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-dim">{step.reason}</p>

        {step.resources.length > 0 ? (
          <div className="mt-2.5 border-t border-line pt-2.5">
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-ink-faint">
              Start with
            </p>
            <ul className="space-y-1">
              {step.resources.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-[12px] text-ink">{r.title}</span>
                  <OriginChip origin={r.origin} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </button>

      {!isLast ? (
        <div className="flex justify-center py-1" aria-hidden>
          <ArrowDown size={13} className="text-ink-faint" />
        </div>
      ) : null}
    </li>
  );
}
