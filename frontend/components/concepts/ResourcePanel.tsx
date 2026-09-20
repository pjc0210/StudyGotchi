"use client";

import { FileText, X } from "lucide-react";
import type { ResourceGraphNode } from "@/lib/graphModel";
import type { GraphModel } from "@/lib/graphModel";
import { ARTIFACT_LABEL, ORIGIN_LABEL, STATE_COLOR, STATE_LABEL } from "@/lib/graphTheme";
import { formatScore } from "@/lib/graph";

/** Lightweight counterpart to the concept inspector - not a file viewer. */
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
    <aside
      aria-label="Resource inspector"
      className="sg-enter absolute right-0 top-0 z-20 flex h-full w-[304px] flex-col 2xl:w-[330px] overflow-y-auto border-l border-white/[0.08] bg-[#0c1018] shadow-2xl shadow-black/60"
    >
      <header className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#0c1018] px-5 py-5">
        <div className="flex items-start gap-2">
          <FileText size={14} className="mt-[3px] shrink-0 text-ink-faint" aria-hidden />
          <h2 className="flex-1 text-[14px] font-semibold leading-tight tracking-tight text-ink">
            {node.label}
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
          <span
            className={`rounded px-1.5 py-[1px] text-[10px] font-medium ${
              node.origin === "student_self"
                ? "bg-brand/12 text-brand"
                : "bg-line text-ink-dim"
            }`}
          >
            {ORIGIN_LABEL[node.origin]}
          </span>
          <span className="text-[11px] text-ink-faint">
            {ARTIFACT_LABEL[node.artifactType]}
          </span>
          {node.resource.status !== "complete" ? (
            <span className="text-[11px] text-state-struggling">
              {node.resource.status}
            </span>
          ) : null}
        </div>
      </header>

      <section className="px-4 py-4">
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Connected concepts
        </h3>

        {connected.length === 0 ? (
          <p className="text-[13px] text-ink-faint">
            The engine has not linked this file to any concept yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {connected.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelectConcept(c.id)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-raised"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background:
                        c.kind === "concept" ? STATE_COLOR[c.state] : "transparent",
                    }}
                  />
                  <span className="flex-1 truncate text-[13px] text-ink">{c.label}</span>
                  {c.kind === "concept" ? (
                    <span className="font-mono text-[11px] tabular-nums text-ink-faint">
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
        <section className="border-t border-line px-4 py-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            States covered
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {[...new Set(connected.map((c) => (c.kind === "concept" ? c.state : null)))]
              .filter((s): s is NonNullable<typeof s> => s !== null)
              .map((s) => (
                <li
                  key={s}
                  className="rounded-full border px-2 py-0.5 text-[10px]"
                  style={{
                    color: STATE_COLOR[s],
                    borderColor: `color-mix(in oklab, ${STATE_COLOR[s]} 32%, transparent)`,
                  }}
                >
                  {STATE_LABEL[s]}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
