"use client";

import type { GraphModelNode } from "@/lib/graphModel";
import { ARTIFACT_LABEL, ORIGIN_LABEL, STATE_COLOR, STATE_LABEL } from "@/lib/graphTheme";
import { formatScore } from "@/lib/graph";

/** Compact by design - the inspector is where detail belongs. */
const W = 220;
const H = 78;

export function GraphTooltip({
  node,
  x,
  y,
  connectedCount,
}: {
  node: GraphModelNode;
  x: number;
  y: number;
  connectedCount: number;
}) {
  // Clear the node's own label below the cursor, and flip near the edges so
  // the tooltip never leaves the viewport.
  const flipX = typeof window !== "undefined" && x + 18 + W > window.innerWidth;
  const flipY = typeof window !== "undefined" && y + 26 + H > window.innerHeight;

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-40 rounded-md border border-line-strong bg-raised px-2.5 py-2 shadow-xl shadow-black/50"
      style={{
        width: W,
        left: flipX ? x - W - 14 : x + 18,
        top: flipY ? y - H - 12 : y + 26,
      }}
    >
      <p className="truncate text-[12px] font-medium text-ink">{node.label}</p>

      {node.kind === "concept" ? (
        <>
          <p className="mt-1 flex gap-2.5 font-mono text-[11px] tabular-nums text-ink-dim">
            <span>M {formatScore(node.concept.mastery)}</span>
            <span>C {formatScore(node.concept.confidence)}</span>
          </p>
          <p
            className="mt-1 text-[11px]"
            style={{ color: STATE_COLOR[node.state] }}
          >
            {STATE_LABEL[node.state]}
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-ink-dim">
            {ORIGIN_LABEL[node.origin]} · {ARTIFACT_LABEL[node.artifactType]}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {connectedCount} connected concept{connectedCount === 1 ? "" : "s"}
          </p>
        </>
      )}
    </div>
  );
}
