"use client";

import {
  ArrowLeft,
  FileText,
  Network,
  Route,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

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

      <Link
        href="/"
        className="mb-3 flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-ink-dim transition-colors hover:bg-raised/60 hover:text-ink"
      >
        <ArrowLeft size={15} strokeWidth={1.75} className="text-ink-faint" aria-hidden />
        <span className="flex-1 text-left">Dashboard</span>
      </Link>
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

      <div className="mt-auto flex flex-col gap-2 px-2.5 pb-1 pt-4">
        <Link
          // Friends lives in the separate frontend app, not this dashboard -
          // a plain route wouldn't resolve here. Dev-only absolute link.
          href="http://localhost:3000/friends"
          className="group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-ink-dim transition-colors hover:bg-raised/60 hover:text-ink"
        >
          <Users
            size={15}
            strokeWidth={1.75}
            className="text-ink-faint group-hover:text-ink-dim"
            aria-hidden
          />
          <span className="flex-1 text-left">Friends</span>
        </Link>
        <p className="px-2.5 text-[11px] leading-relaxed text-ink-faint">
          Your personal graph, not the syllabus.
        </p>
      </div>
    </nav>
  );
}
