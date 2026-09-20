"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  KnowledgeCanvas,
  type CanvasHandle,
  type HoverInfo,
} from "@/components/graph/KnowledgeCanvas";
import { GraphControls } from "@/components/graph/GraphControls";
import { GraphLenses } from "@/components/graph/GraphLenses";
import { GraphTooltip } from "@/components/graph/GraphTooltip";
import { FriendConceptPanel } from "@/components/friends/FriendConceptPanel";
import { buildGraphModel, lensEmphasis, type Lens } from "@/lib/graphModel";
import { buildFriendGraph, FRIENDS } from "@/lib/friends";

export default function FriendsPage() {
  const [friendId, setFriendId] = useState(FRIENDS[0].id);
  const [lens, setLens] = useState<Lens>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const canvasRef = useRef<CanvasHandle | null>(null);

  const friend = FRIENDS.find((f) => f.id === friendId) ?? FRIENDS[0];

  // Generated once per friend selection, not refetched - there is no
  // backend behind this page (see lib/friends.ts).
  const graph = useMemo(() => buildFriendGraph(friendId), [friendId]);
  const model = useMemo(() => buildGraphModel(graph, []), [graph]);
  const emphasis = useMemo(() => lensEmphasis(model, lens), [model, lens]);
  const hoveredNode = hover ? model.byId.get(hover.id) : undefined;
  const selectedConcept = graph.nodes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedId(null);
    setHover(null);
    setLens("all");
    const id = setTimeout(() => canvasRef.current?.fit(), 40);
    return () => clearTimeout(id);
  }, [friendId]);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    canvasRef.current?.fit();
  }, []);

  return (
    <div className="relative h-dvh overflow-hidden bg-[#04030F] text-ink">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[78px] items-center gap-4 px-9">
        <div className="pointer-events-auto flex items-center gap-4">
          <Link
            href="/knowledge"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-ink-dim transition-colors hover:bg-white/[0.1] hover:text-ink"
          >
            <ArrowLeft size={13} aria-hidden />
            My knowledge
          </Link>
          <div>
            <h1 className="text-[23px] font-medium leading-none tracking-[-0.045em] text-white">
              Friends · Introduction to Algorithms
            </h1>
            <p className="mt-1.5 max-w-[520px] text-[12px] text-ink-dim">
              Illustrative only - generated from the real course structure with a
              synthetic understanding profile per friend. No classmate data
              actually exists behind this.
            </p>
          </div>
        </div>

        <div className="pointer-events-auto ml-auto flex overflow-hidden rounded-full border border-white/10 bg-[#101722]/90 p-1 shadow-xl shadow-black/30 backdrop-blur-sm">
          {FRIENDS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFriendId(f.id)}
              aria-current={f.id === friendId ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                f.id === friendId
                  ? "bg-white/[0.12] text-white"
                  : "text-ink-dim hover:text-ink"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </header>

      <div className="pointer-events-none absolute left-9 top-[100px] z-10 max-w-[360px]">
        <p className="pointer-events-auto rounded-lg border border-white/10 bg-[#101722]/80 px-3 py-2 text-[12px] leading-relaxed text-ink-dim backdrop-blur-sm">
          {friend.blurb}
        </p>
      </div>

      <KnowledgeCanvas
        model={model}
        emphasis={emphasis}
        routeIds={[]}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onHover={setHover}
        handleRef={canvasRef}
      />

      <div className="pointer-events-none absolute left-5 top-[172px]">
        <div className="pointer-events-auto">
          <GraphLenses lens={lens} onChange={setLens} />
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-7 left-1/2 -translate-x-1/2">
        <GraphControls
          onFit={() => canvasRef.current?.fit()}
          onZoomIn={() => canvasRef.current?.zoomBy(1.35)}
          onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.35)}
        />
      </div>

      {hoveredNode && hover ? (
        <GraphTooltip
          node={hoveredNode}
          x={hover.screenX}
          y={hover.screenY}
          connectedCount={model.adjacency.get(hoveredNode.id)?.size ?? 0}
        />
      ) : null}

      {selectedConcept ? (
        <FriendConceptPanel
          concept={selectedConcept}
          allNodes={graph.nodes}
          edges={graph.edges}
          onSelect={setSelectedId}
          onClose={handleClose}
        />
      ) : null}
    </div>
  );
}
