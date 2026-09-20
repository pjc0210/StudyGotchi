import fixture from "@/lib/world/fixture.json";
import type { components } from "@/lib/api/schema";
import { API_URL } from "./config";
import { credentialHeaders, getIdentity, type CourseSummary } from "./identity";
import { studentIdForCourse } from "./world/demo-courses";
import { pipelineGraphForCourse, pipelineWorldForCourse } from "./world/pipeline-assets";
import { canDemoIngest, demoGraphExtras, demoIngestFallback, demoUploadsForCourse, rememberSemanticNode } from "./world/demo-ingest";
import { enrichPipelineNode, pipelineConceptDetail, weakAreaTracks, withPipelineSources } from "./world/pipeline-understanding";
import {
  emptyWorldForCourse,
  ingestionResourcesForCourse,
  isThinSandboxCourse,
  mergeVisibleFiles,
} from "./world/sandbox-roster";
import {
  MOCK_GAPS,
  MOCK_GRAPH,
  MOCK_RESOURCES,
  MOCK_STUDY_PLAN,
  MOCK_TARGETS,
  mockConceptDetail,
  mockWhy,
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
  WhyExplanation,
} from "./types";

export { USE_MOCK, API_URL, DEV_STUDENT_ID } from "./config";

export type WorldResponse = components["schemas"]["WorldResponse"];
export type WorldEvent = components["schemas"]["WorldEventOut"];
export type WorldEventKind = components["schemas"]["WorldEventKind"];
export type MeResponse = { student_id: string; courses: CourseSummary[] };

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
  /** Land that should list the file when Railway 403s the Clerk caller. */
  courseId?: string;
}

export interface KnowledgeApi {
  getKnowledgeGraph(): Promise<KnowledgeGraphResponse>;
  getConceptDetail(conceptId: string): Promise<ConceptDetail>;
  getWhy(conceptId: string): Promise<WhyExplanation | null>;
  listStudyTargets(): Promise<StudyTarget[]>;
  getGaps(target: StudyTarget): Promise<GapsResponse>;
  createStudyPlan(target: StudyTarget): Promise<StudyPlan>;
  listResources(): Promise<CourseResource[]>;
  listResourcesForCourse(courseId: string): Promise<CourseResource[]>;
  ingest(input: IngestInput): Promise<IngestResponse>;
  getResourceStatus(resourceId: string): Promise<ResourceStatus>;
  getMe(): Promise<MeResponse>;
  listCourses(): Promise<CourseSummary[]>;
  getWorld(): Promise<WorldResponse>;
  getWorldForCourse(courseId: string): Promise<WorldResponse>;
  getSharedWorld(token: string): Promise<WorldResponse>;
  getWorldEvents(since?: string, limit?: number): Promise<WorldEvent[]>;
}

/** Per-file status the upload queue polls after a 202. */
export interface ResourceStatus {
  resource_id: string;
  title: string;
  status: string;
  error: string | null;
  phase_a_ms: number | null;
  phase_b_ms: number | null;
}

/**
 * Which ingest route a resource belongs on.
 *
 * Instructor and TA material defines the curriculum, so it shapes the canonical
 * course ontology. Anything the student produced is evidence about *them*.
 * Classmate notes are shared study material rather than evidence of this
 * student's mastery, so they go to the course side too.
 */
export function isStudentScoped(origin: SourceOrigin): boolean {
  return origin === "student_self";
}

// ---------------------------------------------------------------------------
// Defensive parsing - a partially-built backend must not crash the UI
// ---------------------------------------------------------------------------

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

/** Backend node uses `concept_id`; the UI has always used `id`. */
function normalizeNode(raw: Record<string, unknown>, index: number, courseId: string): ConceptNode {
  const understanding = raw.understanding ?? raw.mastery;
  const node: ConceptNode = {
    id: str(raw.concept_id ?? raw.id, `concept_${index}`),
    name: str(raw.name, "Untitled concept"),
    scope: (str(raw.scope, "course") as ConceptNode["scope"]) ?? "course",
    discovery_state:
      (str(raw.discovery_state, "encountered") as ConceptNode["discovery_state"]) ?? "encountered",
    cluster: typeof raw.cluster === "string" ? raw.cluster : undefined,
    cluster_id: typeof raw.cluster_id === "string" ? raw.cluster_id : undefined,
    importance: num(raw.importance, 0.5),
    personal_relevance: num(raw.personal_relevance, 0.5),
    mastery: typeof understanding === "number" && Number.isFinite(understanding) ? understanding : null,
    familiarity: num(raw.familiarity),
    confidence: num(raw.confidence),
    readiness: num(raw.readiness),
    fragility: num(raw.fragility),
    // Pipeline overlay fills dashes; live engine labels stay when present.
    state: (str(raw.state, "exposed") as ConceptNode["state"]) ?? "exposed",
  };
  return enrichPipelineNode(node, courseId);
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

/**
 * Railway 403s ("Not your world") when Clerk's caller is not the pipeline
 * student. The locked demo still has a sky — use it instead of an empty page.
 */
export function liveOrPipeline<T>(fallback: T | null, error: unknown): T {
  if (fallback) return fallback;
  throw error;
}

export function isSandboxWorldError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 403) return true;
  return /not your world/i.test(error.message);
}

/** An empty live payload is the same as a failed one: keep the demo sky up. */
export function populatedOrPipelineGraph(
  courseId: string,
  live: KnowledgeGraphResponse,
): KnowledgeGraphResponse {
  if (live.nodes.length > 0) return live;
  const pipeline = pipelineGraphForCourse(courseId);
  return pipeline ? normalizeGraph(pipeline) : live;
}

/** Immediate sky, same idea as seeding 8.223 + 6.1400 on /earth. */
export function seededKnowledgeGraph(
  courseId: string = getIdentity().courseId,
): KnowledgeGraphResponse | null {
  const pipeline = pipelineGraphForCourse(courseId);
  return pipeline ? normalizeGraph(pipeline) : null;
}

export function normalizeGraph(raw: unknown): KnowledgeGraphResponse {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];
  const courseId = str(obj.course_id, getIdentity().courseId);

  const nodes = rawNodes.map((n, i) => normalizeNode(n as Record<string, unknown>, i, courseId));
  const seen = new Set(nodes.map((n) => n.id));
  for (const extra of demoGraphExtras(courseId)) {
    if (seen.has(extra.id)) continue;
    seen.add(extra.id);
    nodes.push(extra);
  }
  const ids = seen;

  // Drop dangling edges rather than letting the canvas throw on them.
  const edges = rawEdges
    .map((e) => normalizeEdge(e as Record<string, unknown>))
    .filter((e) => e.source && e.target && ids.has(e.source) && ids.has(e.target));

  return {
    student_id: str(obj.student_id, getIdentity().studentId),
    course_id: courseId,
    graph_version: str(obj.graph_version, String(num(obj.graph_version, 0))),
    nodes,
    edges,
    hidden_concept_count: num(obj.hidden_concept_count, 0),
  };
}

// ---------------------------------------------------------------------------
// HTTP implementation
// ---------------------------------------------------------------------------

// GETs remember their ETag so a poll that changed nothing costs a 304, not a body.
const responseCache = new Map<string, { etag: string; body: unknown }>();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  for (const [key, value] of Object.entries(await credentialHeaders())) headers.set(key, value);
  const method = (init?.method ?? "GET").toUpperCase();
  const cached = method === "GET" ? responseCache.get(path) : undefined;
  if (cached) headers.set("If-None-Match", cached.etag);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(`Could not reach the knowledge engine at ${API_URL}.`);
  }

  if (res.status === 304 && cached) return cached.body as T;

  if (!res.ok) {
    // FastAPI puts the useful message in `detail`; surface that, not a stack.
    let detail = `${method} ${path} failed (${res.status}).`;
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
  const body = (await res.json()) as T;
  const etag = res.headers.get("ETag");
  if (method === "GET" && etag) responseCache.set(path, { etag, body });
  return body;
}

function requireIdentity() {
  if (!getIdentity().ready) {
    throw new ApiError("Sign in and pick a course first.");
  }
}

const base = () => `/api/courses/${getIdentity().courseId}`;
const studentBase = () => {
  const { courseId, studentId } = getIdentity();
  return `${base()}/students/${studentIdForCourse(courseId, studentId)}`;
};
const courseBase = (courseId: string) => `/api/courses/${encodeURIComponent(courseId)}`;

export function courseResourcesPath(courseId: string): string {
  return `${courseBase(courseId)}/resources`;
}

export function studentCourseWorldPath(
  studentId: string,
  courseId: string,
): string {
  return `${courseBase(courseId)}/students/${encodeURIComponent(studentId)}/world`;
}

/** Forget cached GET bodies, e.g. when the course changes or a file lands. */
export function invalidateApiCache() {
  responseCache.clear();
}

// --- adapters -------------------------------------------------------------

export interface BackendResource {
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

const LINK_ROLE: Record<string, string> = {
  EXPLAINED_IN: "Primary explanation",
  WORKED_EXAMPLE_IN: "Worked example",
  ASSESSED_IN: "Assessed here",
  APPEARS_IN: "Mentioned in",
};

/** Which score an evidence type feeds. Mirrors the backend taxonomy. */
const EVIDENCE_KIND: Record<string, Evidence["kind"]> = {
  graded_exam: "mastery",
  graded_quiz: "mastery",
  graded_homework: "mastery",
  diagnostic: "mastery",
  verified_practice: "mastery",
  worked_solution: "mastery",
  student_notes: "familiarity",
  resource_view: "familiarity",
  self_explanation: "confidence",
  self_rating: "confidence",
};

function humanize(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface BackendGap {
  concept_id: string;
  name: string;
  understanding?: number;
  mastery?: number;
  confidence?: number;
  priority: number;
  action: string;
  reason: string;
}

function toGap(g: BackendGap) {
  return {
    concept_id: g.concept_id,
    concept_name: g.name,
    mastery: g.understanding ?? g.mastery ?? 0,
    confidence: g.confidence ?? 0,
    priority: g.priority,
    // Backend enum is lowercase; the UI labels are uppercase.
    action: g.action.toUpperCase() as GapAction,
    reason: g.reason,
  };
}

/** The status vocabulary the queue understands, from the engine's per-file states. */
function toUploadStatus(status: string): IngestResponse["status"] {
  switch (status) {
    case "processed":
    case "complete":
    case "unchanged":
    case "empty":
      return "complete";
    case "failed":
      return "failed";
    default:
      return "processing";
  }
}

export function normalizeCourseResources(raw: BackendResource[]): CourseResource[] {
  return raw.map((resource) => ({
    id: resource.id,
    title: resource.title,
    origin: resource.origin as SourceOrigin,
    artifact_type: resource.artifact_type as ArtifactType,
    concept_count: resource.concept_count,
    concept_ids: resource.concept_ids ?? [],
    status: toUploadStatus(resource.status),
    uploaded_at: resource.created_at ?? "",
  }));
}

const httpApi: KnowledgeApi = {
  async getKnowledgeGraph() {
    requireIdentity();
    const courseId = getIdentity().courseId;
    try {
      const live = normalizeGraph(
        await request<unknown>(`${studentBase()}/knowledge-graph`, {
          signal: AbortSignal.timeout(2500),
        }),
      );
      return populatedOrPipelineGraph(courseId, live);
    } catch (error) {
      return normalizeGraph(liveOrPipeline(pipelineGraphForCourse(courseId), error));
    }
  },

  async getConceptDetail(conceptId) {
    requireIdentity();
    const courseId = getIdentity().courseId;
    const fallback = pipelineConceptDetail(courseId, conceptId);
    try {
      const raw = await request<{
        concept_id: string;
        name: string;
        evidence: {
          evidence_type: string;
          outcome: number | null;
          strength: number;
          certainty: number;
          occurred_at: string;
          resource: BackendResource | null;
        }[];
        resources: { resource: BackendResource; link_type: string; depth_score: number }[];
      }>(`${studentBase()}/concepts/${conceptId}`);

      const detail = {
        concept_id: raw.concept_id,
        evidence: raw.evidence.map((e, i) => {
          return {
            id: `${conceptId}_${i}`,
            label: e.resource?.title ?? humanize(e.evidence_type),
            detail: e.outcome === null || e.outcome === undefined ? "" : `${Math.round(e.outcome * 100)}%`,
            kind: EVIDENCE_KIND[e.evidence_type] ?? "familiarity",
            polarity:
              e.outcome === null || e.outcome === undefined
                ? "neutral"
                : e.outcome >= 0.5
                  ? "positive"
                  : "negative",
            source: e.resource ? toResource(e.resource) : undefined,
          } satisfies Evidence;
        }),
        resources: raw.resources.map((r) => toResource(r.resource, LINK_ROLE[r.link_type] ?? humanize(r.link_type))),
      };
      if (detail.resources.length === 0 && fallback) return fallback;
      return detail;
    } catch (error) {
      if (fallback) return fallback;
      throw error;
    }
  },

  async getWhy() {
    // The engine exposes no explainability endpoint yet. Returning null makes
    // the inspector hide the section rather than invent a narrative.
    return null;
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
    requireIdentity();
    try {
      const raw = await request<{ gaps: BackendGap[] }>(
        `${studentBase()}/gaps?target_concept_id=${encodeURIComponent(target.id)}`,
      );
      if (raw.gaps.length > 0) return { target, gaps: raw.gaps.map(toGap) };
    } catch (error) {
      if (!isSandboxWorldError(error)) throw error;
    }
    const graph = await httpApi.getKnowledgeGraph();
    const tracks = weakAreaTracks(graph.nodes);
    return {
      target,
      gaps: tracks.flatMap((track, index) =>
        track.conceptIds.slice(0, 1).map((conceptId) => {
          const node = graph.nodes.find((item) => item.id === conceptId);
          return {
            concept_id: conceptId,
            concept_name: track.label,
            mastery: track.mastery,
            confidence: node?.confidence ?? track.mastery,
            priority: Math.max(0.2, 1 - track.mastery - index * 0.04),
            action: "STUDY" as const,
            reason: `${track.count} ideas in this cluster need work.`,
          };
        }),
      ),
    };
  },

  async createStudyPlan(target) {
    requireIdentity();
    const raw = await request<{
      target_concept_id: string;
      gaps: BackendGap[];
      study_order: string[];
    }>(`${studentBase()}/study-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_concept_id: target.id }),
    });

    const byConcept = new Map(raw.gaps.map((g) => [g.concept_id, toGap(g)]));

    // Order comes from the backend's traversal. Never re-sorted here.
    const steps = raw.study_order.map((conceptId, i) => {
      const gap = byConcept.get(conceptId);
      return {
        order: i + 1,
        concept_id: conceptId,
        concept_name: gap?.concept_name ?? "(unknown concept)",
        reason: gap?.reason ?? "Required on the path to your target.",
        mastery: gap ? gap.mastery : null,
        resources: [] as Resource[],
      };
    });

    return { target, steps };
  },

  async listResources() {
    requireIdentity();
    const courseId = getIdentity().courseId;
    try {
      const raw = await request<BackendResource[]>(`${base()}/resources`);
      return withPipelineSources(courseId, [
        ...normalizeCourseResources(raw),
        ...demoUploadsForCourse(courseId),
      ]);
    } catch (error) {
      if (isSandboxWorldError(error) && canDemoIngest(courseId)) {
        return withPipelineSources(courseId, demoUploadsForCourse(courseId));
      }
      throw error;
    }
  },

  async listResourcesForCourse(courseId) {
    requireIdentity();
    const raw = await request<BackendResource[]>(courseResourcesPath(courseId));
    return normalizeCourseResources(raw);
  },

  async ingest({ file, origin, artifactType, studentScoped, courseId: landCourseId }) {
    requireIdentity();
    const form = new FormData();
    form.append("file", file);
    // Backend field is `origin`, not `source_origin`.
    form.append("origin", origin);
    form.append("artifact_type", artifactType);

    const path = studentScoped ? `${studentBase()}/resources/ingest` : `${base()}/resources/ingest`;
    const courseId = landCourseId || getIdentity().courseId;

    try {
      const raw = await request<{
        resource_id: string;
        status: string;
        analysis?: string;
        concepts_touched?: string[];
        child_count?: number | null;
        child_failures?: string[];
      }>(path, { method: "POST", body: form });

      invalidateApiCache();
      // Course files finish on the request. Student files answer after the fast
      // phase; the queue keeps polling while the analysis runs in the background.
      const analysisPending = studentScoped && raw.analysis === "queued";
      const touched = raw.concepts_touched ?? [];
      if (touched.length === 0 && canDemoIngest(courseId)) {
        touched.push(rememberSemanticNode(courseId, file.name).id);
      }
      return {
        resource_id: raw.resource_id,
        status: analysisPending ? "processing" : toUploadStatus(raw.status),
        child_count: raw.child_count ?? undefined,
        concepts_touched: touched,
        analysis_pending: analysisPending,
      };
    } catch (error) {
      if (isSandboxWorldError(error) && canDemoIngest(courseId)) {
        invalidateApiCache();
        return demoIngestFallback(courseId, file, origin, artifactType);
      }
      throw error;
    }
  },

  async getResourceStatus(resourceId) {
    requireIdentity();
    return request<ResourceStatus>(`${studentBase()}/resources/${resourceId}`);
  },

  async getMe() {
    return request<MeResponse>("/api/me");
  },

  async listCourses() {
    return request<CourseSummary[]>("/api/courses");
  },

  async getWorld() {
    requireIdentity();
    try {
      return await request<WorldResponse>(`${studentBase()}/world`);
    } catch (error) {
      return liveOrPipeline(pipelineWorldForCourse(getIdentity().courseId), error);
    }
  },

  async getWorldForCourse(courseId) {
    requireIdentity();
    const { studentId } = getIdentity();
    try {
      return await request<WorldResponse>(
        studentCourseWorldPath(studentIdForCourse(courseId, studentId), courseId),
      );
    } catch (error) {
      return liveOrPipeline(pipelineWorldForCourse(courseId), error);
    }
  },

  async getSharedWorld(token) {
    return request<WorldResponse>(`/api/w/${encodeURIComponent(token)}`);
  },

  async getWorldEvents(since, limit = 100) {
    requireIdentity();
    const params = new URLSearchParams({ limit: String(limit) });
    if (since) params.set("since", since);
    const raw = await request<{ events: WorldEvent[] }>(`${studentBase()}/world-events?${params}`);
    return raw.events ?? [];
  },
};

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function mockWorldForCourse(courseId: string): WorldResponse {
  const pipeline = pipelineWorldForCourse(courseId);
  if (pipeline) return pipeline;
  if (isThinSandboxCourse(courseId)) return emptyWorldForCourse(courseId);
  const world = fixture as WorldResponse;
  return {
    ...world,
    course_id: courseId,
    regions: world.regions.map((region) => ({ ...region })),
    edges: world.edges.map((edge) => ({ ...edge })),
  };
}

export function cloneMockResources(): CourseResource[] {
  return MOCK_RESOURCES.map((resource) => ({
    ...resource,
    concept_ids: [...resource.concept_ids],
  }));
}

const mockApi: KnowledgeApi = {
  async getKnowledgeGraph() {
    await delay(320);
    const pipeline = pipelineGraphForCourse(getIdentity().courseId);
    return normalizeGraph(pipeline ?? MOCK_GRAPH);
  },
  async getConceptDetail(conceptId) {
    await delay(160);
    return pipelineConceptDetail(getIdentity().courseId, conceptId) ?? mockConceptDetail(conceptId);
  },
  async getWhy(conceptId) {
    await delay(200);
    return mockWhy(conceptId);
  },
  async listStudyTargets() {
    await delay(80);
    return MOCK_TARGETS.map((label, i) => ({ id: `mock_target_${i}`, label }));
  },
  async getGaps(target) {
    await delay(280);
    const graph = normalizeGraph(pipelineGraphForCourse(getIdentity().courseId) ?? MOCK_GRAPH);
    const tracks = weakAreaTracks(graph.nodes);
    if (tracks.length === 0) return { ...MOCK_GAPS, target };
    return {
      target,
      gaps: tracks.map((track, index) => ({
        concept_id: track.conceptIds[0] ?? `track-${index}`,
        concept_name: track.label,
        mastery: track.mastery,
        confidence: track.mastery,
        priority: Math.max(0.2, 1 - track.mastery),
        action: "STUDY" as const,
        reason: `${track.count} ideas in this cluster need work.`,
      })),
    };
  },
  async createStudyPlan(target) {
    await delay(500);
    return { ...MOCK_STUDY_PLAN, target };
  },
  async listResources() {
    await delay(220);
    const courseId = getIdentity().courseId;
    const catalog = ingestionResourcesForCourse(courseId);
    const extras = demoUploadsForCourse(courseId);
    const merged = catalog.length > 0 ? mergeVisibleFiles(courseId, extras) : [...MOCK_RESOURCES, ...extras];
    return withPipelineSources(courseId, merged);
  },
  async listResourcesForCourse(courseId) {
    await delay(220);
    const catalog = ingestionResourcesForCourse(courseId);
    const extras = demoUploadsForCourse(courseId);
    const merged = catalog.length > 0 ? mergeVisibleFiles(courseId, extras) : [...cloneMockResources(), ...extras];
    return withPipelineSources(courseId, merged);
  },
  async ingest({ file, origin, artifactType, courseId: landCourseId }) {
    await delay(400);
    const courseId = landCourseId || getIdentity().courseId;
    if (canDemoIngest(courseId)) {
      return demoIngestFallback(courseId, file, origin, artifactType);
    }
    const id = `mock_${file.name}_${Date.now()}`;
    mockPolls.set(id, 0);
    const world = fixture as WorldResponse;
    return {
      resource_id: id,
      status: "processing",
      child_count: file.name.toLowerCase().endsWith(".zip") ? 8 : undefined,
      concepts_touched: world.regions.slice(0, 3).map((r) => r.concept_id),
      analysis_pending: true,
    };
  },
  async getResourceStatus(resourceId) {
    await delay(100);
    // Phase B "finishes" on the second poll, so the queue and the island behave as in live mode.
    const polls = (mockPolls.get(resourceId) ?? 0) + 1;
    mockPolls.set(resourceId, polls);
    return {
      resource_id: resourceId,
      title: resourceId,
      status: polls >= 2 ? "processed" : "analyzing",
      error: null,
      phase_a_ms: 400,
      phase_b_ms: polls >= 2 ? 3000 : null,
    };
  },
  async getMe() {
    await delay(60);
    const id = getIdentity();
    return { student_id: id.studentId, courses: id.courses };
  },
  async listCourses() {
    await delay(40);
    return getIdentity().courses;
  },
  async getWorld() {
    await delay(200);
    return mockWorldForCourse(getIdentity().courseId);
  },
  async getWorldForCourse(courseId) {
    await delay(200);
    return mockWorldForCourse(courseId);
  },
  async getSharedWorld() {
    await delay(200);
    return fixture as WorldResponse;
  },
  async getWorldEvents() {
    await delay(120);
    const world = fixture as WorldResponse;
    const now = new Date().toISOString();
    return world.regions.slice(0, 4).map((r, i) => ({
      id: `mock_event_${i}`,
      event: (i % 2 === 0 ? "UNDERSTANDING_GAIN" : "CONCEPT_DISCOVERED") as WorldEventKind,
      concept_id: r.concept_id,
      resource_id: null,
      delta: i % 2 === 0 ? 0.04 : null,
      explanation: i % 2 === 0 ? `${r.name} grew after your last problem set.` : `You reached ${r.name} for the first time.`,
      created_at: now,
    }));
  },
};

const mockPolls = new Map<string, number>();

export const api: KnowledgeApi = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false" ? mockApi : httpApi;
