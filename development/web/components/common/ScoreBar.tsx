import { formatScore } from "@/lib/kg/graph";

interface ScoreBarProps {
  label: string;
  value: number | null;
  /** CSS colour for the filled portion. Defaults to a neutral ink tone. */
  tone?: string;
  /** Fragility reads better inverted: high is bad. */
  invertTone?: boolean;
  hint?: string;
}

export function ScoreBar({ label, value, tone, invertTone, hint }: ScoreBarProps) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  const colour =
    tone ?? (invertTone ? "var(--state-fragile)" : "var(--color-ink-dim)");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink-dim">{label}</span>
        <span className="font-mono text-[13px] tabular-nums text-ink">
          {formatScore(value)}
        </span>
      </div>
      <div
        className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label={label}
        aria-valuenow={value === null ? undefined : Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={value === null ? "No data yet" : `${Math.round(pct)} percent`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: colour }}
        />
      </div>
      {hint ? <p className="mt-1 text-[11px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}
