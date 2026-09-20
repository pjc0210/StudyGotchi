"use client";

import {
  FileText,
  Globe,
  Network,
  Route,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Section = "world" | "knowledge" | "files" | "gaps" | "study";

const ITEMS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "world", label: "World", icon: Globe },
  { id: "knowledge", label: "Knowledge", icon: Network },
  { id: "files", label: "Files", icon: FileText },
  { id: "gaps", label: "Gaps", icon: TriangleAlert },
  { id: "study", label: "Study Plan", icon: Route },
];

export function Sidebar({
  active,
  onSelect,
  gapCount,
}: {
  active: Section;
  onSelect: (s: Section) => void;
  gapCount?: number;
}) {
  return (
    <nav
      aria-label="Sections"
      className="flex w-[196px] shrink-0 flex-col gap-0.5 border-r border-line bg-surface px-2.5 py-3"
    >
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isActive ? "page" : undefined}
            className={`group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors ${
              isActive
                ? "bg-raised text-ink"
                : "text-ink-dim hover:bg-raised/60 hover:text-ink"
            }`}
          >
            <Icon
              size={15}
              strokeWidth={1.75}
              className={isActive ? "text-brand" : "text-ink-faint group-hover:text-ink-dim"}
              aria-hidden
            />
            <span className="flex-1 text-left">{label}</span>
            {id === "gaps" && gapCount ? (
              <span className="rounded-full bg-state-struggling/15 px-1.5 text-[10px] font-medium tabular-nums text-state-struggling">
                {gapCount}
              </span>
            ) : null}
          </button>
        );
      })}

      <div className="mt-auto px-2.5 pb-1 pt-4">
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Your personal graph, not the syllabus.
        </p>
      </div>
    </nav>
  );
}
