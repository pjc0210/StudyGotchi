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
            if (lens !== l.id) emit({ type: "ui", kind: "tap" });
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
