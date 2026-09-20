"use client";

import {
  FileText,
  Network,
  Route,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Section = "knowledge" | "files" | "gaps" | "study";

const ITEMS: { id: Section; label: string; icon: LucideIcon }[] = [
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
      className="flex w-[184px] shrink-0 flex-col gap-0.5 border-r border-line bg-[#0c1018] px-2.5 py-3 2xl:w-[190px]"
    >
      <div className="mb-5 flex items-center gap-2 px-2.5 pt-1 text-[13px] font-semibold tracking-tight text-ink">
        <Sparkles size={16} strokeWidth={1.7} className="text-white" aria-hidden />
        StudyGotchi
      </div>
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
                ? "bg-white/[0.075] text-ink"
                : "text-ink-dim hover:bg-raised/60 hover:text-ink"
            }`}
          >
            <Icon
              size={15}
              strokeWidth={1.75}
              className={isActive ? "text-white" : "text-ink-faint group-hover:text-ink-dim"}
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
