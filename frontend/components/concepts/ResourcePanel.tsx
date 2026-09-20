"use client";

import { FileText, X } from "lucide-react";
import type { GraphModel, ResourceGraphNode } from "@/lib/graphModel";
import { ARTIFACT_LABEL, ORIGIN_LABEL, STATE_COLOR, STATE_LABEL } from "@/lib/graphTheme";
import { formatScore } from "@/lib/graph";

/** The right-hand sheet for one file: what it teaches, not a file viewer. */
export function ResourcePanel({
  node,
  model,
  onClose,
  onSelectConcept,
}: {
  node: ResourceGraphNode;
  model: GraphModel;
  onClose: () => void;
  onSelectConcept: (id: string) => void;
}) {
  const connected = [...(model.adjacency.get(node.id) ?? [])]
    .map((id) => model.byId.get(id))
    .filter((n): n is NonNullable<typeof n> => !!n && n.kind === "concept");

  return (
    <aside aria-label="File" className="sg-dock sg-dock-right sg-sheet">
      <header className="sg-sheet-head" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div className="flex items-start gap-2">
          <FileText size={14} className="mt-[5px] shrink-0 text-ink-faint" aria-hidden />
          <h2 className="sg-title flex-1" style={{ margin: 0, fontSize: 18, lineHeight: "24px" }}>
            {node.label}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="sg-btn sg-btn-text sg-btn-icon">
            <X size={14} aria-hidden />
          </button>
        </div>
        <p className="sg-eyebrow" style={{ margin: 0 }}>
          {ORIGIN_LABEL[node.origin]} · {ARTIFACT_LABEL[node.artifactType]}
          {node.resource.status !== "complete" ? ` · ${node.resource.status}` : ""}
        </p>
      </header>

      <div className="sg-dock-body">
        <section className="sg-sheet-section" style={{ boxShadow: "none" }}>
          <h3 className="sg-eyebrow">Teaches</h3>
          {connected.length === 0 ? (
            <p className="text-[13px] text-ink-faint">The engine has not linked this file to any idea yet.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }} className="space-y-0.5">
              {connected.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onSelectConcept(c.id)} className="sg-row">
                    <span
                      aria-hidden
                      style={{ width: 6, height: 6, flexShrink: 0, background: c.kind === "concept" ? STATE_COLOR[c.state] : "transparent" }}
                    />
                    <span className="flex-1 truncate text-[13px]">{c.label}</span>
                    {c.kind === "concept" ? (
                      <span className="sg-eyebrow" style={{ letterSpacing: 0 }}>
                        {formatScore(c.concept.mastery)}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {connected.length > 0 ? (
          <section className="sg-sheet-section">
            <h3 className="sg-eyebrow">States covered</h3>
            <ul className="flex flex-wrap gap-1.5" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {[...new Set(connected.map((c) => (c.kind === "concept" ? c.state : null)))]
                .filter((s): s is NonNullable<typeof s> => s !== null)
                .map((s) => (
                  <li key={s} className="sg-chip" style={{ ["--chip" as string]: STATE_COLOR[s] }}>
                    <span className="sg-chip-dot" aria-hidden />
                    {STATE_LABEL[s]}
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
