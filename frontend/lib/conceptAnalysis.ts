import type { ConceptEdge, ConceptNode, UnderstandingEntry } from "./types";

export interface ConceptAnalysis {
  understandingSummary: string;
  importanceLabel: string;
  graphFacts: string[];
}

export function relativeDate(value: string | null, empty: string): string {
  if (!value) return empty;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return empty;
  const days = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86_400_000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function analyzeConcept(
  concept: ConceptNode,
  understanding: UnderstandingEntry | null,
  edges: ConceptEdge[],
): ConceptAnalysis {
  const positive = understanding?.positive_evidence ?? 0;
  const negative = understanding?.negative_evidence ?? 0;
  const total = positive + negative;
  let understandingSummary: string;
  if (concept.understanding === null || total === 0) {
    understandingSummary =
      "There isn't enough evidence yet to estimate your understanding reliably.";
  } else if (positive / total >= 0.72) {
    understandingSummary =
      "Your aggregate evidence currently leans strongly positive.";
  } else if (negative / total >= 0.45) {
    understandingSummary =
      "Your aggregate evidence includes substantial evidence against this concept, so it may need more work.";
  } else {
    understandingSummary =
      "Your aggregate evidence is mixed, so this understanding estimate is still developing.";
  }

  const incomingPrerequisites = edges.filter(
    (edge) => edge.type === "PREREQUISITE_FOR" && edge.target === concept.id,
  ).length;
  const outgoingPrerequisites = edges.filter(
    (edge) => edge.type === "PREREQUISITE_FOR" && edge.source === concept.id,
  ).length;
  const byType = (type: string) =>
    edges.filter(
      (edge) =>
        edge.type === type &&
        (edge.source === concept.id || edge.target === concept.id),
    ).length;

  const graphFacts: string[] = [];
  if (incomingPrerequisites)
    graphFacts.push(
      `Builds on ${incomingPrerequisites} prerequisite concept${incomingPrerequisites === 1 ? "" : "s"}.`,
    );
  if (outgoingPrerequisites)
    graphFacts.push(
      `Unlocks ${outgoingPrerequisites} downstream concept${outgoingPrerequisites === 1 ? "" : "s"}.`,
    );
  for (const [type, label] of [
    ["BUILDS_ON", "build-on"],
    ["APPLICATION_OF", "application"],
    ["EXAMPLE_OF", "example"],
    ["CONTRASTS_WITH", "contrast"],
  ] as const) {
    const count = byType(type);
    if (count)
      graphFacts.push(
        `Has ${count} ${label} relationship${count === 1 ? "" : "s"} in this course graph.`,
      );
  }
  if (concept.cluster)
    graphFacts.push(`Part of the ${concept.cluster} cluster.`);

  return {
    understandingSummary,
    importanceLabel:
      concept.importance >= 0.75
        ? "High course importance"
        : concept.importance >= 0.4
          ? "Moderate course importance"
          : "Lower course importance",
    graphFacts,
  };
}
