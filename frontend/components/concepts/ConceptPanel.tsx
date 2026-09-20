"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { formatScore } from "@/lib/graph";
import { analyzeConcept } from "@/lib/conceptAnalysis";
import { useStore } from "@/lib/store";
import type {
  ConceptDetail,
  ConceptNode,
  UnderstandingEntry,
} from "@/lib/types";
import { StateBadge } from "@/components/common/StatusBadge";
import { UnderstandingBreakdown } from "./UnderstandingBreakdown";
import { ResourceList } from "./ResourceList";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line px-4 py-4">
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ConceptPanel() {
  const { graph, selectedId, select } = useStore();
  const [detail, setDetail] = useState<ConceptDetail | null>(null);
  const [understanding, setUnderstanding] = useState<UnderstandingEntry | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const concept: ConceptNode | undefined = graph.data?.nodes.find(
    (n) => n.id === selectedId,
  );

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setUnderstanding(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all([api.getConceptDetail(selectedId), api.listUnderstanding()])
      .then(([d, entries]) => {
        if (cancelled) return;
        setDetail(d);
        setUnderstanding(
          entries.find((entry) => entry.concept_id === selectedId) ?? null,
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // The inspector appears only on selection, so the graph keeps the full canvas.
  if (!concept) return null;
  const analysis = analyzeConcept(
    concept,
    understanding,
    graph.data?.edges ?? [],
  );

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
            onClick={() => select(null)}
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
              <Sparkles size={10} aria-hidden />
              Personal concept
            </span>
          ) : null}
          {concept.cluster ? (
            <span className="text-[11px] text-ink-faint">
              {concept.cluster}
            </span>
          ) : null}
        </div>
      </header>

      <div className="px-4 py-4">
        <UnderstandingBreakdown concept={concept} detail={understanding} />
      </div>

      <Section
        title={
          concept.understanding === null
            ? "Why isn't my understanding estimated yet?"
            : `Why is my understanding ${formatScore(concept.understanding)}?`
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-dim">
          {analysis.understandingSummary}
        </p>
      </Section>

      <Section title="Why this matters">
        <p className="text-[13px] leading-relaxed text-ink-dim">
          {analysis.whyItMatters}
        </p>
        <p className="mt-2 text-[12px] text-ink-faint">
          {analysis.importanceLabel}
        </p>
        {analysis.graphFacts.length > 0 ? (
          <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink-dim">
            {analysis.graphFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-ink-faint">
            No additional relationships are recorded for this concept yet.
          </p>
        )}
      </Section>

      <Section title="Resources">
        {loading ? (
          <p className="text-[13px] text-ink-faint">Loading resources…</p>
        ) : (
          <ResourceList resources={detail?.resources ?? []} />
        )}
      </Section>
    </aside>
  );
}
