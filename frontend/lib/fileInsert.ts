/**
 * Optimistic graph insert for a dropped file.
 *
 * The engine may take a while to re-emit provenance. For the constellation
 * demo we immediately place the file as a resource that bridges two topic
 * clusters, and add a personal RELATED_TO between those clusters when the
 * course graph does not already assert one. The layout layer then reheats so
 * the sky shifts structurally rather than popping a new star in place.
 */

import type {
  ArtifactType,
  ConceptEdge,
  ConceptNode,
  CourseResource,
  KnowledgeGraphResponse,
  SourceOrigin,
} from "./types";

export interface FileInsertPlan {
  resource: CourseResource;
  edges: ConceptEdge[];
}

function clusterKey(node: ConceptNode): string {
  return node.cluster_id ?? node.cluster ?? "_";
}

function importanceOf(node: ConceptNode): number {
  return node.importance ?? 0;
}

function undirectedKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function linkedPairs(edges: ConceptEdge[]): Set<string> {
  const pairs = new Set<string>();
  for (const edge of edges) pairs.add(undirectedKey(edge.source, edge.target));
  return pairs;
}

function resourceTitle(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const tidy = base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return tidy || filename;
}

/** Two concepts from different clusters, rotating with `seq` so successive drops shift different parts of the sky. */
export function pickBridgeConcepts(nodes: ConceptNode[], seq: number): [ConceptNode, ConceptNode] | null {
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return [nodes[0], nodes[0]];

  const groups = new Map<string, ConceptNode[]>();
  for (const node of nodes) {
    const key = clusterKey(node);
    const list = groups.get(key);
    if (list) list.push(node);
    else groups.set(key, [node]);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => importanceOf(b) - importanceOf(a));
  }

  const keys = [...groups.keys()].sort((a, b) => {
    const size = (groups.get(b)?.length ?? 0) - (groups.get(a)?.length ?? 0);
    return size !== 0 ? size : a.localeCompare(b);
  });

  if (keys.length >= 2) {
    const leftKey = keys[seq % keys.length]!;
    const rightKey = keys[(seq + 1) % keys.length]!;
    const left = groups.get(leftKey)!;
    const right = groups.get(rightKey)!;
    return [left[seq % left.length]!, right[seq % right.length]!];
  }

  const only = groups.get(keys[0]!)!;
  return [only[0]!, only[Math.min(1, only.length - 1)]!];
}

export function planFileInsert(
  graph: KnowledgeGraphResponse | null,
  existingResources: CourseResource[],
  file: { name: string },
  origin: SourceOrigin,
  artifactType: ArtifactType,
  seq: number,
): FileInsertPlan | null {
  const nodes = graph?.nodes ?? [];
  const pair = pickBridgeConcepts(nodes, seq);
  if (!pair) return null;

  const [left, right] = pair;
  const conceptIds = left.id === right.id ? [left.id] : [left.id, right.id];
  const id = `ins_${seq}`;
  const resource: CourseResource = {
    id,
    title: resourceTitle(file.name),
    origin,
    artifact_type: artifactType,
    concept_count: conceptIds.length,
    concept_ids: conceptIds,
    status: "processing",
    uploaded_at: new Date().toISOString(),
  };

  if (existingResources.some((item) => item.id === id)) return { resource, edges: [] };

  const edges: ConceptEdge[] = [];
  if (left.id !== right.id) {
    const linked = linkedPairs(graph?.edges ?? []);
    if (!linked.has(undirectedKey(left.id, right.id))) {
      edges.push({
        source: left.id,
        target: right.id,
        type: "RELATED_TO",
        origin: "personal",
        confidence: 0.72,
      });
    }
  }

  return { resource, edges };
}
