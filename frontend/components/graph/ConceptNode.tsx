"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import { formatScore, stateStyle } from "@/lib/graph";
import type { ConceptNode as Concept } from "@/lib/types";
import { StateBadge } from "@/components/common/StatusBadge";

export interface ConceptNodeData extends Record<string, unknown> {
  concept: Concept;
  selected: boolean;
  dimmed: boolean;
  onGapPath: boolean;
}

export function ConceptNodeCard({ data }: NodeProps) {
  const { concept, selected, dimmed, onGapPath } = data as unknown as ConceptNodeData;
  const style = stateStyle(concept.state);
  const isFrontier = concept.state === "frontier";
  const isPersonal = concept.scope !== "course";

  return (
    <div
      className="relative h-[76px] w-[204px] rounded-lg px-3 py-2.5 transition-all duration-200"
      style={{
        background: isFrontier ? "transparent" : "var(--color-raised)",
        border: `1px ${style.dashed ? "dashed" : "solid"} ${
          selected
            ? "var(--color-focus)"
            : onGapPath
              ? `color-mix(in oklab, var(${style.token}) 55%, transparent)`
              : "var(--color-line-strong)"
        }`,
        opacity: dimmed ? 0.28 : isFrontier ? 0.82 : 1,
        boxShadow: selected
          ? "0 0 0 1px var(--color-focus), 0 8px 24px -8px rgba(0,0,0,.7)"
          : onGapPath
            ? `0 0 0 1px color-mix(in oklab, var(${style.token}) 28%, transparent)`
            : "none",
      }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <Handle type="source" position={Position.Right} isConnectable={false} />

      {/* State stripe: a second, non-colour-dependent cue on the left edge. */}
      <span
        aria-hidden
        className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-full"
        style={{ background: `var(${style.token})`, opacity: isFrontier ? 0.5 : 1 }}
      />

      <div className="flex items-start gap-1.5">
        <p
          className="line-clamp-2 flex-1 text-[13px] font-medium leading-[1.3] text-ink"
          title={concept.name}
        >
          {concept.name}
        </p>
        {isPersonal ? (
          <Sparkles
            size={11}
            className="mt-[3px] shrink-0 text-brand"
            aria-label="Personal concept"
          />
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {isFrontier ? (
          <span className="text-[11px] text-ink-faint">Not yet reached</span>
        ) : (
          <span className="font-mono text-[11px] tabular-nums text-ink-dim">
            Mastery {formatScore(concept.mastery)}
          </span>
        )}
        <StateBadge state={concept.state} size="sm" />
      </div>
    </div>
  );
}
