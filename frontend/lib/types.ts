// Contracts mirrored from the backend knowledge engine.
// The frontend NEVER computes any of these scores - it only renders them.

export type ConceptScope = "course" | "personal" | "shared_extension";

export type DiscoveryState = "unseen" | "frontier" | "encountered" | "active";

export type ConceptState =
  | "frontier"
  | "exposed"
  | "uncertain"
  | "struggling"
  | "developing"
  | "strong"
  | "mastered"
  | "fragile"
  | "stale";

export interface ConceptNode {
  id: string;
  name: string;
  scope: ConceptScope;
  discovery_state: DiscoveryState;
  cluster?: string;
  importance: number;
  personal_relevance: number;
  /** null = no evidence yet (frontier). 0 = evidence says they don't know it. */
  mastery: number | null;
  familiarity: number;
  confidence: number;
  readiness: number;
  fragility: number;
  state: ConceptState;
}

export interface ConceptEdge {
  source: string;
  target: string;
  type: string;
  origin: "course" | "personal";
  confidence: number;
}

export interface KnowledgeGraphResponse {
  student_id: string;
  course_id: string;
  graph_version: number;
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  hidden_concept_count: number;
}

export type GapAction = "STUDY" | "DIAGNOSE" | "REVIEW" | "OPTIONAL";

export interface Gap {
  concept_id: string;
  concept_name: string;
  mastery: number;
  confidence: number;
  priority: number;
  action: GapAction;
  reason: string;
}

export interface StudyTarget {
  /** Concept id the backend addresses this target by. */
  id: string;
  label: string;
}

export interface GapsResponse {
  target: StudyTarget;
  gaps: Gap[];
}

export interface StudyStep {
  order: number;
  concept_id: string;
  concept_name: string;
  reason: string;
  mastery: number | null;
  resources: Resource[];
}

export interface StudyPlan {
  target: StudyTarget;
  steps: StudyStep[];
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export type SourceOrigin =
  | "instructor"
  | "ta"
  | "student_self"
  | "classmate"
  | "external";

export type ArtifactType =
  | "lecture"
  | "reading"
  | "syllabus"
  | "study_guide"
  | "homework"
  | "quiz"
  | "exam"
  | "solution_key"
  | "student_notes"
  | "classmate_notes"
  | "worked_solution"
  | "handwritten_work"
  | "photo"
  | "course_bundle"
  | "other";

export interface Resource {
  id: string;
  title: string;
  origin: SourceOrigin;
  artifact_type: ArtifactType;
  /** Short human label, e.g. "Primary explanation" */
  role?: string;
}

export type EvidenceKind = "mastery" | "familiarity" | "confidence";
export type EvidencePolarity = "positive" | "negative" | "neutral";

export interface Evidence {
  id: string;
  label: string;
  /** Empty when the backend recorded no graded outcome. */
  detail: string;
  kind: EvidenceKind;
  polarity: EvidencePolarity;
  /** Absent when the evidence event is not linked to a resource. Never
   *  substitute a placeholder - unknown provenance must read as unknown. */
  source?: Resource;
}

export interface ConceptDetail {
  concept_id: string;
  evidence: Evidence[];
  resources: Resource[];
}

export interface WhyExplanation {
  concept_id: string;
  summary: string;
  strongest_evidence?: string;
  weakest_evidence?: string;
  prerequisite_reason?: string;
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

export type UploadStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "complete"
  | "failed";

export interface UploadItem {
  id: string;
  filename: string;
  size: number;
  origin: SourceOrigin;
  artifact_type: ArtifactType;
  status: UploadStatus;
  /** Set when a ZIP expands into multiple documents. */
  child_count?: number;
  concepts_extracted?: number;
  error?: string;
}

export interface IngestResponse {
  resource_id: string;
  status: UploadStatus;
  child_count?: number;
}

export interface CourseResource {
  id: string;
  title: string;
  origin: SourceOrigin;
  artifact_type: ArtifactType;
  concept_count: number;
  /** Concepts this resource explains or assesses. Empty when the backend has
   *  recorded no provenance links - never inferred client-side. */
  concept_ids: string[];
  status: UploadStatus;
  uploaded_at: string;
}
