import { formatScore } from "@/lib/graph";
import { relativeDate } from "@/lib/conceptAnalysis";
import type { ConceptNode, UnderstandingEntry } from "@/lib/types";

export function UnderstandingBreakdown({
  concept,
  detail,
}: {
  concept: ConceptNode;
  detail: UnderstandingEntry | null;
}) {
  const value = concept.understanding;
  const percent = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  const positive = detail?.positive_evidence ?? 0;
  const negative = detail?.negative_evidence ?? 0;
  const balance = positive + negative;
  const positivePercent = balance > 0 ? (positive / balance) * 100 : 0;
  const formatEvidence = (amount: number | undefined) =>
    (amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-ink-dim">Understanding</span>
        <span className="font-mono text-[22px] leading-none tabular-nums text-ink">
          {formatScore(value)}
        </span>
      </div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {value === null ? (
        <p className="mt-1 text-[11px] text-ink-faint">
          Not enough evidence yet
        </p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          <div>
            <dt className="text-ink-faint">Positive evidence</dt>
            <dd className="font-mono text-[12px] text-ink">
              {formatEvidence(detail?.positive_evidence)}
            </dd>
          </div>
          <div
            className="col-span-2 h-[2px] overflow-hidden rounded-full bg-line"
            aria-label="Evidence balance"
          >
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${positivePercent}%` }}
            />
          </div>
          <div>
            <dt className="text-ink-faint">Negative evidence</dt>
            <dd className="font-mono text-[12px] text-ink">
              {formatEvidence(detail?.negative_evidence)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Last practiced</dt>
            <dd className="text-ink">
              {relativeDate(
                detail?.last_practiced_at ?? null,
                "No practice recorded",
              )}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Last evidence</dt>
            <dd className="text-ink">
              {relativeDate(
                detail?.last_evidence_at ?? null,
                "No evidence recorded",
              )}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
