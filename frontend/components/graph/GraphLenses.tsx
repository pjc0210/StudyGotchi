"use client";

import { LENSES, type Lens } from "@/lib/graphModel";

export function GraphLenses({
  lens,
  onChange,
}: {
  lens: Lens;
  onChange: (l: Lens) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Graph lens"
      className="flex rounded-full border border-white/10 bg-[#101722]/85 p-1 shadow-lg shadow-black/20 backdrop-blur-sm"
    >
      {LENSES.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={lens === l.id}
          title={l.hint}
          onClick={() => onChange(l.id)}
          className={`rounded-full px-3 py-[6px] text-[12px] transition-colors ${
            lens === l.id
              ? "bg-white/[0.13] text-white"
              : "text-ink-dim hover:text-white"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
