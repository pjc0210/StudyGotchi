/**
 * The application's graph model: concepts and the academic resources that
 * explain or assess them, merged into one navigable space.
 *
 * Renderer-agnostic on purpose. Nothing here knows about canvas, d3 or
 * pixels, so the visualisation layer can change without touching the API
 * contracts above it.
 */

import type {
  ArtifactType,
  ConceptNode,
  ConceptState,
  CourseResource,
  DiscoveryState,
  KnowledgeGraphResponse,
  SourceOrigin,
} from "./types";

export type GraphNodeKind = "concept" | "resource";

interface BaseGraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Drawn radius in graph units. Concepts are sized only by backend familiarity. */
  radius: number;
  /** Drives label level-of-detail when zoomed out. Higher shows sooner. */
  weight: number;
}

export interface ConceptGraphNode extends BaseGraphNode {
  kind: "concept";
  concept: ConceptNode;
  state: ConceptState;
  discoveryState: DiscoveryState;
  isPersonal: boolean;
}

export interface ResourceGraphNode extends BaseGraphNode {
  kind: "resource";
  resource: CourseResource;
  origin: SourceOrigin;
  artifactType: ArtifactType;
}

export type GraphModelNode = ConceptGraphNode | ResourceGraphNode;

export interface GraphModelLink {
  id: string;
  source: string;
  target: string;
  /** Semantic relationship name from the backend, e.g. PREREQUISITE_FOR. */
  type: string;
  kind: "concept" | "resource";
  /** Concept edges that assert an ordering get an arrowhead. */
  directed: boolean;
  origin: "course" | "personal";
}

export interface GraphModel {
  nodes: GraphModelNode[];
  links: GraphModelLink[];
  byId: Map<string, GraphModelNode>;
  /** node id -> neighbouring node ids. Precomputed so hover stays O(1). */
  adjacency: Map<string, Set<string>>;
  /** node id -> link ids touching it. */
  incident: Map<string, Set<string>>;
}

const DIRECTED_TYPES = new Set(["PREREQUISITE_FOR", "BUILDS_ON", "prerequisite"]);

/**
 * Familiarity becomes visual territory. The square-root curve makes early
 * exposure noticeable without allowing established concepts to take over the
 * entire map. This deliberately maps a backend metric to pixels; it does not
 * infer or recalculate that metric in the client.
 */
function conceptRadius(familiarity: number): number {
  const clamped = Math.max(0, Math.min(1, familiarity));
  return 18 + Math.sqrt(clamped) * 25;
}

/** A restrained, seeded resource variation with no academic meaning. */
function resourceRadius(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return 18 + (Math.abs(hash) % 5);
}

export function buildGraphModel(
  graph: KnowledgeGraphResponse | null,
  resources: CourseResource[],
): GraphModel {
  const nodes: GraphModelNode[] = [];
  const links: GraphModelLink[] = [];

  const conceptIds = new Set<string>();

  for (const concept of graph?.nodes ?? []) {
    conceptIds.add(concept.id);
    nodes.push({
      id: concept.id,
      kind: "concept",
      label: concept.name,
      radius: conceptRadius(concept.familiarity),
      weight: concept.importance,
      concept,
      state: concept.state,
      discoveryState: concept.discovery_state,
      isPersonal: concept.scope !== "course",
    });
  }

  for (const edge of graph?.edges ?? []) {
    if (!conceptIds.has(edge.source) || !conceptIds.has(edge.target)) continue;
    links.push({
      id: `c:${edge.source}->${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      kind: "concept",
      directed: DIRECTED_TYPES.has(edge.type),
      origin: edge.origin,
    });
  }

  // Resources only enter the graph when the backend has actually recorded a
  // link to a concept that is in this student's personal graph. An orphan
  // resource would be a floating dot with no meaning.
  for (const resource of resources) {
    const linked = resource.concept_ids.filter((id) => conceptIds.has(id));
    if (linked.length === 0) continue;

    nodes.push({
      id: resource.id,
      kind: "resource",
      label: resource.title,
      radius: resourceRadius(resource.id),
      // Resources sit just below concepts in label priority.
      weight: 0.45 + Math.min(linked.length, 6) * 0.03,
      resource,
      origin: resource.origin,
      artifactType: resource.artifact_type,
    });

    for (const conceptId of linked) {
      links.push({
        id: `r:${resource.id}->${conceptId}`,
        source: resource.id,
        target: conceptId,
        type: "EXPLAINED_IN",
        kind: "resource",
        directed: false,
        origin: "course",
      });
    }
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, Set<string>>();
  const incident = new Map<string, Set<string>>();

  const touch = (a: string, b: string, linkId: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!incident.has(a)) incident.set(a, new Set());
    adjacency.get(a)!.add(b);
    incident.get(a)!.add(linkId);
  };

  for (const link of links) {
    touch(link.source, link.target, link.id);
    touch(link.target, link.source, link.id);
  }

  return { nodes, links, byId, adjacency, incident };
}

// ---------------------------------------------------------------------------
// Lenses. These change emphasis only - they never recompute semantic state.
// ---------------------------------------------------------------------------

export type Lens = "all" | "mine" | "weak";

export const LENSES: { id: Lens; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "Concepts and connected material" },
  { id: "mine", label: "My Knowledge", hint: "What you have actually worked with" },
  { id: "weak", label: "Weak Areas", hint: "The three weakest clusters" },
];

/** Backend states the engine considers unstable or under-evidenced. */
const WEAK_STATES = new Set<ConceptState>(["struggling", "fragile", "uncertain", "stale"]);

/**
 * Which nodes a lens emphasises. Returns null when the lens emphasises
 * everything, so the renderer can skip dimming entirely.
 */
export function lensEmphasis(model: GraphModel, lens: Lens): Set<string> | null {
  if (lens === "all") return null;

  const emphasised = new Set<string>();

  for (const node of model.nodes) {
    if (node.kind === "concept") {
      const hit =
        lens === "mine"
          ? node.discoveryState === "active" || node.discoveryState === "encountered"
          : WEAK_STATES.has(node.state);
      if (hit) emphasised.add(node.id);
    } else if (lens === "mine" && node.origin === "student_self") {
      emphasised.add(node.id);
    }
  }

  // Keep a resource visible when the concept it explains is emphasised,
  // otherwise "My Knowledge" would hide the material behind the knowledge.
  if (lens === "mine") {
    for (const node of model.nodes) {
      if (node.kind !== "resource") continue;
      const neighbours = model.adjacency.get(node.id);
      if (!neighbours) continue;
      for (const n of neighbours) {
        if (emphasised.has(n)) {
          emphasised.add(node.id);
          break;
        }
      }
    }
  }

  return emphasised.size > 0 ? emphasised : null;
}

export function neighbourhood(model: GraphModel, id: string | null): Set<string> | null {
  if (!id) return null;
  const set = new Set<string>([id]);
  for (const n of model.adjacency.get(id) ?? []) set.add(n);
  return set;
}
