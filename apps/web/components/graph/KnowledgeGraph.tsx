"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import { Network } from "lucide-react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  filterNodes,
  layoutGraph,
  stateStyle,
} from "@/lib/graph";
import { useStore } from "@/lib/store";
import { ConceptNodeCard } from "./ConceptNode";
import { GraphControls } from "./GraphControls";
import { GraphLegend } from "./GraphLegend";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState, LoadingState } from "@/components/common/LoadingState";

const nodeTypes = { concept: ConceptNodeCard };

function GraphCanvas({ highlightIds }: { highlightIds: string[] }) {
  const { graph, filters, setFilters, selectedId, select, focusNonce, reloadGraph } =
    useStore();
  const { fitView, fitBounds, setCenter } = useReactFlow();

  const allNodes = useMemo(() => graph.data?.nodes ?? [], [graph.data]);
  const allEdges = useMemo(() => graph.data?.edges ?? [], [graph.data]);

  const visible = useMemo(() => filterNodes(allNodes, filters), [allNodes, filters]);
  const positioned = useMemo(() => layoutGraph(visible, allEdges), [visible, allEdges]);

  const highlight = useMemo(() => new Set(highlightIds), [highlightIds]);

  const rfNodes = useMemo<Node[]>(
    () =>
      positioned.map(({ node, x, y }) => ({
        id: node.id,
        type: "concept",
        position: { x, y },
        draggable: false,
        selectable: true,
        data: {
          concept: node,
          selected: selectedId === node.id,
          dimmed: highlight.size > 0 && !highlight.has(node.id),
          onGapPath: highlight.has(node.id),
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })),
    [positioned, selectedId, highlight],
  );

  const rfEdges = useMemo<Edge[]>(() => {
    const visibleIds = new Set(positioned.map((p) => p.node.id));
    return allEdges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => {
        const touchesSelection =
          selectedId === e.source || selectedId === e.target;
        const onPath = highlight.has(e.source) && highlight.has(e.target);
        const targetStyle = stateStyle(
          positioned.find((p) => p.node.id === e.target)?.node.state ?? "exposed",
        );

        return {
          id: `${e.source}->${e.target}`,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: false,
          label: touchesSelection ? e.type.replace(/_/g, " ") : undefined,
          labelStyle: { fill: "var(--color-ink-faint)", fontSize: 10 },
          labelBgStyle: { fill: "var(--color-canvas)" },
          style: {
            stroke: onPath
              ? `var(${targetStyle.token})`
              : touchesSelection
                ? "var(--color-focus)"
                : "#39414a",
            strokeWidth: onPath || touchesSelection ? 1.6 : 1,
            strokeDasharray: e.origin === "personal" ? "4 3" : undefined,
            strokeOpacity: highlight.size > 0 && !onPath ? 0.2 : 1,
          },
        } satisfies Edge;
      });
  }, [allEdges, positioned, selectedId, highlight]);

  const resetView = useCallback(() => {
    fitView({ padding: 0.18, duration: 320 });
  }, [fitView]);

  // Frame a set of nodes by computing the bounds ourselves - fitView({nodes})
  // depends on React Flow having measured them, which races with our render.
  const frame = useCallback(
    (ids: string[]) => {
      const subset =
        ids.length > 0
          ? positioned.filter((p) => ids.includes(p.node.id))
          : positioned;
      if (subset.length === 0) return;

      const minX = Math.min(...subset.map((p) => p.x));
      const minY = Math.min(...subset.map((p) => p.y));
      const maxX = Math.max(...subset.map((p) => p.x + NODE_WIDTH));
      const maxY = Math.max(...subset.map((p) => p.y + NODE_HEIGHT));

      // The inspector overlays the right edge, so reserve room for it rather
      // than letting it cover the concepts we just framed.
      const reserveRight = selectedId ? (maxX - minX) * 0.4 + NODE_WIDTH : 0;

      fitBounds(
        { x: minX, y: minY, width: maxX - minX + reserveRight, height: maxY - minY },
        { padding: ids.length > 0 ? 0.25 : 0.12, duration: 420 },
      );
    },
    [positioned, fitBounds, selectedId],
  );

  useEffect(() => {
    const t = setTimeout(() => frame(highlightIds), 80);
    return () => clearTimeout(t);
    // positioned changes are not a reason to re-frame the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightIds]);

  // Re-centre when search or a gap item asks to focus a concept.
  useEffect(() => {
    if (focusNonce === 0 || !selectedId) return;
    const hit = positioned.find((p) => p.node.id === selectedId);
    if (!hit) return;
    setCenter(hit.x + NODE_WIDTH / 2, hit.y + NODE_HEIGHT / 2, {
      zoom: 1.1,
      duration: 420,
    });
    // positioned intentionally omitted: focusNonce is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  if (graph.loading) return <LoadingState label="Building your knowledge graph" />;
  if (graph.error) return <ErrorState message={graph.error} onRetry={reloadGraph} />;
  if (allNodes.length === 0) {
    return (
      <EmptyState
        icon={<Network size={26} strokeWidth={1.5} />}
        title="No knowledge yet"
        body="Upload a lecture, a problem set, or your own notes. StudyGotchi builds your personal graph from what it finds."
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      <GraphControls
        filters={filters}
        onChange={setFilters}
        onFit={resetView}
        shown={positioned.length}
        total={allNodes.length}
      />

      {positioned.length === 0 ? (
        <EmptyState
          title="No concepts match these filters"
          body="Try switching back to My Knowledge, or clearing the state filters."
        />
      ) : (
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => select(node.id)}
          onPaneClick={() => select(null)}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.35}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elevateEdgesOnSelect={false}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="#1b1f24"
          />
          <Controls
            showInteractive={false}
            className="!bottom-auto !left-auto !right-3 !top-14 !shadow-none"
          />
        </ReactFlow>
      )}

      <GraphLegend hiddenCount={graph.data?.hidden_concept_count ?? 0} />
    </div>
  );
}

export function KnowledgeGraph({ highlightIds = [] }: { highlightIds?: string[] }) {
  return (
    <ReactFlowProvider>
      <GraphCanvas highlightIds={highlightIds} />
    </ReactFlowProvider>
  );
}
