"use client";

import { Search, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchGraph } from "@/lib/graph";
import { useStore } from "@/lib/store";
import { USE_MOCK } from "@/lib/api";
import { ARTIFACT_LABEL, STATE_COLOR } from "@/lib/graphTheme";
import { FileText } from "lucide-react";
import { AuthControls } from "@/components/auth/AuthControls";

export function TopBar({ onUploadClick }: { onUploadClick: () => void }) {
  const { graph, resources, focusConcept } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const nodes = graph.data?.nodes ?? [];

  // Only material actually linked into the graph is reachable from search;
  // anything else would centre the camera on a node that is not drawn.
  const linkedResources = resources
    .filter((r) => r.concept_ids.some((id) => nodes.some((n) => n.id === id)))
    .map((r) => ({
      id: r.id,
      title: r.title,
      artifactLabel: ARTIFACT_LABEL[r.artifact_type] ?? "Material",
    }));

  const matches = searchGraph(
    nodes.map((n) => ({ id: n.id, name: n.name, state: n.state })),
    linkedResources,
    query,
  );

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
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[78px] items-center gap-4 px-9">
      <div className="pointer-events-auto">
        <h1 className="text-[25px] font-medium leading-none tracking-[-0.045em] text-white">Knowledge</h1>
        <p className="mt-1.5 text-[12px] text-ink-dim">Your learning universe. Explore how concepts connect.</p>
      </div>

      {USE_MOCK ? <span className="pointer-events-auto rounded border border-white/10 px-1.5 py-[1px] text-[10px] font-medium text-ink-faint">Mock data</span> : null}

      <div ref={boxRef} className="pointer-events-auto relative ml-auto w-[330px]">
        <Search
          size={13}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search concepts and files"
          aria-label="Search concepts and files"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) choose(matches[0].id);
          }}
          className="h-[42px] w-full rounded-full border border-white/10 bg-[#111722]/90 pl-10 pr-12 text-[13px] text-ink shadow-lg shadow-black/20 placeholder:text-ink-faint focus:border-white/20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
          ⌘K
        </kbd>

        {open && query.trim() ? (
          <div className="sg-enter absolute right-0 top-[34px] z-50 w-[320px] overflow-hidden rounded-lg border border-line-strong bg-raised shadow-xl shadow-black/40">
            {matches.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-ink-faint">
                Nothing matches “{query}”.
              </p>
            ) : (
              <ul>
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => choose(m.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-line/60"
                    >
                      {m.kind === "concept" ? (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            background:
                              STATE_COLOR[
                                nodes.find((n) => n.id === m.id)?.state ?? "exposed"
                              ],
                          }}
                        />
                      ) : (
                        <FileText
                          size={11}
                          className="shrink-0 text-ink-faint"
                          aria-hidden
                        />
                      )}
                      <span className="flex-1 truncate text-[13px] text-ink">
                        {m.label}
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-faint">
                        {m.detail}
                      </span>
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
        className="pointer-events-auto flex h-[34px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 text-[12px] font-medium text-ink transition-colors hover:bg-white/[0.1]"
      >
        <Upload size={13} strokeWidth={2.25} aria-hidden />
        <span className="sr-only xl:not-sr-only">Upload</span>
      </button>
      <div className="pointer-events-auto">
        <AuthControls />
      </div>
    </header>
  );
}
