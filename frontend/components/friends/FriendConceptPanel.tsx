"use client";

import { X } from "lucide-react";
import { formatScore } from "@/lib/graph";
import { analyzeConcept, type ConceptRef } from "@/lib/conceptAnalysis";
import type { ConceptEdge, ConceptNode } from "@/lib/types";
import { StateBadge } from "@/components/common/StatusBadge";
import { ConceptStats } from "@/components/concepts/ConceptStats";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-4 py-4">
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ConceptRefRow({
  concept,
  onSelect,
}: {
  concept: ConceptRef;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(concept.id)}
      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-raised"
    >
      <StateBadge state={concept.state} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
        {concept.name}
      </span>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint">
        {formatScore(concept.understanding)}
      </span>
    </button>
  );
}

function ConceptRefList({
  concepts,
  onSelect,
  emptyLabel,
}: {
  concepts: ConceptRef[];
  onSelect: (id: string) => void;
  emptyLabel: string;
}) {
  if (concepts.length === 0) {
    return <p className="text-[12px] text-ink-faint">{emptyLabel}</p>;
  }
  return (
    <div className="-mx-1.5 space-y-0.5">
      {concepts.map((c) => (
        <ConceptRefRow key={c.id} concept={c} onSelect={onSelect} />
      ))}
    </div>
  );
}

/**
 * Same shape as the real ConceptPanel, minus anything that requires a
 * backend: no resources fetch, no `/why` definition lookup - there is no
 * real data behind a friend's graph, so this only ever reads from the
 * synthetic nodes/edges it's given.
 */
export function FriendConceptPanel({
  concept,
  allNodes,
  edges,
  onSelect,
  onClose,
}: {
  concept: ConceptNode;
  allNodes: ConceptNode[];
  edges: ConceptEdge[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const analysis = analyzeConcept(concept, allNodes, edges);

  return (
    <aside
      aria-label="Concept inspector"
      className="sg-enter absolute right-0 top-0 z-20 flex h-full w-[304px] flex-col 2xl:w-[330px] overflow-y-auto border-l border-white/[0.08] bg-[#0c1018] shadow-2xl shadow-black/60"
    >
      <header className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#0c1018] px-5 py-5">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-[23px] font-medium leading-tight tracking-[-0.035em] text-white">
            {concept.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="-mr-1 rounded p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StateBadge state={concept.state} />
          {concept.scope !== "course" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
              Personal note
            </span>
          ) : null}
          {concept.cluster ? (
            <span className="text-[11px] text-ink-faint">{concept.cluster}</span>
          ) : null}
        </div>
      </header>

      <div className="px-4 py-4">
        <ConceptStats concept={concept} />
      </div>

      <Section title="About this concept">
        <p className="text-[13px] leading-relaxed text-ink-dim">
          {analysis.whyItMatters}
        </p>
      </Section>

      <Section
        title={`Prerequisites${analysis.prerequisites.length ? ` (${analysis.prerequisites.length})` : ""}`}
      >
        <ConceptRefList
          concepts={analysis.prerequisites}
          onSelect={onSelect}
          emptyLabel="No prerequisites recorded for this concept."
        />
      </Section>

      <Section
        title={`Unlocks${analysis.unlocks.length ? ` (${analysis.unlocks.length})` : ""}`}
      >
        <ConceptRefList
          concepts={analysis.unlocks}
          onSelect={onSelect}
          emptyLabel="This isn't a prerequisite for anything else yet."
        />
      </Section>

      {analysis.related.map((group) => (
        <Section key={group.type} title={`${group.label} (${group.concepts.length})`}>
          <ConceptRefList concepts={group.concepts} onSelect={onSelect} emptyLabel="" />
        </Section>
      ))}
    </aside>
  );
}
