import {
  MOCK_COURSE,
  MOCK_GAPS,
  MOCK_GRAPH,
  MOCK_RESOURCES,
  MOCK_STUDENT_ID,
  MOCK_STUDY_PLAN,
  mockConceptDetail,
  mockWhy,
} from "./mock";
import type {
  ConceptDetail,
  ConceptEdge,
  ConceptNode,
  CourseResource,
  GapsResponse,
  IngestResponse,
  KnowledgeGraphResponse,
  SourceOrigin,
  ArtifactType,
  StudyPlan,
  WhyExplanation,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

export const COURSE_ID = process.env.NEXT_PUBLIC_COURSE_ID ?? MOCK_COURSE.id;
export const COURSE_NAME = process.env.NEXT_PUBLIC_COURSE_NAME ?? MOCK_COURSE.name;
export const STUDENT_ID = process.env.NEXT_PUBLIC_STUDENT_ID ?? MOCK_STUDENT_ID;

export interface Identity {
  studentId: string;
  courseId: string;
  courseName: string;
}

export interface MeResponse {
  student_id: string;
  courses: { id: string; name: string; code: string | null; term: string | null }[];
}

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;
let identity: Identity = {
  studentId: STUDENT_ID,
  courseId: COURSE_ID,
  courseName: COURSE_NAME,
};
let identityReady = USE_MOCK;
const identityListeners = new Set<() => void>();

export function setApiTokenGetter(getter: TokenGetter | null) {
  tokenGetter = getter;
}

export function getIdentity(): Identity {
  return identity;
}

export function isIdentityReady(): boolean {
  return identityReady;
}

export function setIdentity(next: Partial<Identity>) {
  identity = { ...identity, ...next };
  identityReady = true;
  identityListeners.forEach((fn) => fn());
}

export function onIdentityChange(fn: () => void): () => void {
  identityListeners.add(fn);
  return () => {
    identityListeners.delete(fn);
  };
}

export async function resolveLiveIdentity(): Promise<Identity> {
  const me = await getMe();
  const preferred = process.env.NEXT_PUBLIC_COURSE_ID;
  const course = me.courses.find((c) => c.id === preferred) ?? me.courses[0];
  const next: Identity = {
    studentId: me.student_id,
    courseId: course?.id ?? COURSE_ID,
    courseName: course?.name ?? COURSE_NAME,
  };
  setIdentity(next);
  return next;
}

export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>("/api/me");
}

export async function getWorld() {
  const { studentId, courseId } = identity;
  return request<unknown>(`/api/courses/${courseId}/students/${studentId}/world`);
}

export async function getSharedWorld(token: string) {
  return request<unknown>(`/api/w/${encodeURIComponent(token)}`);
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
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
  getWhy(conceptId: string): Promise<WhyExplanation | null>;
  getGaps(target: string): Promise<GapsResponse>;
  createStudyPlan(target: string): Promise<StudyPlan>;
  listResources(): Promise<CourseResource[]>;
  ingest(input: IngestInput): Promise<IngestResponse>;
}

// ---------------------------------------------------------------------------
// Defensive parsing - a partially-built backend must not crash the UI
// ---------------------------------------------------------------------------

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

function normalizeNode(raw: Record<string, unknown>, index: number): ConceptNode {
  const mastery = raw.mastery;
  return {
    id: str(raw.id, `concept_${index}`),
    name: str(raw.name, "Untitled concept"),
    scope: (str(raw.scope, "course") as ConceptNode["scope"]) ?? "course",
    discovery_state:
      (str(raw.discovery_state, "encountered") as ConceptNode["discovery_state"]) ??
      "encountered",
    cluster: typeof raw.cluster === "string" ? raw.cluster : undefined,
    importance: num(raw.importance, 0.5),
    personal_relevance: num(raw.personal_relevance, 0.5),
    mastery: typeof mastery === "number" && Number.isFinite(mastery) ? mastery : null,
    familiarity: num(raw.familiarity),
    confidence: num(raw.confidence),
    readiness: num(raw.readiness),
    fragility: num(raw.fragility),
    state: (str(raw.state, "exposed") as ConceptNode["state"]) ?? "exposed",
  };
}

function normalizeEdge(raw: Record<string, unknown>): ConceptEdge {
  return {
    source: str(raw.source),
    target: str(raw.target),
    type: str(raw.type, "related"),
    origin: str(raw.origin, "course") === "personal" ? "personal" : "course",
    confidence: num(raw.confidence, 1),
  };
}

export function normalizeGraph(raw: unknown): KnowledgeGraphResponse {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];

  const nodes = rawNodes.map((n, i) => normalizeNode(n as Record<string, unknown>, i));
  const ids = new Set(nodes.map((n) => n.id));

  // Drop dangling edges rather than letting React Flow throw on them.
  const edges = rawEdges
    .map((e) => normalizeEdge(e as Record<string, unknown>))
    .filter((e) => e.source && e.target && ids.has(e.source) && ids.has(e.target));

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
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(`Could not reach the knowledge engine at ${API_URL}.`);
  }
  if (!res.ok) {
    throw new ApiError(`${init?.method ?? "GET"} ${path} failed (${res.status}).`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function coursePath(suffix: string) {
  return `/api/courses/${identity.courseId}${suffix}`;
}

function studentPath(suffix: string) {
  return `${coursePath("")}/students/${identity.studentId}${suffix}`;
}

const httpApi: KnowledgeApi = {
  async getKnowledgeGraph() {
    return normalizeGraph(await request<unknown>(studentPath("/knowledge-graph")));
  },
  async getConceptDetail(conceptId) {
    return request<ConceptDetail>(studentPath(`/concepts/${conceptId}`));
  },
  async getWhy(conceptId) {
    try {
      return await request<WhyExplanation>(studentPath(`/concepts/${conceptId}/why`));
    } catch (err) {
      // Explainability is optional - a 404 is not a failure of the page.
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
  async getGaps(target) {
    return request<GapsResponse>(studentPath(`/gaps?target=${encodeURIComponent(target)}`));
  },
  async createStudyPlan(target) {
    return request<StudyPlan>(studentPath("/study-plan"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
  },
  async listResources() {
    return request<CourseResource[]>(coursePath("/resources"));
  },
  async ingest({ file, origin, artifactType, studentScoped }) {
    const form = new FormData();
    form.append("file", file);
    form.append("source_origin", origin);
    form.append("artifact_type", artifactType);
    const path = studentScoped
      ? studentPath("/resources/ingest")
      : coursePath("/resources/ingest");
    return request<IngestResponse>(path, { method: "POST", body: form });
  },
};

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mockApi: KnowledgeApi = {
  async getKnowledgeGraph() {
    await delay(320);
    return normalizeGraph(MOCK_GRAPH);
  },
  async getConceptDetail(conceptId) {
    await delay(160);
    return mockConceptDetail(conceptId);
  },
  async getWhy(conceptId) {
    await delay(200);
    return mockWhy(conceptId);
  },
  async getGaps() {
    await delay(280);
    return MOCK_GAPS;
  },
  async createStudyPlan(target) {
    await delay(500);
    return { ...MOCK_STUDY_PLAN, target };
  },
  async listResources() {
    await delay(220);
    return MOCK_RESOURCES;
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
