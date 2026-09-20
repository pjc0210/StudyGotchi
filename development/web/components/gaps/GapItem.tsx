"use client";

import { formatScore } from "@/lib/kg/graph";
import type { Gap, GapAction } from "@/lib/kg/types";

const ACTION_TONE: Record<GapAction, string> = {
  STUDY: "var(--state-struggling)",
  DIAGNOSE: "var(--state-developing)",
  REVIEW: "var(--state-stale)",
  OPTIONAL: "var(--state-exposed)",
};

function priorityLabel(priority: number): string {
  if (priority >= 0.75) return "High";
  if (priority >= 0.45) return "Medium";
  return "Low";
}

export function GapItem({
  gap,
  index,
  selected,
  onSelect,
}: {
  gap: Gap;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = ACTION_TONE[gap.action] ?? ACTION_TONE.OPTIONAL;

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
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[12px] tabular-nums text-ink-faint">
            {index + 1}.
          </span>
          <span className="flex-1 text-[13px] font-medium text-ink">
            {gap.concept_name}
          </span>
          <span
            className="rounded px-1.5 py-[1px] text-[10px] font-semibold tracking-wide"
            style={{
              color: tone,
              background: `color-mix(in oklab, ${tone} 14%, transparent)`,
            }}
          >
            {gap.action}
          </span>
        </div>

        <dl className="mt-2.5 flex gap-4 pl-5">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-ink-faint">
              Understanding
            </dt>
            <dd className="font-mono text-[13px] tabular-nums text-ink">
              {formatScore(gap.understanding)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-ink-faint">
              Priority
            </dt>
            <dd className="text-[13px] text-ink">
              {priorityLabel(gap.priority)}
            </dd>
          </div>
        </dl>

        <p className="mt-2 pl-5 text-[12px] leading-relaxed text-ink-dim">
          {gap.reason}
        </p>
      </button>
    </li>
  );
}
