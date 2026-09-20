/**
 * Short, specific weak-area chains for the Information sky.
 * Picks a handful of concept-to-concept links — never a course-wide overlay.
 */

import type { ConceptNode, ConceptState } from "./types";

export const WEAK_SEQUENCE_MIN = 3;
export const WEAK_SEQUENCE_MAX = 6;
const MAX_SEQUENCE_NODES = 4;

const WEAK_STATES = new Set<ConceptState>(["struggling", "fragile", "uncertain", "stale"]);

export interface WeakSequenceLink {
  id: string;
  source: string;
  target: string;
  kind: string;
  type?: string;
}

export interface WeakSequence {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  labels: string[];
  mastery: number;
}

export function pickWeakSequences(
  nodes: readonly ConceptNode[],
  links: readonly WeakSequenceLink[],
): WeakSequence[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const weakIds = new Set(
    nodes.filter((node) => isSpecificWeak(node)).map((node) => node.id),
  );
  if (weakIds.size === 0) return [];

  const adjacency = new Map<string, { other: string; link: WeakSequenceLink }[]>();
  for (const link of links) {
    if (link.kind !== "concept") continue;
    if (!weakIds.has(link.source) || !weakIds.has(link.target)) continue;
    if (link.source === link.target) continue;
    addAdj(adjacency, link.source, link.target, link);
    addAdj(adjacency, link.target, link.source, link);
  }

  const starts = [...weakIds]
    .map((id) => byId.get(id)!)
    .sort((a, b) => weakness(b) - weakness(a) || a.id.localeCompare(b.id));

  const usedNodes = new Set<string>();
  const usedEdges = new Set<string>();
  const sequences: WeakSequence[] = [];

  for (const start of starts) {
    if (sequences.length >= WEAK_SEQUENCE_MAX) break;
    if (usedNodes.has(start.id)) continue;

    const grown = growSequence(start.id, adjacency, byId, usedEdges);
    if (!grown) continue;
    for (const id of grown.nodeIds) usedNodes.add(id);
    for (const id of grown.edgeIds) usedEdges.add(id);
    sequences.push(grown);
  }

  return sequences;
}

/** Red connection lines exist only on the Weak Areas lens. */
export function weakTraceIdsForLens(
  lens: string,
  sequences: readonly WeakSequence[],
): string[] {
  if (lens !== "weak") return [];
  return sequences.flatMap((sequence) => sequence.edgeIds);
}

function isSpecificWeak(node: ConceptNode): boolean {
  if (isCourseLevel(node)) return false;
  if (WEAK_STATES.has(node.state)) return true;
  return node.mastery != null && node.mastery < 0.58;
}

/** Course titles and giant topic headers — not the little concepts we trace. */
function isCourseLevel(node: ConceptNode): boolean {
  if (node.importance >= 0.95) return true;
  if (node.name === node.cluster && node.importance >= 0.9) return true;
  if (/\b\d+\.\d+\b/.test(node.name)) return true;
  if (/\b(classical mechanics|entire course|course)\b/i.test(node.name)) return true;
  return false;
}

function weakness(node: ConceptNode): number {
  const mastery = node.mastery ?? 0;
  const stateBonus =
    node.state === "struggling"
      ? 0.12
      : node.state === "fragile"
        ? 0.1
        : node.state === "stale"
          ? 0.06
          : node.state === "uncertain"
            ? 0.04
            : 0;
  const recent = node.discovery_state === "active" ? 0.04 : 0;
  return 1 - mastery + node.fragility * 0.25 + stateBonus + recent;
}

function edgePriority(type: string | undefined): number {
  if (!type) return 1;
  if (/PREREQUISITE|BUILDS_ON/i.test(type)) return 3;
  if (/RELATED|EVIDENCE/i.test(type)) return 2;
  return 1;
}

function addAdj(
  adjacency: Map<string, { other: string; link: WeakSequenceLink }[]>,
  from: string,
  to: string,
  link: WeakSequenceLink,
) {
  const list = adjacency.get(from) ?? [];
  list.push({ other: to, link });
  adjacency.set(from, list);
}

function growSequence(
  startId: string,
  adjacency: Map<string, { other: string; link: WeakSequenceLink }[]>,
  byId: Map<string, ConceptNode>,
  usedEdges: Set<string>,
): WeakSequence | null {
  const nodeIds = [startId];
  const edgeIds: string[] = [];
  const seen = new Set([startId]);

  while (nodeIds.length < MAX_SEQUENCE_NODES) {
    const here = nodeIds[nodeIds.length - 1]!;
    const next = bestHop(here, adjacency, byId, seen, usedEdges);
    if (!next) break;
    nodeIds.push(next.other);
    edgeIds.push(next.link.id);
    seen.add(next.other);
  }

  if (nodeIds.length < 2 || edgeIds.length === 0) return null;

  const members = nodeIds.map((id) => byId.get(id)!);
  const mastery =
    members.reduce((sum, node) => sum + (node.mastery ?? 0), 0) / members.length;
  return {
    id: nodeIds.join(">"),
    nodeIds,
    edgeIds,
    labels: members.map((node) => node.name),
    mastery,
  };
}

function bestHop(
  from: string,
  adjacency: Map<string, { other: string; link: WeakSequenceLink }[]>,
  byId: Map<string, ConceptNode>,
  seen: Set<string>,
  usedEdges: Set<string>,
): { other: string; link: WeakSequenceLink } | null {
  const options = (adjacency.get(from) ?? []).filter(
    (hop) => !seen.has(hop.other) && !usedEdges.has(hop.link.id) && byId.has(hop.other),
  );
  if (options.length === 0) return null;
  options.sort((a, b) => {
    const typeDelta = edgePriority(b.link.type) - edgePriority(a.link.type);
    if (typeDelta !== 0) return typeDelta;
    const weakDelta = weakness(byId.get(b.other)!) - weakness(byId.get(a.other)!);
    if (weakDelta !== 0) return weakDelta;
    return a.other.localeCompare(b.other);
  });
  return options[0] ?? null;
}
