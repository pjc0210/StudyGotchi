"use client";

import { LENSES, type Lens } from "@/lib/graphModel";
import { emit } from "@/lib/audio/events";

export function GraphLenses({ lens, onChange }: { lens: Lens; onChange: (l: Lens) => void }) {
  return (
    <div role="group" aria-label="Graph lens" className="sg-seg">
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
    </div>
  );
}
