import type { ConceptEdge, ConceptNode, ConceptState } from "./types";

export const NODE_WIDTH = 204;
export const NODE_HEIGHT = 76;
const COLUMN_GAP = 68;
const ROW_GAP = 88;

// ---------------------------------------------------------------------------
// Visual semantics. Never colour alone - every state also carries a label.
// ---------------------------------------------------------------------------

export interface StateStyle {
  label: string;
  /** CSS custom-property name holding the hue for this state. */
  token: string;
  /** Lucide icon name, resolved by the component. */
  icon: "check" | "trend" | "alert" | "question" | "clock" | "sprout" | "dot";
  dashed?: boolean;
}

export const STATE_STYLES: Record<ConceptState, StateStyle> = {
  mastered: { label: "Mastered", token: "--state-mastered", icon: "check" },
  strong: { label: "Strong", token: "--state-strong", icon: "check" },
  developing: { label: "Developing", token: "--state-developing", icon: "trend" },
  uncertain: { label: "Uncertain", token: "--state-uncertain", icon: "question" },
  exposed: { label: "Exposed", token: "--state-exposed", icon: "dot" },
  struggling: { label: "Struggling", token: "--state-struggling", icon: "alert" },
  fragile: { label: "Fragile", token: "--state-fragile", icon: "alert" },
  stale: { label: "Stale", token: "--state-stale", icon: "clock" },
  frontier: { label: "Frontier", token: "--state-frontier", icon: "sprout", dashed: true },
};

export function stateStyle(state: ConceptState): StateStyle {
  return STATE_STYLES[state] ?? STATE_STYLES.exposed;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return `${Math.round(value * 100)}%`;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export type ViewFilter = "mine" | "frontier" | "personal";

export const STATE_FILTERS: ConceptState[] = [
  "struggling",
  "developing",
  "strong",
  "fragile",
];

export interface GraphFilters {
  view: ViewFilter;
  states: ConceptState[];
}

export const DEFAULT_FILTERS: GraphFilters = { view: "mine", states: [] };

export function filterNodes(nodes: ConceptNode[], filters: GraphFilters): ConceptNode[] {
  return nodes.filter((n) => {
    // Unseen syllabus concepts are never part of the personal graph.
    if (n.discovery_state === "unseen") return false;

    if (filters.view === "frontier" && n.discovery_state !== "frontier") return false;
    if (filters.view === "personal" && n.scope === "course") return false;

    if (filters.states.length > 0 && !filters.states.includes(n.state)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Deterministic layered layout (left -> right along prerequisites)
// ---------------------------------------------------------------------------

export interface PositionedNode {
  node: ConceptNode;
  x: number;
  y: number;
}

export function layoutGraph(
  nodes: ConceptNode[],
  edges: ConceptEdge[],
): PositionedNode[] {
  const ids = new Set(nodes.map((n) => n.id));
  const live = edges.filter((e) => ids.has(e.source) && ids.has(e.target));

  const incoming = new Map<string, string[]>();
  nodes.forEach((n) => incoming.set(n.id, []));
  live.forEach((e) => incoming.get(e.target)?.push(e.source));

  // Longest path from any root, so every prerequisite sits strictly to the left.
  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  const resolve = (id: string): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0; // defensive: tolerate a cycle from the backend
    visiting.add(id);
    const parents = incoming.get(id) ?? [];
    const d = parents.length === 0 ? 0 : Math.max(...parents.map(resolve)) + 1;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };
  nodes.forEach((n) => resolve(n.id));

  // Group into columns, ordered deterministically by id so runs are identical.
  const columns = new Map<number, ConceptNode[]>();
  [...nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n) => {
      const d = depth.get(n.id) ?? 0;
      const col = columns.get(d) ?? [];
      col.push(n);
      columns.set(d, col);
    });

  // Order rows within a column by the mean row of their parents, which pulls
  // chains into straight lines and cuts edge crossings.
  const rowOf = new Map<string, number>();
  const positioned: PositionedNode[] = [];
  const tallest = Math.max(...[...columns.values()].map((c) => c.length), 1);

  [...columns.keys()]
    .sort((a, b) => a - b)
    .forEach((d) => {
      const col = columns.get(d)!;
      const ordered = [...col].sort((a, b) => {
        const pa = (incoming.get(a.id) ?? []).map((p) => rowOf.get(p) ?? 0);
        const pb = (incoming.get(b.id) ?? []).map((p) => rowOf.get(p) ?? 0);
        const ma = pa.length ? pa.reduce((s, v) => s + v, 0) / pa.length : Number.MAX_SAFE_INTEGER;
        const mb = pb.length ? pb.reduce((s, v) => s + v, 0) / pb.length : Number.MAX_SAFE_INTEGER;
        if (ma !== mb) return ma - mb;
        return a.id.localeCompare(b.id);
      });

      const span = (NODE_HEIGHT + ROW_GAP) * (ordered.length - 1);
      const top = ((NODE_HEIGHT + ROW_GAP) * (tallest - 1) - span) / 2;

      ordered.forEach((n, i) => {
        rowOf.set(n.id, i);
        positioned.push({
          node: n,
          x: d * (NODE_WIDTH + COLUMN_GAP),
          y: top + i * (NODE_HEIGHT + ROW_GAP),
        });
      });
    });

  return positioned;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface ConceptMatch {
  node: ConceptNode;
  score: number;
}

function acronym(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toLowerCase();
}

/**
 * Ranks concepts against a query. Higher score wins.
 * Tuned so "psd" finds "Positive Semidefinite Matrices" and "mercer" finds
 * "Mercer's Theorem" ahead of anything that merely contains the substring.
 */
export function rankConceptMatches(nodes: ConceptNode[], query: string): ConceptMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return nodes
    .map((node) => {
      const name = node.name.toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (acronym(node.name).startsWith(q) && q.length >= 2) score = 70;
      else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 60;
      else if (name.includes(q)) score = 40;
      else if (node.cluster?.toLowerCase().includes(q)) score = 20;
      return { node, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name))
    .slice(0, 8);
}
