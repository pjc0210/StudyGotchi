"use client";

import type { GraphModelNode } from "@/lib/graphModel";
import { ARTIFACT_LABEL, ORIGIN_LABEL, STATE_COLOR, STATE_LABEL } from "@/lib/graphTheme";
import { formatScore } from "@/lib/graph";

/** Compact by design; the sheet is where detail belongs. */
const W = 220;
const H = 64;

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
  // Clear the star's own label below the cursor, and flip near the edges so
  // the card never leaves the viewport.
  const flipX = typeof window !== "undefined" && x + 18 + W > window.innerWidth;
  const flipY = typeof window !== "undefined" && y + 26 + H > window.innerHeight;

  return (
    <div
      role="tooltip"
      className="sg-tooltip sg-sheet"
      style={{ width: W, left: flipX ? x - W - 14 : x + 18, top: flipY ? y - H - 12 : y + 26 }}
    >
      <p className="sg-tooltip-name">{node.label}</p>
      {node.kind === "concept" ? (
        <p className="sg-tooltip-meta">
          <span style={{ color: STATE_COLOR[node.state] }}>{STATE_LABEL[node.state]}</span>
          {" · "}M {formatScore(node.concept.mastery)} · C {formatScore(node.concept.confidence)}
        </p>
      ) : (
        <p className="sg-tooltip-meta">
          {ORIGIN_LABEL[node.origin]} · {ARTIFACT_LABEL[node.artifactType]} · {connectedCount} linked
        </p>
      )}
    </div>
  );
}
