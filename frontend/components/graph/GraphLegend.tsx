"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { STATE_COLOR, STATE_LABEL } from "@/lib/graphTheme";
import type { ConceptState } from "@/lib/types";

const STATES: ConceptState[] = [
  "mastered",
  "strong",
  "developing",
  "uncertain",
  "struggling",
  "fragile",
  "frontier",
];

export function GraphLegend({ hiddenCount }: { hiddenCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-line bg-surface/85 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-ink-dim transition-colors hover:text-ink"
      >
        Legend
        <ChevronDown
          size={11}
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-line px-2.5 py-2">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
            {STATES.map((s) => (
              <li key={s} className="flex items-center gap-1.5 text-[11px] text-ink-dim">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: s === "frontier" ? "transparent" : STATE_COLOR[s],
                    border: `1px ${s === "frontier" ? "dashed" : "solid"} ${STATE_COLOR[s]}`,
                  }}
                />
                {STATE_LABEL[s]}
              </li>
            ))}
          </ul>

          <div className="mt-2 border-t border-line pt-2">
            <p className="text-[11px] text-ink-faint">
              <span className="text-ink-dim">●</span> knowledge{"  "}
              <span className="text-ink-dim">○</span> source material
            </p>
            {hiddenCount > 0 ? (
              <p className="mt-1 text-[11px] text-ink-faint">
                {hiddenCount} concepts not yet reached are hidden.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
