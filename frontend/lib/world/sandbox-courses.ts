import type { CourseSummary } from "@/lib/identity";
import { DEMO_HERO_CODE, demoHeroCourseId } from "./demo-courses";
import { SANDBOX_COURSES, withSandboxCourses as withRosterCourses } from "./sandbox-roster";

/** Hero course is 8.223, now the ice land. */
export const SANDBOX_ICE_CODE = DEMO_HERO_CODE;

const COURSE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SANDBOX_CATALOG: Omit<CourseSummary, "id">[] = SANDBOX_COURSES.map(
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
  return withRosterCourses(owned, catalog);
}
