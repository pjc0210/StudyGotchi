"use client";

import { Search, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { rankConceptMatches, stateStyle } from "@/lib/graph";
import { useStore } from "@/lib/store";
import { COURSE_NAME, USE_MOCK } from "@/lib/api";
import { StateBadge } from "@/components/common/StatusBadge";
import { AuthControls } from "@/components/auth/AuthControls";

export function TopBar({ onUploadClick }: { onUploadClick: () => void }) {
  const { graph, focusConcept } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const nodes = graph.data?.nodes ?? [];
  const matches = rankConceptMatches(nodes, query);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (id: string) => {
    focusConcept(id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-[22px] w-[22px] place-items-center rounded-[7px] bg-brand text-[12px] font-bold text-canvas"
        >
          S
        </span>
        <span className="text-[13px] font-semibold tracking-tight">StudyGotchi</span>
      </div>

      <div className="h-4 w-px bg-line" aria-hidden />

      <span className="truncate text-[13px] text-ink-dim">{COURSE_NAME}</span>

      {USE_MOCK ? (
        <span className="rounded border border-line-strong px-1.5 py-[1px] text-[10px] font-medium text-ink-faint">
          Mock data
        </span>
      ) : null}

      <div ref={boxRef} className="relative ml-auto w-[260px]">
        <Search
          size={13}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search concepts"
          aria-label="Search concepts"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) choose(matches[0].node.id);
          }}
          className="h-[30px] w-full rounded-md border border-line bg-raised pl-7 pr-12 text-[13px] text-ink placeholder:text-ink-faint focus:border-line-strong"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line-strong px-1 font-mono text-[10px] text-ink-faint">
          ⌘K
        </kbd>

        {open && query.trim() ? (
          <div className="sg-enter absolute right-0 top-[34px] z-50 w-[320px] overflow-hidden rounded-lg border border-line-strong bg-raised shadow-xl shadow-black/40">
            {matches.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-ink-faint">
                No concept matches “{query}”.
              </p>
            ) : (
              <ul>
                {matches.map(({ node }) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => choose(node.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-line/60"
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: `var(${stateStyle(node.state).token})` }}
                      />
                      <span className="flex-1 truncate text-[13px] text-ink">
                        {node.name}
                      </span>
                      <StateBadge state={node.state} size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onUploadClick}
        className="flex h-[30px] items-center gap-1.5 rounded-md bg-ink px-3 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
      >
        <Upload size={13} strokeWidth={2.25} aria-hidden />
        Upload Files
      </button>
      <AuthControls />
    </header>
  );
}
