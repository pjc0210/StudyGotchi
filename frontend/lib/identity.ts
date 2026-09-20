/**
 * Who is calling the engine, and which course they are looking at.
 *
 * A small external store with one subscription protocol. React reads it with
 * `useIdentity()`; the HTTP client reads it directly for ids and credentials.
 * Two credential adapters feed it: Clerk (bearer token) and the local dev
 * header. Nothing here fetches; `IdentityProvider` does that.
 */

import { useSyncExternalStore } from "react";
import { DEMO_COURSE_ID, DEV_STUDENT_ID, USE_MOCK } from "./config";
import { MOCK_COURSE, MOCK_STUDENT_ID } from "./mock";

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

const EMPTY: Identity = { studentId: "", courseId: "", courseName: "", courses: [], ready: false };

const MOCK_IDENTITY: Identity = {
  studentId: MOCK_STUDENT_ID,
  courseId: MOCK_COURSE.id,
  courseName: MOCK_COURSE.name,
  courses: [{ id: MOCK_COURSE.id, name: MOCK_COURSE.name, code: null, term: null }],
  ready: true,
};

let current: Identity = USE_MOCK ? MOCK_IDENTITY : EMPTY;
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
export function receiveMe(me: { student_id: string; courses: CourseSummary[] }) {
  const course =
    me.courses.find((c) => c.id === DEMO_COURSE_ID) ??
    me.courses.find((c) => c.id === current.courseId) ??
    me.courses[0];
  current = {
    studentId: me.student_id,
    courseId: course?.id ?? "",
    courseName: course?.name ?? "",
    courses: me.courses,
    ready: Boolean(me.student_id && course),
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
  current = USE_MOCK ? MOCK_IDENTITY : EMPTY;
  emit();
}
