/**
 * Who is calling the engine, and which course they are looking at.
 *
 * A small external store with one subscription protocol. React reads it with
 * `useIdentity()`; the HTTP client reads it directly for ids and credentials.
 * Two credential adapters feed it: Clerk (bearer token) and the local dev
 * header. Nothing here fetches; `IdentityProvider` does that.
 */

import { useSyncExternalStore } from "react";
import { DEMO_COURSE_ID, DEV_STUDENT_ID } from "./config";
import { MOCK_STUDENT_ID } from "./mock";
import { DEMO_STUDENT_ID, demoHeroCourseId } from "./world/demo-courses";
import { SANDBOX_COURSES, withSandboxCourses } from "./world/sandbox-roster";
import { isCourseUuid } from "./world/sandbox-courses";

export interface CourseSummary {
  id: string;
  name: string;
  code: string | null;
  term: string | null;
}

export interface Identity {
  studentId: string;
  courseId: string;
  courseName: string;
  courses: CourseSummary[];
  /** True once the student and a course are known, so student routes can be called. */
  ready: boolean;
}

/** Produces the headers that prove who is calling. */
export interface CredentialAdapter {
  headers(): Promise<Record<string, string>>;
}

export const devHeaderAdapter: CredentialAdapter = {
  async headers(): Promise<Record<string, string>> {
    return DEV_STUDENT_ID ? { "X-Student-Id": DEV_STUDENT_ID } : {};
  },
};

export function bearerAdapter(getToken: () => Promise<string | null>): CredentialAdapter {
  return {
    async headers(): Promise<Record<string, string>> {
      const token = await getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  };
}

function demoIdentity(studentId: string = DEMO_STUDENT_ID || MOCK_STUDENT_ID): Identity {
  const courses = withSandboxCourses([], SANDBOX_COURSES);
  const course = courses[0];
  return {
    studentId,
    courseId: course?.id ?? "",
    courseName: course?.name ?? "",
    courses,
    ready: Boolean(studentId && course),
  };
}

const MOCK_IDENTITY: Identity = demoIdentity();

/**
 * The locked live demo is these two pipeline courses. Seed them immediately so
 * /earth is never an empty navigator while Clerk or /api/me is still settling.
 */
let current: Identity = MOCK_IDENTITY;
let credentials: CredentialAdapter = DEV_STUDENT_ID ? devHeaderAdapter : { headers: async () => ({}) };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getIdentity(): Identity {
  return current;
}

export function subscribeIdentity(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useIdentity(): Identity {
  return useSyncExternalStore(subscribeIdentity, getIdentity, getIdentity);
}

export function setCredentials(adapter: CredentialAdapter | null) {
  credentials = adapter ?? (DEV_STUDENT_ID ? devHeaderAdapter : { headers: async () => ({}) });
}

export function credentialHeaders(): Promise<Record<string, string>> {
  return credentials.headers();
}

/** Called by the provider with what /api/me returned. Picks a course. */
export function receiveMe(
  me: { student_id: string; courses: CourseSummary[] },
  catalog: CourseSummary[] = [],
) {
  const courses = withSandboxCourses(me.courses, catalog).filter((course) =>
    isCourseUuid(course.id),
  );
  const heroId = demoHeroCourseId(courses);
  const course =
    courses.find((c) => c.id === DEMO_COURSE_ID) ??
    courses.find((c) => c.id === heroId) ??
    courses.find((c) => c.id === current.courseId) ??
    courses[0];
  const studentId = me.student_id || DEMO_STUDENT_ID;
  current = {
    studentId,
    courseId: course?.id ?? "",
    courseName: course?.name ?? "",
    courses,
    ready: Boolean(studentId && course),
  };
  emit();
}

export function selectCourse(courseId: string) {
  const course = current.courses.find((c) => c.id === courseId);
  if (!course || course.id === current.courseId) return;
  current = { ...current, courseId: course.id, courseName: course.name, ready: Boolean(current.studentId) };
  emit();
}

export function clearIdentity() {
  current = demoIdentity();
  emit();
}
