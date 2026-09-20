"use client";

import type { WorldRegion } from "@/lib/world/types";
import { useConceptDetail } from "@/lib/useConceptDetail";
import { RESIDENT_LABEL, statePresentation } from "@/lib/state";

/** The left-panel card for one concept: engine state, evidence, and where it was taught. */
export function ConceptCard({ region, onClose }: { region: WorldRegion; onClose: () => void }) {
  const { detail, loading, error } = useConceptDetail(region.concept_id);

  return (
    <section aria-label="Concept" className="sg-enter">
      <div className="flex items-start justify-between gap-3">
        <h2 style={{ marginBottom: 4 }}>{region.name}</h2>
        <button type="button" className="pill-link" onClick={onClose} aria-label="Back to the course">
          Back
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="state-chip" style={{ ["--chip" as string]: statePresentation(region.semantic_state, "paper").color }}>
          {statePresentation(region.semantic_state, "paper").label}
        </span>
        <span className="state-chip" style={{ ["--chip" as string]: "#4a433c" }}>
          {Math.round(region.terrain_height * 100)}% understanding
        </span>
        {region.cluster ? (
          <span className="state-chip" style={{ ["--chip" as string]: "#8fbf6a" }}>
            {region.cluster}
          </span>
        ) : null}
      </div>
      <p className="lede" style={{ marginBottom: 16 }}>
        {RESIDENT_LABEL[region.creature_state]}. Understanding moves when the engine reads graded work of yours on this idea.
      </p>

      <h3 className="mb-2 text-[12px] uppercase tracking-wider text-paper-soft">Evidence</h3>
      {error ? (
        <p className="text-[13px] text-paper-soft">{error}</p>
      ) : loading ? (
        <p className="text-[13px] text-paper-soft">Reading your files…</p>
      ) : detail && detail.evidence.length > 0 ? (
        <ul className="evidence-list">
          {detail.evidence.map((e) => (
            <li key={e.id}>
              <span>{e.label}</span>
              <span className={`score ${e.polarity}`}>{e.detail || e.kind}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-paper-soft">Nothing of yours touches this yet. Drop a problem set to start.</p>
      )}

      <h3 className="mb-2 mt-5 text-[12px] uppercase tracking-wider text-paper-soft">Taught in</h3>
      {detail && detail.resources.length > 0 ? (
        <ul className="evidence-list">
          {detail.resources.map((r) => (
            <li key={r.id}>
              <span>{r.title}</span>
              <span className="score">{r.role ?? r.artifact_type}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-paper-soft">{loading ? "" : "No course file cites this concept yet."}</p>
      )}
    </section>
  );
}
