import type { ArtifactType, ConceptNode, CourseResource, IngestResponse, SourceOrigin } from "@/lib/types";
import { constellationFamily } from "./constellation-families";
import { displayConceptName } from "./concept-labels";
import { ingestionResourcesForCourse, mergeVisibleFiles } from "./sandbox-roster";

const demoUploads = new Map<string, CourseResource[]>();
const demoNodes = new Map<string, ConceptNode[]>();
let demoSeq = 0;

export function clearDemoUploads(): void {
  demoUploads.clear();
  demoNodes.clear();
  demoSeq = 0;
}

export function demoUploadsForCourse(courseId: string): CourseResource[] {
  return demoUploads.get(courseId) ?? [];
}

export function visibleCourseFiles(courseId: string, live: readonly CourseResource[] = []): CourseResource[] {
  return mergeVisibleFiles(courseId, [...live, ...demoUploadsForCourse(courseId)]);
}

export function visibleCourseFileTitles(courseId: string, live: readonly CourseResource[] = []): string[] {
  return visibleCourseFiles(courseId, live).map((file) => file.title);
}

export function canDemoIngest(courseId: string | null | undefined): boolean {
  return Boolean(courseId && ingestionResourcesForCourse(courseId).length > 0);
}

export function rememberDemoUpload(
  courseId: string,
  title: string,
  origin: SourceOrigin,
  artifactType: ArtifactType,
): CourseResource {
  const resource: CourseResource = {
    id: `${courseId}:demo-upload:${++demoSeq}:${title}`,
    title,
    origin,
    artifact_type: artifactType,
    concept_count: 0,
    concept_ids: [],
    status: "complete",
    uploaded_at: new Date().toISOString(),
  };
  const next = [...demoUploadsForCourse(courseId), resource];
  demoUploads.set(courseId, next);
  return resource;
}

function conceptNameFromFile(title: string): string {
  const stem = title.replace(/\\/g, "/").split("/").pop() ?? title;
  return displayConceptName(stem.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
}

export function rememberSemanticNode(courseId: string, title: string): ConceptNode {
  const name = conceptNameFromFile(title);
  const node: ConceptNode = {
    id: `${courseId}:demo-concept:${++demoSeq}:${title}`,
    name,
    scope: "personal",
    discovery_state: "encountered",
    cluster: "Uploaded notes",
    constellation: constellationFamily("Uploaded notes", name) ?? "Lagrangian mechanics",
    importance: 0.55,
    personal_relevance: 1,
    mastery: 0.42,
    familiarity: 0.5,
    confidence: 0.44,
    readiness: 0.38,
    fragility: 0.2,
    state: "developing",
  };
  demoNodes.set(courseId, [...(demoNodes.get(courseId) ?? []), node]);
  return node;
}

export function demoGraphExtras(courseId: string): ConceptNode[] {
  return demoNodes.get(courseId) ?? [];
}

/** Queue succeeds locally when Railway 403s the Clerk caller. */
export function demoIngestFallback(
  courseId: string,
  file: { name: string },
  origin: SourceOrigin,
  artifactType: ArtifactType,
): IngestResponse {
  const resource = rememberDemoUpload(courseId, file.name, origin, artifactType);
  const node = rememberSemanticNode(courseId, file.name);
  resource.concept_ids = [node.id];
  resource.concept_count = 1;
  return {
    resource_id: resource.id,
    status: "complete",
    concepts_touched: [node.id],
    analysis_pending: false,
  };
}
