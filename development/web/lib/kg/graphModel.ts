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
  /** Drawn radius in graph units. Concepts are sized only by academic importance. */
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
  /** True only for the small set of genuinely headline concepts - see
   * `pickKeyConcepts`. Drives the distinct highlight ring in the renderer. */
  keyConcept: boolean;
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

const DIRECTED_TYPES = new Set([
  "PREREQUISITE_FOR",
  "BUILDS_ON",
  "prerequisite",
]);

/**
 * Importance becomes visual territory. A convex curve (rather than the
 * sqrt this used to be) is deliberate: it compresses the many average
 * concepts toward the small end and stretches the few genuinely important
 * ones toward the large end, so key concepts read as obviously bigger
 * rather than blending into a crowd of similarly-sized dots.
 */
function conceptRadius(importance: number): number {
  const clamped = Math.max(0, Math.min(1, importance));
  return 14 + Math.pow(clamped, 1.6) * 52;
}

/** A restrained, seeded resource variation with no academic meaning. */
function resourceRadius(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return 18 + (Math.abs(hash) % 5);
}

/** Near-1.0, "this is a headline concept of the course" territory. Real
 * importance scores saturate at 1.0 for a large minority of concepts (not a
 * smooth spread), so this threshold alone is not selective enough - it is
 * combined with a hard cap below. */
const KEY_CONCEPT_IMPORTANCE = 0.97;

/**
 * Only the true headline concepts should read as visually distinct - not a
 * quarter of the graph. Importance saturates at 1.0 for many concepts at
 * once, so ties are broken by how connected a concept is (more prerequisite/
 * downstream/related edges = more structurally central), then by id for
 * determinism. The cap scales with course size but stays small.
 */
function pickKeyConcepts(
  conceptNodes: ConceptGraphNode[],
  adjacency: Map<string, Set<string>>,
): Set<string> {
  const candidates = conceptNodes.filter(
    (n) => n.concept.importance >= KEY_CONCEPT_IMPORTANCE,
  );
  const cap = Math.max(6, Math.round(conceptNodes.length * 0.05));
  if (candidates.length <= cap) return new Set(candidates.map((n) => n.id));

  const degree = (id: string) => adjacency.get(id)?.size ?? 0;
  candidates.sort((a, b) => {
    if (a.concept.importance !== b.concept.importance) {
      return b.concept.importance - a.concept.importance;
    }
    const byDegree = degree(b.id) - degree(a.id);
    if (byDegree !== 0) return byDegree;
    return a.id.localeCompare(b.id);
  });
  return new Set(candidates.slice(0, cap).map((n) => n.id));
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
      radius: conceptRadius(concept.importance),
      weight: concept.importance,
      concept,
      state: concept.state,
      discoveryState: concept.discovery_state,
      isPersonal: concept.scope !== "course",
      // Finalised below, once adjacency exists to break importance ties.
      keyConcept: false,
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

  const conceptNodes = nodes.filter(
    (n): n is ConceptGraphNode => n.kind === "concept",
  );
  const keyConceptIds = pickKeyConcepts(conceptNodes, adjacency);
  for (const n of conceptNodes) n.keyConcept = keyConceptIds.has(n.id);

  return { nodes, links, byId, adjacency, incident };
}

// ---------------------------------------------------------------------------
// Lenses. These change emphasis only - they never recompute semantic state.
// ---------------------------------------------------------------------------

export type Lens = "all" | "mine" | "weak" | "frontier";

export const LENSES: { id: Lens; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "Concepts and connected material" },
  {
    id: "mine",
    label: "My Knowledge",
    hint: "What you have actually worked with",
  },
  { id: "weak", label: "Weak Areas", hint: "Where the engine sees trouble" },
  { id: "frontier", label: "Frontier", hint: "What becomes reachable next" },
];

/**
 * How much understanding a concept "owes" given how important it is. A
 * low-importance topic with mediocre understanding is normal and not worth
 * flagging; a high-importance one needs to actually be understood well
 * before it stops counting as a gap. Scales from a lenient 0.30 at
 * importance 0 up to a demanding 0.85 at importance 1.
 */
function requiredUnderstanding(importance: number): number {
  const clamped = Math.max(0, Math.min(1, importance));
  return 0.3 + clamped * 0.55;
}

/**
 * "Encountered" concepts need to fall further below their importance bar
 * than "active" ones before counting as weak - the Bayesian prior means a
 * barely-assessed concept sits near 0.5 understanding by construction, not
 * necessarily because it's actually weak, so a borderline gap there is much
 * less trustworthy than the same gap on a concept with real evidence behind
 * it (`active`). This is a middle ground: strict enough that "just hasn't
 * been assessed much" mostly stops counting as "confirmed weak", loose
 * enough that clearly-concerning encountered concepts still surface.
 */
const ENCOUNTERED_MARGIN = 0.2;

/**
 * A concept reads as a weak area only when its understanding falls short of
 * what its own importance calls for - not from a flat union of "struggling
 * or fragile or uncertain or stale" states, which flagged most of the graph
 * regardless of whether any given concept actually mattered.
 */
function isWeakArea(node: ConceptGraphNode): boolean {
  const ds = node.discoveryState;
  if (ds !== "active" && ds !== "encountered") return false;
  const understanding = node.concept.understanding;
  if (understanding === null) return false;
  const required = requiredUnderstanding(node.concept.importance);
  return understanding < (ds === "encountered" ? required - ENCOUNTERED_MARGIN : required);
}

/**
 * Which nodes a lens emphasises. Returns null when the lens emphasises
 * everything, so the renderer can skip dimming entirely.
 */
export function lensEmphasis(
  model: GraphModel,
  lens: Lens,
): Set<string> | null {
  if (lens === "all") return null;

  const emphasised = new Set<string>();

  for (const node of model.nodes) {
    if (node.kind === "concept") {
      const hit =
        lens === "mine"
          ? node.discoveryState === "active" ||
            node.discoveryState === "encountered"
          : lens === "weak"
            ? isWeakArea(node)
            : node.discoveryState === "frontier";
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

export function neighbourhood(
  model: GraphModel,
  id: string | null,
): Set<string> | null {
  if (!id) return null;
  const set = new Set<string>([id]);
  for (const n of model.adjacency.get(id) ?? []) set.add(n);
  return set;
}
