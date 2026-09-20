import {
  MOCK_COURSE,
  MOCK_STUDENT_ID,
  getMockCourseData,
  mockGaps,
  mockStudyPlan,
  mockTargets,
  mockConceptDetail,
} from "./mock";
import type {
  ArtifactType,
  ConceptDetail,
  ConceptEdge,
  ConceptNode,
  CourseResource,
  Evidence,
  GapAction,
  GapsResponse,
  IngestResponse,
  KnowledgeGraphResponse,
  Resource,
  SourceOrigin,
  StudyPlan,
  StudyTarget,
  UnderstandingEntry,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

// Demo identifiers live here only. The backend addresses courses and students
// by UUID; mock mode keeps its own readable ids.
export const COURSE_ID =
  process.env.NEXT_PUBLIC_DEMO_COURSE_ID ?? (USE_MOCK ? MOCK_COURSE.id : "");
export const COURSE_NAME =
  process.env.NEXT_PUBLIC_DEMO_COURSE_NAME ?? MOCK_COURSE.name;
export const STUDENT_ID =
  process.env.NEXT_PUBLIC_DEMO_STUDENT_ID ?? (USE_MOCK ? MOCK_STUDENT_ID : "");

let selectedMockCourseId = MOCK_COURSE.id;
export function setMockCourseId(courseId: string) {
  selectedMockCourseId = courseId;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface IngestInput {
  file: File;
  origin: SourceOrigin;
  artifactType: ArtifactType;
  /** Student-owned material posts to the student-scoped ingest route. */
  studentScoped: boolean;
}

export interface KnowledgeApi {
  getKnowledgeGraph(): Promise<KnowledgeGraphResponse>;
  getConceptDetail(conceptId: string): Promise<ConceptDetail>;
  listUnderstanding(): Promise<UnderstandingEntry[]>;
  listStudyTargets(): Promise<StudyTarget[]>;
  getGaps(target: StudyTarget): Promise<GapsResponse>;
  createStudyPlan(target: StudyTarget): Promise<StudyPlan>;
  listResources(): Promise<CourseResource[]>;
  ingest(input: IngestInput): Promise<IngestResponse>;
}

/**
 * Which ingest route a resource belongs on.
 *
 * Instructor and TA material defines the curriculum, so it shapes the canonical
 * course ontology. Anything the student produced is evidence about *them*.
 * Classmate notes are shared study material rather than evidence of this
 * student's understanding, so it goes to the course side too.
 */
export function isStudentScoped(origin: SourceOrigin): boolean {
  return origin === "student_self";
}

// ---------------------------------------------------------------------------
// Defensive parsing - a partially-built backend must not crash the UI
// ---------------------------------------------------------------------------

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

/** Backend node uses `concept_id`; the UI has always used `id`. */
function normalizeNode(
  raw: Record<string, unknown>,
  index: number,
): ConceptNode {
  const understanding = raw.understanding;
  return {
    id: str(raw.concept_id ?? raw.id, `concept_${index}`),
    name: str(raw.name, "Untitled concept"),
    scope: (str(raw.scope, "course") as ConceptNode["scope"]) ?? "course",
    discovery_state:
      (str(
        raw.discovery_state,
        "encountered",
      ) as ConceptNode["discovery_state"]) ?? "encountered",
    cluster: typeof raw.cluster === "string" ? raw.cluster : undefined,
    importance: num(raw.importance, 0.5),
    personal_relevance: num(raw.personal_relevance, 0.5),
    understanding:
      typeof understanding === "number" && Number.isFinite(understanding)
        ? understanding
        : null,
    // The engine owns this label; never re-derive it here.
    state: (str(raw.state, "exposed") as ConceptNode["state"]) ?? "exposed",
  };
}

/** Backend edge uses `edge_type`; the UI has always used `type`. */
function normalizeEdge(raw: Record<string, unknown>): ConceptEdge {
  return {
    source: str(raw.source),
    target: str(raw.target),
    type: str(raw.edge_type ?? raw.type, "related"),
    origin: str(raw.origin, "course") === "personal" ? "personal" : "course",
    confidence: num(raw.confidence, 1),
  };
}

export function normalizeGraph(raw: unknown): KnowledgeGraphResponse {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];

  const nodes = rawNodes.map((n, i) =>
    normalizeNode(n as Record<string, unknown>, i),
  );
  const ids = new Set(nodes.map((n) => n.id));

  // Drop dangling edges rather than letting React Flow throw on them.
  const edges = rawEdges
    .map((e) => normalizeEdge(e as Record<string, unknown>))
    .filter(
      (e) => e.source && e.target && ids.has(e.source) && ids.has(e.target),
    );

  return {
    student_id: str(obj.student_id, STUDENT_ID),
    course_id: str(obj.course_id, COURSE_ID),
    graph_version: num(obj.graph_version, 0),
    nodes,
    edges,
    hidden_concept_count: num(obj.hidden_concept_count, 0),
  };
}

// ---------------------------------------------------------------------------
// HTTP implementation
// ---------------------------------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!COURSE_ID || !STUDENT_ID) {
    throw new ApiError(
      "No demo course/student configured. Set NEXT_PUBLIC_DEMO_COURSE_ID and NEXT_PUBLIC_DEMO_STUDENT_ID.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(`Could not reach the knowledge engine at ${API_URL}.`);
  }

  if (!res.ok) {
    // FastAPI puts the useful message in `detail`; surface that, not a stack.
    let detail = `${init?.method ?? "GET"} ${path} failed (${res.status}).`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail) && body.detail.length > 0) {
        detail = JSON.stringify(body.detail[0]);
      }
    } catch {
      /* non-JSON error body; keep the generic message */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const base = () => `/api/courses/${COURSE_ID}`;
const studentBase = () => `${base()}/students/${STUDENT_ID}`;

// --- adapters -------------------------------------------------------------

interface BackendResource {
  id: string;
  title: string;
  origin: string;
  artifact_type: string;
  status: string;
  concept_count: number;
  concept_ids?: string[];
  created_at?: string | null;
}

function toResource(r: BackendResource, role?: string): Resource {
  return {
    id: r.id,
    title: r.title,
    origin: r.origin as SourceOrigin,
    artifact_type: r.artifact_type as ArtifactType,
    role,
  };
}

function humanize(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const httpApi: KnowledgeApi = {
  async getKnowledgeGraph() {
    return normalizeGraph(
      await request<unknown>(`${studentBase()}/knowledge-graph`),
    );
  },

  async getConceptDetail(conceptId) {
    const raw = await request<{
      concept_id: string;
      name: string;
      evidence: {
        id: string;
        type: string;
        outcome: number | null;
        strength: number;
        certainty: number;
        occurred_at: string;
        resource_id: string | null;
      }[];
      resources: {
        resource_id: string;
        title: string;
        origin: string;
        artifact_type: string;
      }[];
    }>(`${studentBase()}/concepts/${conceptId}`);

    const resources = raw.resources.map((resource) =>
      toResource({
        id: resource.resource_id,
        title: resource.title,
        origin: resource.origin,
        artifact_type: resource.artifact_type,
        status: "complete",
        concept_count: 0,
      }),
    );
    const resourceById = new Map(
      resources.map((resource) => [resource.id, resource]),
    );
    return {
      concept_id: raw.concept_id,
      evidence: raw.evidence.map((e, i) => {
        return {
          id: e.id || `${conceptId}_${i}`,
          label:
            resourceById.get(e.resource_id ?? "")?.title ?? humanize(e.type),
          // Outcome is the backend's graded result; only formatted here.
          // No outcome means no score to show - not a score of zero.
          detail:
            e.outcome === null || e.outcome === undefined
              ? ""
              : `${Math.round(e.outcome * 100)}%`,
          kind: "understanding",
          // Presentation cue only - a direction read off the backend's own
          // outcome, not a recomputed score.
          polarity:
            e.outcome === null || e.outcome === undefined
              ? "neutral"
              : e.outcome >= 0.5
                ? "positive"
                : "negative",
          source: resourceById.get(e.resource_id ?? ""),
        } satisfies Evidence;
      }),
      resources: resources.map((resource) => ({
        ...resource,
        role: "Course material",
      })),
    };
  },

  async listUnderstanding() {
    const raw = await request<{
      concepts: {
        concept_id: string;
        name: string;
        discovery_state: string;
        understanding: number | null;
        positive_evidence: number;
        negative_evidence: number;
        last_evidence_at: string | null;
        last_practiced_at: string | null;
      }[];
    }>(`${studentBase()}/understanding`);
    return raw.concepts.map((concept) => ({
      ...concept,
      discovery_state:
        concept.discovery_state as UnderstandingEntry["discovery_state"],
    }));
  },

  async listStudyTargets() {
    // The backend addresses targets by concept id, so the student's own graph
    // supplies the choices. Ordering is the engine's importance value.
    const graph = await httpApi.getKnowledgeGraph();
    return [...graph.nodes]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 12)
      .map((n) => ({ id: n.id, label: n.name }));
  },

  async getGaps(target) {
    const raw = await request<{
      gaps: {
        concept_id: string;
        name: string;
        understanding: number;
        priority: number;
        action: string;
        reason: string;
      }[];
    }>(
      `${studentBase()}/gaps?target_concept_id=${encodeURIComponent(target.id)}`,
    );

    return {
      target,
      gaps: raw.gaps.map((g) => ({
        concept_id: g.concept_id,
        concept_name: g.name,
        understanding: g.understanding,
        priority: g.priority,
        // Backend enum is lowercase; the UI labels are uppercase.
        action: g.action.toUpperCase() as GapAction,
        reason: g.reason,
      })),
    };
  },

  async createStudyPlan(target) {
    const raw = await request<{
      target_concept_id: string;
      gaps: {
        concept_id: string;
        name: string;
        understanding: number;
        priority: number;
        action: string;
        reason: string;
      }[];
      study_order: string[];
    }>(`${studentBase()}/study-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_concept_id: target.id }),
    });

    const byConcept = new Map(raw.gaps.map((g) => [g.concept_id, g]));

    // Order comes from the backend's traversal. Never re-sorted here.
    const steps = raw.study_order.map((conceptId, i) => {
      const gap = byConcept.get(conceptId);
      return {
        order: i + 1,
        concept_id: conceptId,
        concept_name: gap?.name ?? "(unknown concept)",
        reason: gap?.reason ?? "Required on the path to your target.",
        understanding: gap ? gap.understanding : null,
        resources: [] as Resource[],
      };
    });

    return { target, steps };
  },

  async listResources() {
    const raw = await request<BackendResource[]>(`${base()}/resources`);
    return raw.map((r) => ({
      id: r.id,
      title: r.title,
      origin: r.origin as SourceOrigin,
      artifact_type: r.artifact_type as ArtifactType,
      concept_count: r.concept_count,
      concept_ids: r.concept_ids ?? [],
      status: (r.status === "complete"
        ? "complete"
        : r.status) as CourseResource["status"],
      uploaded_at: r.created_at ?? "",
    }));
  },

  async ingest({ file, origin, artifactType, studentScoped }) {
    const form = new FormData();
    form.append("file", file);
    // Backend field is `origin`, not `source_origin`.
    form.append("origin", origin);
    form.append("artifact_type", artifactType);

    const path = studentScoped
      ? `${studentBase()}/resources/ingest`
      : `${base()}/resources/ingest`;

    const raw = await request<{
      resource_id: string;
      status: string;
      child_count?: number | null;
      child_failures?: string[];
    }>(path, { method: "POST", body: form });

    return {
      resource_id: raw.resource_id,
      // Ingestion is synchronous, so a 200 means processing already finished.
      status: "complete",
      child_count: raw.child_count ?? undefined,
    };
  },
};

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mockApi: KnowledgeApi = {
  async getKnowledgeGraph() {
    await delay(320);
    return normalizeGraph(getMockCourseData(selectedMockCourseId).graph);
  },
  async getConceptDetail(conceptId) {
    await delay(160);
    return mockConceptDetail(selectedMockCourseId, conceptId);
  },
  async listUnderstanding() {
    await delay(120);
    return getMockCourseData(selectedMockCourseId).graph.nodes.map(
      (node, index) => ({
        concept_id: node.id,
        name: node.name,
        discovery_state: node.discovery_state,
        understanding: node.understanding,
        positive_evidence:
          node.understanding === null ? 0 : 1.5 + ((index * 7) % 6) / 2,
        negative_evidence:
          node.understanding === null ? 0 : ((index * 5) % 5) / 2,
        last_evidence_at:
          node.understanding === null
            ? null
            : `2026-09-${String(20 - (index % 8)).padStart(2, "0")}T00:00:00Z`,
        last_practiced_at:
          node.understanding === null
            ? null
            : `2026-09-${String(19 - (index % 7)).padStart(2, "0")}T00:00:00Z`,
      }),
    );
  },
  async listStudyTargets() {
    await delay(80);
    return mockTargets(selectedMockCourseId);
  },
  async getGaps(target) {
    await delay(280);
    return mockGaps(selectedMockCourseId, target);
  },
  async createStudyPlan(target) {
    await delay(500);
    return mockStudyPlan(selectedMockCourseId, target);
  },
  async listResources() {
    await delay(220);
    return getMockCourseData(selectedMockCourseId).resources;
  },
  async ingest({ file }) {
    await delay(400);
    return {
      resource_id: `mock_${file.name}`,
      status: "processing",
      child_count: file.name.toLowerCase().endsWith(".zip") ? 8 : undefined,
    };
  },
};

export const api: KnowledgeApi = USE_MOCK ? mockApi : httpApi;
