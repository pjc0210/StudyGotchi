"use client";

import { Sparkles, X } from "lucide-react";
import { formatScore } from "@/lib/graph";
import { useStore } from "@/lib/store";
import type { ConceptNode } from "@/lib/types";
import { useConceptDetail } from "@/lib/useConceptDetail";
import { StateBadge } from "@/components/common/StatusBadge";
import { MasteryBreakdown } from "./MasteryBreakdown";
import { FileMark } from "@/components/files/FileMark";
import { EvidenceList } from "./EvidenceList";
import { ResourceList } from "./ResourceList";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sg-sheet-section">
      <h3 className="sg-eyebrow">{title}</h3>
      {children}
    </section>
  );
}

/** The right-hand sheet for one star. Scrolls on its own; the sky behind it does not. */
export function ConceptPanel() {
  const { graph, selectedId, select } = useStore();
  const { detail, why, loading, error } = useConceptDetail(selectedId);

  const concept: ConceptNode | undefined = graph.data?.nodes.find((n) => n.id === selectedId);

  if (!concept) return null;

  return (
    <aside aria-label="Concept" className="sg-dock sg-dock-right sg-sheet">
      <header className="sg-sheet-head" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div className="flex items-start gap-2">
          <h2 className="sg-title flex-1" style={{ margin: 0 }}>
            {concept.name}
          </h2>
          <button type="button" onClick={() => select(null)} aria-label="Close" className="sg-btn sg-btn-text sg-btn-icon">
            <X size={14} aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StateBadge state={concept.state} />
          {concept.scope !== "course" ? (
            <span className="sg-chip">
              <Sparkles size={10} aria-hidden />
              Personal concept
            </span>
          ) : null}
          {concept.constellation || concept.cluster ? (
            <span className="sg-eyebrow">{concept.constellation ?? concept.cluster}</span>
          ) : null}
        </div>
      </header>

      <div className="sg-dock-body">
        <div className="sg-sheet-section" style={{ boxShadow: "none" }}>
          <MasteryBreakdown concept={concept} />
        </div>

        {detail?.resources[0] ? (
          <Section title="Source file">
            <div className="sg-source-file">
              <FileMark title={detail.resources[0].title} />
              <div>
                <p className="sg-file-title">{detail.resources[0].title}</p>
                <p className="text-[11px] text-ink-faint">{detail.resources[0].role ?? "Direct source"}</p>
              </div>
            </div>
          </Section>
        ) : null}

        {why ? (
          <Section title={`Why ${formatScore(concept.mastery)}`}>
            <p className="text-[13px] leading-relaxed text-ink-dim">{why.summary}</p>
            {why.strongest_evidence || why.weakest_evidence ? (
              <dl className="mt-3 space-y-1.5">
                {why.strongest_evidence ? (
                  <div className="flex gap-2 text-[12px]">
                    <dt className="shrink-0 text-state-mastered">Strongest</dt>
                    <dd className="text-ink-dim">{why.strongest_evidence}</dd>
                  </div>
                ) : null}
                {why.weakest_evidence ? (
                  <div className="flex gap-2 text-[12px]">
                    <dt className="shrink-0 text-state-struggling">Weakest</dt>
                    <dd className="text-ink-dim">{why.weakest_evidence}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            {why.prerequisite_reason ? (
              <div className="sg-card sg-card-static mt-3">
                <p className="sg-eyebrow">Why a prerequisite</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-dim">{why.prerequisite_reason}</p>
              </div>
            ) : null}
          </Section>
        ) : null}

        <Section title="Evidence">
          {error ? (
            <p className="text-[13px] text-state-fragile">{error}</p>
          ) : loading ? (
            <p className="text-[13px] text-ink-faint">Reading your files…</p>
          ) : (
            <EvidenceList evidence={detail?.evidence ?? []} />
          )}
        </Section>

        <Section title="Taught in">
          {loading ? (
            <p className="text-[13px] text-ink-faint">Loading resources…</p>
          ) : (
            <ResourceList resources={detail?.resources ?? []} />
          )}
        </Section>
      </div>
    </aside>
  );
}
