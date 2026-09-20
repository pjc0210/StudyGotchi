import type { CourseSummary } from "@/lib/identity";
import {
  DEMO_COURSES,
  DEMO_HERO_CODE,
  demoHeroCourseId,
  withDemoCourses,
} from "./demo-courses";

/** Hero course code from the locked pipeline demo. Not 6.1210. */
export const SANDBOX_ICE_CODE = DEMO_HERO_CODE;

const COURSE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SANDBOX_CATALOG: Omit<CourseSummary, "id">[] = DEMO_COURSES.map(
  ({ code, name, term }) => ({ code, name, term }),
);

export function isCourseUuid(courseId: string): boolean {
  return COURSE_UUID.test(courseId);
}

export function isSandboxCatalogId(courseId: string): boolean {
  return !isCourseUuid(courseId);
}

export function sandboxIceCourseId(courses: readonly CourseSummary[]): string | null {
  return demoHeroCourseId(courses);
}

export function withSandboxCourses(
  owned: readonly CourseSummary[],
  catalog: readonly CourseSummary[] = [],
): CourseSummary[] {
  return withDemoCourses(owned, catalog);
}
