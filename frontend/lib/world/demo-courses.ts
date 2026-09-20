import type { CourseSummary } from "@/lib/identity";

const COURSE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCourseUuid(courseId: string): boolean {
  return COURSE_UUID.test(courseId);
}

/** Locked live-demo source: `demo-data/two-course-pipeline`. */
export const DEMO_DATA_ROOT = "demo-data/two-course-pipeline";

export const DEMO_HERO_CODE = "8.223";
export const DEMO_SECOND_CODE = "6.1400";

export interface DemoCourseRecord extends CourseSummary {
  studentId: string;
}

export const DEMO_COURSES: DemoCourseRecord[] = [
  {
    id: "2a9366df-b7c1-45df-8666-3f14219b7a2f",
    code: DEMO_HERO_CODE,
    name: "Classical Mechanics II",
    term: "Pipeline",
    studentId: "82230000-0000-4000-8000-000000000001",
  },
  {
    id: "6fb9c56e-0a47-479f-a80c-588ad07ff85e",
    code: DEMO_SECOND_CODE,
    name: "Computability and Complexity Theory",
    term: "Pipeline",
    studentId: "61400000-0000-4000-8000-000000000001",
  },
];

/** Signed-in sandbox face: the hero (8.223) student. Both courses hang off this identity. */
export const DEMO_STUDENT_ID = DEMO_COURSES[0].studentId;

export function demoHeroCourseId(courses: readonly CourseSummary[]): string | null {
  const hero = courses.find(
    (course) => course.code === DEMO_HERO_CODE && isCourseUuid(course.id),
  );
  if (hero) return hero.id;
  const pinned = DEMO_COURSES[0];
  if (courses.some((course) => course.id === pinned.id)) return pinned.id;
  return courses.find((course) => isCourseUuid(course.id))?.id ?? null;
}

export function studentIdForCourse(
  courseId: string,
  fallback?: string | null,
): string {
  const match = DEMO_COURSES.find((course) => course.id === courseId);
  return match?.studentId ?? fallback ?? DEMO_STUDENT_ID;
}

/**
 * The locked demo is exactly 8.223 and 6.1400. Names may come from /api/me,
 * but ids stay the pipeline UUIDs so graph/world routes do not 422.
 */
export function withDemoCourses(
  owned: readonly CourseSummary[] = [],
  catalog: readonly CourseSummary[] = [],
): CourseSummary[] {
  const overlays = [...catalog, ...owned];
  return DEMO_COURSES.map((stub) => {
    const overlay = overlays.find(
      (course) =>
        course.id === stub.id || (course.code && course.code === stub.code),
    );
    return {
      id: stub.id,
      code: stub.code,
      name: overlay?.name || stub.name,
      term: overlay?.term || stub.term,
    };
  });
}
