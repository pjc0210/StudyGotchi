import { stateTable } from "./state";
import type { ConceptState } from "./types";


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

export const STATE_STYLES: Record<ConceptState, StateStyle> = stateTable((p) => ({
  label: p.label,
  token: p.token,
  icon: p.icon,
  dashed: p.dashed || undefined,
}));

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

export interface SearchMatch {
  id: string;
  label: string;
  kind: "concept" | "resource";
  /** Concept state, or the resource's artifact label. */
  detail: string;
  score: number;
}

function acronym(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toLowerCase();
}

function scoreAgainst(name: string, q: string): number {
  const lower = name.toLowerCase();
  if (lower === q) return 100;
  if (lower.startsWith(q)) return 80;
  if (q.length >= 2 && acronym(name).startsWith(q)) return 70;
  if (lower.split(/[\s_\-.]+/).some((w) => w.startsWith(q))) return 60;
  if (lower.includes(q)) return 40;
  return 0;
}

/**
 * Ranks concepts and resources together. Tuned so "psd" finds "Positive
 * Semidefinite Matrices" and "kernel" surfaces both the concepts and the
 * lecture PDF that covers them.
 */
export function searchGraph(
  concepts: { id: string; name: string; state: ConceptState }[],
  resources: { id: string; title: string; artifactLabel: string }[],
  query: string,
  limit = 8,
): SearchMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches: SearchMatch[] = [];

  for (const c of concepts) {
    const score = scoreAgainst(c.name, q);
    if (score > 0) {
      matches.push({
        id: c.id,
        label: c.name,
        kind: "concept",
        detail: stateStyle(c.state).label,
        score,
      });
    }
  }

  for (const r of resources) {
    // Resources rank slightly below an equally-good concept match: the graph
    // is primarily about knowledge, files are how it got there.
    const score = scoreAgainst(r.title, q);
    if (score > 0) {
      matches.push({
        id: r.id,
        label: r.title,
        kind: "resource",
        detail: r.artifactLabel,
        score: score - 5,
      });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit);
}
