"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { api, mockWorldForCourse } from "@/lib/api";
import { isSandboxCatalogId } from "@/lib/world/sandbox-courses";
import { ingestionResourcesForCourse } from "@/lib/world/sandbox-roster";
import type { CourseSummary } from "@/lib/identity";
import {
  buildCourseOverview,
  type CourseOverview,
} from "@/lib/world/course-overview";

export type CourseOverviewCacheRecord =
  | { status: "idle"; data?: never; error?: never }
  | { status: "loading"; data?: never; error?: never }
  | { status: "ready"; data: CourseOverview; error?: never }
  | { status: "error"; data?: never; error: string };

export type CourseOverviewCacheState = Map<
  string,
  CourseOverviewCacheRecord
>;

export interface CourseOverviewCacheResult {
  studentId: string;
  records: CourseOverviewCacheState;
  load(courseId: string): Promise<void>;
  invalidate(courseId: string): void;
}

type CourseOverviewLoader = (
  studentId: string,
  courseId: string,
) => Promise<CourseOverview>;

interface CourseOverviewCache extends CourseOverviewCacheResult {
  getSnapshot(): CourseOverviewCacheState;
  subscribe(listener: () => void): () => void;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "Could not load this course.";
}

export function createCourseOverviewCache(
  studentId: string,
  loader: CourseOverviewLoader,
): CourseOverviewCache {
  let records: CourseOverviewCacheState = new Map();
  const inFlight = new Map<string, Promise<void>>();
  const generations = new Map<string, number>();
  const listeners = new Set<() => void>();

  const publish = (
    courseId: string,
    record: CourseOverviewCacheRecord,
  ) => {
    records = new Map(records);
    records.set(courseId, record);
    listeners.forEach((listener) => listener());
  };

  const cache: CourseOverviewCache = {
    studentId,

    get records() {
      return records;
    },

    getSnapshot: () => records,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    load(courseId) {
      if (records.get(courseId)?.status === "ready") {
        return Promise.resolve();
      }

      const pending = inFlight.get(courseId);
      if (pending) return pending;

      const generation = generations.get(courseId) ?? 0;
      publish(courseId, { status: "loading" });

      let loaded: Promise<CourseOverview>;
      try {
        loaded = loader(studentId, courseId);
      } catch (error) {
        loaded = Promise.reject(error);
      }

      const request = loaded
        .then((data) => {
          if ((generations.get(courseId) ?? 0) === generation) {
            publish(courseId, { status: "ready", data });
          }
        })
        .catch((error: unknown) => {
          if ((generations.get(courseId) ?? 0) === generation) {
            publish(courseId, {
              status: "error",
              error: errorMessage(error),
            });
          }
        })
        .finally(() => {
          if (inFlight.get(courseId) === request) {
            inFlight.delete(courseId);
          }
        });

      inFlight.set(courseId, request);
      return request;
    },

    invalidate(courseId) {
      generations.set(courseId, (generations.get(courseId) ?? 0) + 1);
      inFlight.delete(courseId);
      publish(courseId, { status: "idle" });
    },
  };

  return cache;
}

export function useCourseOverviewCache(
  studentId: string,
  courses: readonly CourseSummary[],
): CourseOverviewCacheResult {
  const coursesRef = useRef(courses);
  coursesRef.current = courses;

  const cacheRef = useRef<CourseOverviewCache | null>(null);
  if (!cacheRef.current || cacheRef.current.studentId !== studentId) {
    cacheRef.current = createCourseOverviewCache(studentId, async (_studentId, courseId) => {
      const course = coursesRef.current.find((candidate) => candidate.id === courseId);
      if (!course) throw new Error("This course is no longer available.");

      const ingested = ingestionResourcesForCourse(courseId);
      if (isSandboxCatalogId(courseId)) {
        return buildCourseOverview(course, mockWorldForCourse(courseId), ingested);
      }
      const [world, resources] = await Promise.all([
        api.getWorldForCourse(courseId),
        api.listResourcesForCourse(courseId).catch(() => []),
      ]);
      const merged = resources.length > 0 ? resources : ingested;
      return buildCourseOverview(course, world, merged);
    });
  }

  const cache = cacheRef.current;
  const records = useSyncExternalStore(
    cache.subscribe,
    cache.getSnapshot,
    cache.getSnapshot,
  );

  return useMemo(
    () => ({
      studentId: cache.studentId,
      records,
      load: cache.load,
      invalidate: cache.invalidate,
    }),
    [cache, records],
  );
}
