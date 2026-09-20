import type { ConceptDetail, ConceptNode, ConceptState, CourseResource, DiscoveryState, Resource } from "@/lib/types";
import { DEMO_COURSES } from "./demo-courses";
import { constellationFamily } from "./constellation-families";
import { displayClusterName, displayConceptName } from "./concept-labels";
import understandingHero from "./pipeline/8.223-understanding.json";
import sourcesHero from "./pipeline/8.223-sources.json";

interface UnderstandingRow {
  understanding?: number | null;
  positive_evidence?: number | null;
  negative_evidence?: number | null;
  discovery_state?: string;
}

interface SourceRow {
  title: string;
  origin: string;
  artifact_type: string;
  resource_id: string;
  name?: string;
}

const UNDERSTANDING: Record<string, Record<string, UnderstandingRow>> = {
  [DEMO_COURSES[0].id]: understandingHero as Record<string, UnderstandingRow>,
};

const SOURCES: Record<string, Record<string, SourceRow>> = {
  [DEMO_COURSES[0].id]: sourcesHero as Record<string, SourceRow>,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function stateFromScores(mastery: number, discovery: DiscoveryState): ConceptState {
  if (discovery === "unseen" && mastery < 0.4) return "frontier";
  if (mastery >= 0.75) return "mastered";
  if (mastery >= 0.62) return "strong";
  if (mastery >= 0.5) return "developing";
  if (mastery >= 0.38) return "uncertain";
  return "struggling";
}

export function pipelineSourceForConcept(
  courseId: string,
  conceptId: string,
): Resource | null {
  const row = SOURCES[courseId]?.[conceptId];
  if (!row?.title) return null;
  return {
    id: row.resource_id,
    title: row.title,
    origin: row.origin as Resource["origin"],
    artifact_type: row.artifact_type as Resource["artifact_type"],
    role: "Direct source",
  };
}

export function pipelineConceptDetail(courseId: string, conceptId: string): ConceptDetail | null {
  const source = pipelineSourceForConcept(courseId, conceptId);
  if (!source) return null;
  return {
    concept_id: conceptId,
    evidence: [
      {
        id: `${conceptId}:source`,
        label: source.title,
        detail: "Ingested with the 8.223 pipeline",
        kind: "familiarity",
        polarity: "positive",
        source,
      },
    ],
    resources: [source],
  };
}

export function conceptsForSourceTitle(courseId: string, title: string): string[] {
  const rows = SOURCES[courseId];
  if (!rows) return [];
  const key = title.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? title.toLowerCase();
  const ids: string[] = [];
  for (const [conceptId, row] of Object.entries(rows)) {
    if ((row.title.replace(/\\/g, "/").split("/").pop() ?? row.title).toLowerCase() === key) {
      ids.push(conceptId);
    }
  }
  return ids;
}

export function withPipelineSources(courseId: string, resources: CourseResource[]): CourseResource[] {
  return resources.map((resource) => {
    const linked = conceptsForSourceTitle(courseId, resource.title);
    if (linked.length === 0) return resource;
    const concept_ids = [...new Set([...resource.concept_ids, ...linked])];
    return { ...resource, concept_ids, concept_count: Math.max(resource.concept_count, concept_ids.length) };
  });
}

export function enrichPipelineNode(node: ConceptNode, courseId: string): ConceptNode {
  const row = UNDERSTANDING[courseId]?.[node.id];
  const understanding =
    row?.understanding ?? node.mastery ?? (Number.isFinite(node.familiarity) ? node.familiarity : null);
  const positive =
    typeof row?.positive_evidence === "number" && row.positive_evidence > 0
      ? row.positive_evidence
      : understanding ?? 0.4;
  const negative = typeof row?.negative_evidence === "number" ? row.negative_evidence : 0;
  const discovery = (row?.discovery_state as DiscoveryState | undefined) ?? node.discovery_state;
  const mastery = typeof understanding === "number" && Number.isFinite(understanding) ? clamp01(understanding) : null;
  const familiarity = clamp01(Math.max(node.familiarity || 0, positive, (mastery ?? 0) * 0.88, 0.28));
  const confidence = clamp01(Math.max(0.22, positive / (positive + negative + 0.22)));
  const fragility = clamp01(negative / (positive + 0.35));
  const readiness = clamp01(familiarity * (0.35 + 0.65 * (mastery ?? familiarity)));
  const name = displayConceptName(node.name);
  const cluster = node.cluster ? displayClusterName(node.cluster) : node.cluster;
  return {
    ...node,
    name,
    cluster,
    constellation: constellationFamily(cluster, name),
    discovery_state: discovery,
    mastery,
    familiarity,
    confidence,
    readiness,
    fragility,
    state: node.state && node.state !== "exposed" ? node.state : stateFromScores(mastery ?? 0, discovery),
  };
}

export interface WeakTrack {
  id: string;
  label: string;
  conceptIds: string[];
  mastery: number;
  count: number;
}

export const WEAK_TRACK_LIMIT = 3;

export function weakAreaTracks(nodes: readonly ConceptNode[]): WeakTrack[] {
  const groups = new Map<string, { label: string; members: ConceptNode[] }>();
  for (const node of nodes) {
    const weak =
      (node.mastery ?? 1) < 0.58 ||
      node.state === "struggling" ||
      node.state === "fragile" ||
      node.state === "uncertain" ||
      node.state === "stale";
    if (!weak) continue;
    const label = node.constellation ?? constellationFamily(node.cluster, node.name) ?? "Weak areas";
    const group = groups.get(label) ?? { label, members: [] };
    group.members.push(node);
    groups.set(label, group);
  }
  return [...groups.values()]
    .map((group) => {
      const mastery =
        group.members.reduce((sum, node) => sum + (node.mastery ?? 0), 0) / Math.max(1, group.members.length);
      return {
        id: group.label,
        label: group.label,
        conceptIds: group.members.map((node) => node.id),
        mastery,
        count: group.members.length,
      };
    })
    .sort((a, b) => a.mastery - b.mastery || b.count - a.count)
    .slice(0, WEAK_TRACK_LIMIT);
}

/** One short intra-cluster concept edge per top track — not a red web. */
export function weakGapTraces(
  tracks: readonly WeakTrack[],
  links: readonly { id: string; source: string; target: string; kind: string }[],
): string[] {
  const traces: string[] = [];
  for (const track of tracks.slice(0, WEAK_TRACK_LIMIT)) {
    const members = new Set(track.conceptIds);
    const intra = links.find(
      (link) => link.kind === "concept" && members.has(link.source) && members.has(link.target),
    );
    if (intra) traces.push(intra.id);
  }
  return traces;
}
