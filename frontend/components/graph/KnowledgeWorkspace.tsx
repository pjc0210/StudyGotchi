"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Network, Upload } from "lucide-react";
import {
  buildGraphModel,
  lensEmphasis,
  type Lens,
} from "@/lib/graphModel";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/LoadingState";
import { ConceptPanel } from "@/components/concepts/ConceptPanel";
import { ResourcePanel } from "@/components/concepts/ResourcePanel";
import { KnowledgeCanvas, type CanvasHandle, type HoverInfo } from "./KnowledgeCanvas";
import { GraphControls } from "./GraphControls";
import { GraphLenses } from "./GraphLenses";
import { GraphTooltip } from "./GraphTooltip";

/** A settling canvas reads better than a spinner over an empty space. */
function GraphLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex items-center gap-2.5 text-[13px] text-ink-dim" role="status">
        <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-line-strong border-t-ink-dim" />
        Assembling your knowledge graph…
      </div>
    </div>
  );
}

export function KnowledgeWorkspace({
  routeIds = [],
  focusIds = [],
  onUploadClick,
}: {
  /** Ordered study path from the backend, drawn as a route. */
  routeIds?: string[];
  /** Unordered set to emphasise, e.g. the concepts behind current gaps. */
  focusIds?: string[];
  onUploadClick?: () => void;
}) {
  const {
    graph,
    reloadGraph,
    resources,
    selectedId,
    select,
    focusNonce,
    focusConcept,
  } = useStore();

  const [lens, setLens] = useState<Lens>("all");
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const canvasRef = useRef<CanvasHandle | null>(null);

  const model = useMemo(
    () => buildGraphModel(graph.data, resources),
    [graph.data, resources],
  );

  const lensSet = useMemo(() => lensEmphasis(model, lens), [model, lens]);

  // An explicit gap focus outranks the lens - the user asked for it directly.
  const emphasis = useMemo(() => {
    if (focusIds.length === 0) return lensSet;
    const set = new Set(focusIds);
    for (const id of focusIds) {
      for (const n of model.adjacency.get(id) ?? []) set.add(n);
    }
    return set;
  }, [focusIds, lensSet, model]);

  const hoveredNode = hover ? model.byId.get(hover.id) : undefined;

  // Keep a framed subset framed when a panel changes the canvas width.
  useEffect(() => {
    const framed =
      routeIds.length > 0 ? routeIds : focusIds.length > 0 ? focusIds : null;
    canvasRef.current?.onResize(
      framed ? () => canvasRef.current?.fitTo(framed, 220) : null,
    );
    return () => canvasRef.current?.onResize(null);
  }, [routeIds, focusIds]);

  // Changing lens is a change of view, so reframe onto what it emphasises.
  const firstLensRender = useRef(true);
  useEffect(() => {
    if (firstLensRender.current) {
      firstLensRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (lensSet && lensSet.size > 0) canvasRef.current?.fitTo([...lensSet]);
      else canvasRef.current?.fit();
    }, 40);
    return () => clearTimeout(id);
  }, [lens, lensSet]);

  // Search and the gap list both ask the camera to go somewhere.
  useEffect(() => {
    if (!selectedId || focusNonce === 0) return;
    canvasRef.current?.focus(selectedId);
  }, [focusNonce, selectedId]);

  // A study route should frame itself when it arrives.
  useEffect(() => {
    if (routeIds.length === 0) return;
    setLens("all");
    // Wait for the side panel to finish opening so the fit uses the real
    // canvas width, otherwise the tail of the route lands off-screen.
    const id = setTimeout(() => canvasRef.current?.fitTo(routeIds), 260);
    return () => clearTimeout(id);
  }, [routeIds]);

  // So should a fresh set of gaps.
  useEffect(() => {
    if (focusIds.length === 0) return;
    setLens("all");
    const id = setTimeout(() => canvasRef.current?.fitTo(focusIds), 260);
    return () => clearTimeout(id);
  }, [focusIds]);

  const handleSelect = useCallback(
    (id: string | null) => {
      select(id);
    },
    [select],
  );

  const selectedNode = selectedId ? model.byId.get(selectedId) : undefined;

  if (graph.loading) return <GraphLoading />;
  if (graph.error) {
    return (
      <div className="absolute inset-0">
        <ErrorState message={graph.error} onRetry={reloadGraph} />
      </div>
    );
  }

  if (model.nodes.length === 0) {
    return (
      <div className="absolute inset-0">
        <EmptyState
          icon={<Network size={26} strokeWidth={1.4} />}
          title="Your knowledge graph will grow here"
          body="Upload course material or your own notes to begin."
          action={
            onUploadClick ? (
              <button
                type="button"
                onClick={onUploadClick}
                className="mt-1 flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
              >
                <Upload size={13} strokeWidth={2.25} aria-hidden />
                Upload material
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#04030F]">
      <KnowledgeCanvas
        model={model}
        emphasis={emphasis}
        routeIds={routeIds}
        selectedId={selectedId}
        onSelect={handleSelect}
        onHover={setHover}
        handleRef={canvasRef}
      />

      {/* Chrome floats over the canvas so the graph keeps the whole surface. */}
      <div className="pointer-events-none absolute left-5 top-[82px]">
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

      {selectedNode?.kind === "resource" ? (
        <ResourcePanel
          node={selectedNode}
          model={model}
          onClose={() => select(null)}
          onSelectConcept={focusConcept}
        />
      ) : (
        <ConceptPanel />
      )}
    </div>
  );
}
