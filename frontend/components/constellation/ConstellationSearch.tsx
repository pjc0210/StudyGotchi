"use client";

import { FileText, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { emit } from "@/lib/audio/events";
import { searchGraph } from "@/lib/graph";
import { ARTIFACT_LABEL, STATE_COLOR } from "@/lib/graphTheme";
import { useStore } from "@/lib/store";

/** Find a star or a file by name; ⌘K focuses it from anywhere on the page. */
export function ConstellationSearch() {
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
    .map((r) => ({ id: r.id, title: r.title, artifactLabel: ARTIFACT_LABEL[r.artifact_type] ?? "Material" }));

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
    emit({ type: "ui", kind: "confirm" });
    focusConcept(id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={boxRef} className="sg-search">
      <Search size={13} className="sg-search-icon" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder="Find a star or a file"
        aria-label="Search concepts and files"
        className="sg-input"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) choose(matches[0].id);
        }}
      />
      <kbd className="sg-kbd">⌘K</kbd>

      {open && query.trim() ? (
        <div className="sg-popover sg-sheet" role="listbox" aria-label="Search results">
          {matches.length === 0 ? (
            <p className="sg-popover-empty">Nothing matches &ldquo;{query}&rdquo;.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {matches.map((m) => (
                <li key={m.id}>
                  <button type="button" role="option" aria-selected={false} className="sg-row" onClick={() => choose(m.id)}>
                    {m.kind === "concept" ? (
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          flexShrink: 0,
                          background: STATE_COLOR[nodes.find((n) => n.id === m.id)?.state ?? "exposed"],
                        }}
                      />
                    ) : (
                      <FileText size={12} aria-hidden style={{ flexShrink: 0, color: "var(--a-ink-55)" }} />
                    )}
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                      {m.label}
                    </span>
                    <span className="sg-eyebrow" style={{ flexShrink: 0 }}>
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
  );
}
