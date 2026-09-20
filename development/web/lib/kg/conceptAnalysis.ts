import type { ConceptEdge, ConceptNode, ConceptState } from "./types";
import { DEMO_CONCEPT_ANALYSIS } from "./demoConceptAnalysis";

/** A concept referenced from another concept's inspector - just enough to
 * label it, badge its state, and jump to it. */
export interface ConceptRef {
  id: string;
  name: string;
  understanding: number | null;
  importance: number;
  state: ConceptState;
}

export interface RelatedGroup {
  type: string;
  label: string;
  concepts: ConceptRef[];
}

export interface ConceptAnalysis {
  whyItMatters: string;
  importanceLabel: string;
  /** What this concept requires. Weakest/least-evidenced first - that is
   * the actionable end of the list. */
  prerequisites: ConceptRef[];
  /** What this concept unlocks. Most important first. */
  unlocks: ConceptRef[];
  /** Everything else (BUILDS_ON, EXAMPLE_OF, personal associations, ...),
   * grouped by relationship type. */
  related: RelatedGroup[];
}

const warnedMissingAuthoredAnalysis = new Set<string>();

const RELATED_TYPE_LABELS: Record<string, string> = {
  BUILDS_ON: "Builds on",
  APPLICATION_OF: "Application of",
  EXAMPLE_OF: "Example of",
  CONTRASTS_WITH: "Contrasts with",
  RELATED_TO: "Related to",
  ASSOCIATES_WITH: "You associated this with",
  LEARNED_THROUGH: "You learned this through",
  PERSONAL_EXAMPLE_OF: "Your example of",
  PERSONAL_BUILDS_ON: "Your extension of",
};

function relatedLabel(type: string): string {
  return RELATED_TYPE_LABELS[type] ?? type.replace(/_/g, " ").toLowerCase();
}

function toRef(node: ConceptNode): ConceptRef {
  return {
    id: node.id,
    name: node.name,
    understanding: node.understanding,
    importance: node.importance,
    state: node.state,
  };
}

/** Weakest/least-evidenced first: the actionable end of a prerequisite list. */
function byWeakestFirst(a: ConceptRef, b: ConceptRef): number {
  const av = a.understanding;
  const bv = b.understanding;
  if (av === null && bv === null) return b.importance - a.importance;
  if (av === null) return -1;
  if (bv === null) return 1;
  return av - bv;
}

function byMostImportantFirst(a: ConceptRef, b: ConceptRef): number {
  return b.importance - a.importance;
}

export function analyzeConcept(
  concept: ConceptNode,
  allNodes: ConceptNode[],
  edges: ConceptEdge[],
): ConceptAnalysis {
  const authoredAnalysis = DEMO_CONCEPT_ANALYSIS[concept.id];
  if (
    !authoredAnalysis &&
    process.env.NODE_ENV !== "production" &&
    !warnedMissingAuthoredAnalysis.has(concept.id)
  ) {
    warnedMissingAuthoredAnalysis.add(concept.id);
    console.warn(
      `Missing authored concept analysis for stable concept ID: ${concept.id}`,
    );
  }

  const byId = new Map(allNodes.map((n) => [n.id, n]));
  // Keyed by concept id, not pushed to arrays directly: the graph can carry
  // more than one edge of the same type between the same two concepts (e.g.
  // several distinct pieces of personal evidence each recorded as their own
  // ASSOCIATES_WITH edge), and without deduping here the same concept would
  // appear twice in a list - duplicate React keys, duplicate rows.
  const prerequisites = new Map<string, ConceptRef>();
  const unlocks = new Map<string, ConceptRef>();
  const relatedByType = new Map<string, Map<string, ConceptRef>>();

  for (const edge of edges) {
    if (edge.source !== concept.id && edge.target !== concept.id) continue;
    const otherId = edge.source === concept.id ? edge.target : edge.source;
    const other = byId.get(otherId);
    if (!other) continue;

    if (edge.type === "PREREQUISITE_FOR") {
      const target = edge.target === concept.id ? prerequisites : unlocks;
      target.set(other.id, toRef(other));
      continue;
    }

    if (!relatedByType.has(edge.type)) relatedByType.set(edge.type, new Map());
    relatedByType.get(edge.type)!.set(other.id, toRef(other));
  }

  const prerequisiteList = Array.from(prerequisites.values()).sort(
    byWeakestFirst,
  );
  const unlockList = Array.from(unlocks.values()).sort(byMostImportantFirst);

  const related: RelatedGroup[] = Array.from(relatedByType.entries())
    .map(([type, concepts]) => ({
      type,
      label: relatedLabel(type),
      concepts: Array.from(concepts.values()).sort(byMostImportantFirst),
    }))
    .sort((a, b) => b.concepts.length - a.concepts.length);

  return {
    whyItMatters:
      authoredAnalysis?.whyItMatters ??
      "This concept's role in the course is reflected in the relationships recorded below.",
    importanceLabel:
      concept.importance >= 0.75
        ? "High course importance"
        : concept.importance >= 0.4
          ? "Moderate course importance"
          : "Lower course importance",
    prerequisites: prerequisiteList,
    unlocks: unlockList,
    related,
  };
}
