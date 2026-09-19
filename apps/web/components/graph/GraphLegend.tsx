"use client";

import { Sparkles } from "lucide-react";
import { STATE_STYLES } from "@/lib/graph";
import type { ConceptState } from "@/lib/types";

const SHOWN: ConceptState[] = [
  "mastered",
  "strong",
  "developing",
  "uncertain",
  "struggling",
  "fragile",
  "frontier",
];

export function GraphLegend({ hiddenCount }: { hiddenCount: number }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-line bg-surface/90 px-3 py-2.5 backdrop-blur">
      <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5" style={{ maxWidth: 420 }}>
        {SHOWN.map((state) => {
          const s = STATE_STYLES[state];
          return (
            <li key={state} className="flex items-center gap-1.5 text-[11px] text-ink-dim">
              <span
                aria-hidden
                className="h-2 w-2 rounded-[2px]"
                style={{
                  background: s.dashed ? "transparent" : `var(${s.token})`,
                  border: s.dashed ? `1px dashed var(${s.token})` : "none",
                }}
              />
              {s.label}
            </li>
          );
        })}
        <li className="flex items-center gap-1.5 text-[11px] text-ink-dim">
          <Sparkles size={10} className="text-brand" aria-hidden />
          Personal
        </li>
      </ul>
      {hiddenCount > 0 ? (
        <p className="mt-2 border-t border-line pt-2 text-[11px] text-ink-faint">
          {hiddenCount} course concepts not yet reached are hidden.
        </p>
      ) : null}
    </div>
  );
}
