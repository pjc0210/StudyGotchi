"use client";

import { Maximize2 } from "lucide-react";
import { STATE_FILTERS, type GraphFilters, type ViewFilter } from "@/lib/graph";
import { STATE_STYLES } from "@/lib/graph";

const VIEWS: { id: ViewFilter; label: string }[] = [
  { id: "mine", label: "My Knowledge" },
  { id: "frontier", label: "Frontier" },
  { id: "personal", label: "Personal" },
];

export function GraphControls({
  filters,
  onChange,
  onFit,
  shown,
  total,
}: {
  filters: GraphFilters;
  onChange: (f: GraphFilters) => void;
  onFit: () => void;
  shown: number;
  total: number;
}) {
  const toggleState = (state: (typeof STATE_FILTERS)[number]) => {
    const next = filters.states.includes(state)
      ? filters.states.filter((s) => s !== state)
      : [...filters.states, state];
    onChange({ ...filters, states: next });
  };

  return (
    <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="View"
        className="flex rounded-md border border-line bg-surface/90 p-0.5 backdrop-blur"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={filters.view === v.id}
            onClick={() => onChange({ ...filters, view: v.id })}
            className={`rounded px-2.5 py-[3px] text-[12px] transition-colors ${
              filters.view === v.id
                ? "bg-raised text-ink"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label="Filter by state"
        className="flex gap-1 rounded-md border border-line bg-surface/90 p-0.5 backdrop-blur"
      >
        {STATE_FILTERS.map((state) => {
          const on = filters.states.includes(state);
          return (
            <button
              key={state}
              type="button"
              aria-pressed={on}
              onClick={() => toggleState(state)}
              className="flex items-center gap-1.5 rounded px-2 py-[3px] text-[12px] transition-colors"
              style={{
                background: on ? `color-mix(in oklab, var(${STATE_STYLES[state].token}) 16%, transparent)` : "transparent",
                color: on ? `var(${STATE_STYLES[state].token})` : "var(--color-ink-dim)",
              }}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: `var(${STATE_STYLES[state].token})` }}
              />
              {STATE_STYLES[state].label}
            </button>
          );
        })}
      </div>

      <span className="text-[11px] tabular-nums text-ink-faint">
        {shown} of {total} shown
      </span>

      <button
        type="button"
        onClick={onFit}
        className="ml-auto flex h-[26px] items-center gap-1.5 rounded-md border border-line bg-surface/90 px-2.5 text-[12px] text-ink-dim backdrop-blur transition-colors hover:text-ink"
      >
        <Maximize2 size={12} aria-hidden />
        Reset view
      </button>
    </div>
  );
}
