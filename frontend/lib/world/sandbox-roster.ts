import type { CourseSummary } from "@/lib/identity";
import type { ArtifactType, CourseResource, SourceOrigin } from "@/lib/types";
import type { GlobeBiome } from "@/components/world/globe/globe-types";
import type { WorldResponse } from "./types";
import { DEMO_COURSES, DEMO_HERO_CODE, DEMO_SECOND_CODE, DEMO_STUDENT_ID } from "./demo-courses";
import catalog from "./ingestion-catalog.json";

export interface SandboxCourseRecord extends CourseSummary {
  biome: GlobeBiome;
  fileCount: number;
}

const INGESTION = catalog as Record<
  string,
  { name: string; term: string; files: { title: string; origin: string; artifact_type: string }[] }
>;

/** Product /earth sandbox: every GitHub course-materials archive. */
export const SANDBOX_COURSES: SandboxCourseRecord[] = [
  {
    id: DEMO_COURSES[0].id,
    code: DEMO_HERO_CODE,
    name: "Classical Mechanics II",
    term: INGESTION["8.223"]?.term ?? "Spring 2026",
    biome: "ice",
    fileCount: INGESTION["8.223"]?.files.length ?? 24,
  },
  {
    id: DEMO_COURSES[1].id,
    code: DEMO_SECOND_CODE,
    name: "Computability and Complexity Theory",
    term: INGESTION["6.1400"]?.term ?? "Spring 2026",
    biome: "forest",
    fileCount: INGESTION["6.1400"]?.files.length ?? 23,
  },
  {
    id: "1cb0b349-0ed1-4925-968d-2f703e0f9d42",
    code: "6.1210",
    name: "Introduction to Algorithms",
    term: INGESTION["6.1210"]?.term ?? "Spring 2026",
    biome: "city",
    fileCount: INGESTION["6.1210"]?.files.length ?? 158,
  },
  {
    id: "a1806000-0000-4000-8000-000000000001",
    code: "18.06",
    name: "Linear Algebra",
    term: INGESTION["18.06"]?.term ?? "Spring 2026",
    biome: "meadow",
    fileCount: INGESTION["18.06"]?.files.length ?? 140,
  },
  {
    id: "a1803000-0000-4000-8000-000000000001",
    code: "18.03",
    name: "Differential Equations",
    term: INGESTION["18.03"]?.term ?? "Spring 2026",
    biome: "volcanic",
    fileCount: INGESTION["18.03"]?.files.length ?? 90,
  },
  {
    id: "a8022000-0000-4000-8000-000000000001",
    code: "8.022",
    name: "Physics II: Electricity and Magnetism",
    term: INGESTION["8.022"]?.term ?? "Spring 2026",
    biome: "sand",
    fileCount: INGESTION["8.022"]?.files.length ?? 131,
  },
  {
    id: "a16c2000-0000-4000-8000-000000000001",
    code: "16.C20",
    name: "Numerical Methods and Computation",
    term: INGESTION["16.C20"]?.term ?? "Spring 2026",
    biome: "coast",
    fileCount: INGESTION["16.C20"]?.files.length ?? 41,
  },
];

const BY_ID = new Map(SANDBOX_COURSES.map((course) => [course.id, course]));
const BY_CODE = new Map(
  SANDBOX_COURSES.filter((course) => course.code).map((course) => [course.code as string, course]),
);

export function sandboxCourseById(courseId: string): SandboxCourseRecord | undefined {
  return BY_ID.get(courseId);
}

export function sandboxCourseByCode(code: string | null | undefined): SandboxCourseRecord | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

export function isThinSandboxCourse(courseId: string): boolean {
  const course = BY_ID.get(courseId);
  if (!course) return false;
  return course.code !== DEMO_HERO_CODE && course.code !== DEMO_SECOND_CODE;
}

export function emptyWorldForCourse(courseId: string): WorldResponse {
  return {
    student_id: DEMO_STUDENT_ID,
    course_id: courseId,
    world_version: "thin-0",
    regions: [],
    edges: [],
    hidden_concept_count: 0,
  };
}

export function ingestionResourcesForCourse(courseId: string): CourseResource[] {
  const course = BY_ID.get(courseId);
  if (!course?.code) return [];
  const files = INGESTION[course.code]?.files ?? [];
  return files.map((file, index) => ({
    id: `${courseId}:ingest:${index}:${file.title}`,
    title: file.title,
    origin: file.origin as SourceOrigin,
    artifact_type: file.artifact_type as ArtifactType,
    concept_count: 0,
    concept_ids: [],
    status: "complete" as const,
    uploaded_at: "",
  }));
}

/** Real ingested titles for a land — never stems. */
export function ingestionFileTitles(courseId: string): string[] {
  return ingestionResourcesForCourse(courseId).map((file) => file.title);
}

/**
 * Catalog names stay visible even when the live list is empty or uses
 * mock stems. New uploads append after the ingested set.
 */
export function mergeVisibleFiles(
  courseId: string | null | undefined,
  live: readonly CourseResource[],
): CourseResource[] {
  const catalog = courseId ? ingestionResourcesForCourse(courseId) : [];
  if (catalog.length === 0) return [...live];
  const byTitle = new Map(live.map((file) => [file.title.toLowerCase(), file]));
  const seen = new Set<string>();
  const merged: CourseResource[] = [];
  for (const file of catalog) {
    const key = file.title.toLowerCase();
    seen.add(key);
    merged.push(byTitle.get(key) ?? file);
  }
  for (const file of live) {
    const key = file.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(file);
  }
  return merged;
}

export function withSandboxCourses(
  owned: readonly CourseSummary[] = [],
  catalog: readonly CourseSummary[] = [],
): CourseSummary[] {
  const overlays = [...catalog, ...owned];
  return SANDBOX_COURSES.map((stub) => {
    const overlay = overlays.find(
      (course) => course.id === stub.id || (course.code && course.code === stub.code),
    );
    return {
      id: stub.id,
      code: stub.code,
      name: overlay?.name || stub.name,
      term: overlay?.term || stub.term,
    };
  });
}
