import { stateStyle } from "@/lib/graph";
import { formatScore } from "@/lib/graph";
import type { ConceptNode } from "@/lib/types";

/** Compact stat: number leads, a hairline bar carries the shape. */
function Stat({
  label,
  value,
  tone,
  warn,
}: {
  label: string;
  value: number | null;
  tone?: string;
  warn?: boolean;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-ink-faint">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-ink">
          {formatScore(value)}
        </span>
      </div>
      <div
        className="mt-1 h-[2px] w-full overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label={label}
        aria-valuenow={value === null ? undefined : Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: tone ?? (warn ? "var(--state-fragile)" : "var(--color-ink-faint)"),
          }}
        />
      </div>
    </div>
  );
}

export function MasteryBreakdown({ concept }: { concept: ConceptNode }) {
  const tone = `var(${stateStyle(concept.state).token})`;

  return (
    <div className="space-y-3">
      {/* Mastery is the headline number; the rest support it. */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-ink-dim">Mastery</span>
          <span
            className="font-mono text-[22px] leading-none tabular-nums"
            style={{ color: tone }}
          >
            {formatScore(concept.mastery)}
          </span>
        </div>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${(concept.mastery ?? 0) * 100}%`,
              background: tone,
            }}
          />
        </div>
        {concept.mastery === null ? (
          <p className="mt-1 text-[11px] text-ink-faint">No evidence yet</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Stat label="Familiarity" value={concept.familiarity} />
        <Stat label="Confidence" value={concept.confidence} />
        <Stat label="Readiness" value={concept.readiness} />
        <Stat label="Fragility" value={concept.fragility} warn />
      </div>

      {concept.fragility > 0.5 ? (
        <p className="text-[11px] leading-snug text-state-fragile">
          High fragility: this rests on weak foundations.
        </p>
      ) : null}
    </div>
  );
}
