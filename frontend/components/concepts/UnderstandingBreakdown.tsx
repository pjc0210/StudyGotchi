import { formatScore } from "@/lib/graph";
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
              {detail?.positive_evidence ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Negative evidence</dt>
            <dd className="font-mono text-[12px] text-ink">
              {detail?.negative_evidence ?? 0}
            </dd>
          </div>
          {detail?.last_practiced_at ? (
            <div className="col-span-2">
              <dt className="text-ink-faint">Last practiced</dt>
              <dd className="text-ink">
                {new Date(detail.last_practiced_at).toLocaleDateString()}
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
}
