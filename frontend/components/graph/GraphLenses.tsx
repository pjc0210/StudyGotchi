"use client";

import type { ReactNode } from "react";
import { LENSES, type Lens } from "@/lib/graphModel";
import { emit } from "@/lib/audio/events";

export function GraphLenses({
  lens,
  onChange,
  extra,
}: {
  lens: Lens;
  onChange: (l: Lens) => void;
  extra?: ReactNode;
}) {
  return (
    <div role="group" aria-label="Information view" className="sg-seg">
      {LENSES.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={lens === l.id}
          title={l.hint}
          className="sg-seg-item"
          onClick={() => {
            // Weak Areas gets its own low tone instead of the tap: the sky is about to dim.
            if (lens !== l.id) emit(l.id === "weak" ? { type: "lens-weak" } : { type: "ui", kind: "tap" });
            onChange(l.id);
          }}
        >
          {l.label}
        </button>
      ))}
      {extra}
    </div>
  );
}
