import { Minus, Plus } from "lucide-react";
import type { Evidence } from "@/lib/types";
import { OriginChip } from "@/components/common/StatusBadge";

const KIND_LABEL: Record<Evidence["kind"], string> = {
  understanding: "understanding evidence",
};

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return (
      <p className="text-[13px] text-ink-faint">No evidence recorded yet.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {evidence.map((e) => {
        const positive = e.polarity === "positive";
        const negative = e.polarity === "negative";
        return (
          <li
            key={e.id}
            className="rounded-md border border-line bg-raised/60 px-2.5 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] text-ink">{e.label}</span>
              {e.detail ? (
                <span className="font-mono text-[12px] tabular-nums text-ink-dim">
                  {e.detail}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {negative || positive ? (
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                    positive ? "text-state-mastered" : "text-state-struggling"
                  }`}
                >
                  {positive ? (
                    <Plus size={9} aria-hidden />
                  ) : (
                    <Minus size={9} aria-hidden />
                  )}
                  {positive ? "Positive" : "Negative"}
                </span>
              ) : null}
              <span className="text-[10px] text-ink-faint">
                {KIND_LABEL[e.kind]}
              </span>
              <span className="ml-auto">
                {e.source ? (
                  <OriginChip origin={e.source.origin} />
                ) : (
                  <span className="text-[10px] text-ink-faint">
                    Source not linked
                  </span>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
