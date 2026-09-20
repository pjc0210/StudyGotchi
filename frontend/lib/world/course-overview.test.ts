import { describe, expect, it, vi } from "vitest";
import { createCourseOverviewCache } from "@/components/earth/useCourseOverviewCache";
import {
  cloneMockResources,
  courseResourcesPath,
  mockWorldForCourse,
  normalizeCourseResources,
  studentCourseWorldPath,
  type BackendResource,
} from "@/lib/api";
import type { CourseSummary } from "@/lib/identity";
import { MOCK_RESOURCES } from "@/lib/mock";
import type { CourseResource } from "@/lib/types";
import fixture from "@/lib/world/fixture.json";
import type { WorldResponse } from "@/lib/world/types";
import {
  buildCourseOverview,
  type CourseOverview,
} from "./course-overview";

const COURSE: CourseSummary = {
  id: "course-a",
  name: "Algorithms",
  code: "6.1210",
  term: "Fall 2026",
};

const WORLD: WorldResponse = {
  student_id: "student-a",
  course_id: COURSE.id,
  world_version: "world-7",
  hidden_concept_count: 2,
  edges: [],
  regions: [
    {
      concept_id: "c-beta",
      name: "Beta concept",
      cluster_id: "topic-z",
      cluster: "Zeta topic",
      terrain_height: 0.3,
      terrain_area: 0.4,
      fog: 0.2,
      semantic_state: "strong",
      creature_state: "normal",
    },
    {
      concept_id: "c-alpha",
      name: "Alpha concept",
      cluster_id: "topic-z",
      cluster: "Zeta topic",
      terrain_height: 0.8,
      terrain_area: 0.5,
      fog: 0.05,
      semantic_state: "mastered",
      creature_state: "ascended",
    },
    {
      concept_id: "c-frontier",
      name: "Frontier concept",
      cluster_id: "topic-a",
      cluster: "Alpha topic",
      terrain_height: 0,
      terrain_area: 0.2,
      fog: 1,
      semantic_state: "frontier",
      creature_state: "unhatched",
    },
    {
      concept_id: "c-loose",
      name: "Loose concept",
      cluster_id: null,
      cluster: null,
      terrain_height: 0.1,
      terrain_area: 0.2,
      fog: 0.4,
      semantic_state: "exposed",
      creature_state: "weak",
    },
  ],
};

function resource(
  id: string,
  title: string,
  conceptIds: string[],
): CourseResource {
  return {
    id,
    title,
    origin: "instructor",
    artifact_type: "lecture",
    concept_count: conceptIds.length,
    concept_ids: conceptIds,
    status: "complete",
    uploaded_at: "2026-09-20",
  };
}

const RESOURCES = [
  resource("r-z", "Zeta notes", ["c-alpha"]),
  resource("r-shared", "Shared notes", ["c-beta", "c-alpha", "missing"]),
  resource("r-other", "Other notes", ["missing-a", "missing-b"]),
  resource("r-a", "Alpha notes", []),
];

function readyOverview(courseId = COURSE.id): CourseOverview {
  return {
    course: { ...COURSE, id: courseId },
    topics: [],
    unmatchedFiles: [],
    stats: {
      reached: 0,
      total: 0,
      mastered: 0,
      residents: 0,
      sources: 0,
    },
    worldVersion: `world-${courseId}`,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("buildCourseOverview", () => {
  it("groups and sorts world concepts while attaching files to every supported concept", () => {
    const overview = buildCourseOverview(COURSE, WORLD, RESOURCES);

    expect(overview.topics.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "topic-a", label: "Alpha topic" },
      { id: "unclustered", label: "Other concepts" },
      { id: "topic-z", label: "Zeta topic" },
    ]);
    expect(
      overview.topics
        .find((topic) => topic.id === "topic-z")
        ?.concepts.map((concept) => concept.label),
    ).toEqual(["Alpha concept", "Beta concept"]);
    expect(
      overview.topics
        .flatMap((topic) => topic.concepts)
        .find((concept) => concept.id === "c-alpha")
        ?.files.map((file) => file.id),
    ).toEqual(["r-shared", "r-z"]);
    expect(
      overview.topics
        .flatMap((topic) => topic.concepts)
        .find((concept) => concept.id === "c-beta")
        ?.files.map((file) => file.id),
    ).toEqual(["r-shared"]);
  });

  it("puts each file with no supported concept in Other files exactly once", () => {
    const overview = buildCourseOverview(COURSE, WORLD, RESOURCES);

    expect(overview.unmatchedFiles.map((file) => file.id)).toEqual([
      "r-a",
      "r-other",
    ]);
    expect(
      overview.topics
        .flatMap((topic) => topic.concepts)
        .flatMap((concept) => concept.files)
        .some((file) => file.id === "r-other"),
    ).toBe(false);
  });

  it("reports engine-backed course statistics without counting frontier as reached", () => {
    const overview = buildCourseOverview(COURSE, WORLD, RESOURCES);

    expect(overview.course).toBe(COURSE);
    expect(overview.worldVersion).toBe("world-7");
    expect(overview.stats).toEqual({
      reached: 3,
      total: 6,
      mastered: 1,
      residents: 3,
      sources: 4,
    });
  });

  it("merges duplicate resource links and fields independently of input order", () => {
    const first = {
      ...resource("duplicate", "Zeta title", ["c-alpha"]),
      origin: "ta" as const,
    };
    const second = resource("duplicate", "Alpha title", ["c-beta"]);

    const forward = buildCourseOverview(COURSE, WORLD, [first, second]);
    const reversed = buildCourseOverview(COURSE, WORLD, [second, first]);

    expect(forward).toEqual(reversed);
    expect(forward.stats.sources).toBe(1);
    expect(
      forward.topics
        .flatMap((topic) => topic.concepts)
        .filter((concept) => concept.files.some((file) => file.id === "duplicate"))
        .map((concept) => concept.id)
        .sort(),
    ).toEqual(["c-alpha", "c-beta"]);
    expect(forward.unmatchedFiles).toEqual([]);
    expect(
      forward.topics
        .flatMap((topic) => topic.concepts)
        .find((concept) => concept.id === "c-alpha")?.files[0],
    ).toMatchObject({
      id: "duplicate",
      title: "Alpha title",
      concept_count: 2,
      concept_ids: ["c-alpha", "c-beta"],
    });
  });
});

describe("course overview cache", () => {
  it("loads only requested course ids and deduplicates concurrent requests", async () => {
    const pending = deferred<CourseOverview>();
    const loader = vi.fn((courseId: string) =>
      courseId === "course-a"
        ? pending.promise
        : Promise.resolve(readyOverview(courseId)),
    );
    const cache = createCourseOverviewCache("student-a", (_studentId, courseId) =>
      loader(courseId),
    );

    const first = cache.load("course-a");
    const second = cache.load("course-a");

    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.records.get("course-a")).toEqual({ status: "loading" });
    expect(cache.records.has("course-b")).toBe(false);

    pending.resolve(readyOverview("course-a"));
    await Promise.all([first, second]);

    expect(cache.records.get("course-a")).toEqual({
      status: "ready",
      data: readyOverview("course-a"),
    });

    await cache.load("course-b");
    expect(loader).toHaveBeenCalledTimes(2);
    expect(cache.records.get("course-b")?.status).toBe("ready");
  });

  it("exposes an error and retries that course on the next load", async () => {
    const loader = vi
      .fn<(courseId: string) => Promise<CourseOverview>>()
      .mockRejectedValueOnce(new Error("World unavailable"))
      .mockResolvedValueOnce(readyOverview());
    const cache = createCourseOverviewCache("student-a", (_studentId, courseId) =>
      loader(courseId),
    );

    await cache.load("course-a");
    expect(cache.records.get("course-a")).toEqual({
      status: "error",
      error: "World unavailable",
    });

    await cache.load("course-a");
    expect(loader).toHaveBeenCalledTimes(2);
    expect(cache.records.get("course-a")?.status).toBe("ready");
  });

  it("invalidates one course without discarding other cached courses", async () => {
    const loader = vi.fn(async (courseId: string) =>
      readyOverview(courseId),
    );
    const cache = createCourseOverviewCache("student-a", (_studentId, courseId) =>
      loader(courseId),
    );

    await Promise.all([cache.load("course-a"), cache.load("course-b")]);
    cache.invalidate("course-a");

    expect(cache.records.get("course-a")).toEqual({ status: "idle" });
    expect(cache.records.get("course-b")?.status).toBe("ready");

    await cache.load("course-a");
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it("does not restore an invalidated course from a stale in-flight request", async () => {
    const pending = deferred<CourseOverview>();
    const cache = createCourseOverviewCache("student-a", () => pending.promise);

    const load = cache.load("course-a");
    cache.invalidate("course-a");
    pending.resolve(readyOverview());
    await load;

    expect(cache.records.get("course-a")).toEqual({ status: "idle" });
  });

  it("isolates the same course id between explicit student scopes", async () => {
    const loader = vi.fn(async (studentId: string, courseId: string) => ({
      ...readyOverview(courseId),
      worldVersion: `${studentId}/${courseId}`,
    }));
    const firstStudent = createCourseOverviewCache("student-a", loader);
    await firstStudent.load("course-a");

    const secondStudent = createCourseOverviewCache("student-b", loader);
    expect(secondStudent.studentId).toBe("student-b");
    expect(secondStudent.records.has("course-a")).toBe(false);
    await secondStudent.load("course-a");

    expect(secondStudent.records.get("course-a")?.data?.worldVersion).toBe(
      "student-b/course-a",
    );
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("publishes immutable subscription snapshots and stops after unsubscribe", async () => {
    const cache = createCourseOverviewCache("student-a", async (_studentId, courseId) =>
      readyOverview(courseId),
    );
    const initial = cache.getSnapshot();
    const snapshots: Map<string, unknown>[] = [];
    const unsubscribe = cache.subscribe(() => {
      snapshots.push(cache.getSnapshot());
    });

    await cache.load("course-a");
    unsubscribe();
    cache.invalidate("course-a");

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).not.toBe(initial);
    expect(snapshots[0]).not.toBe(snapshots[1]);
    expect(snapshots.map((snapshot) => snapshot.get("course-a"))).toEqual([
      { status: "loading" },
      { status: "ready", data: readyOverview("course-a") },
    ]);
  });

  it("keeps a replacement request when an invalidated request resolves later", async () => {
    const first = deferred<CourseOverview>();
    const second = deferred<CourseOverview>();
    const loader = vi
      .fn<() => Promise<CourseOverview>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const cache = createCourseOverviewCache("student-a", loader);

    const staleLoad = cache.load("course-a");
    cache.invalidate("course-a");
    const replacementLoad = cache.load("course-a");
    second.resolve({ ...readyOverview(), worldVersion: "replacement" });
    await replacementLoad;
    first.resolve({ ...readyOverview(), worldVersion: "stale" });
    await staleLoad;

    expect(cache.records.get("course-a")?.data?.worldVersion).toBe("replacement");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

describe("explicit course API helpers", () => {
  it("encodes explicit course and student ids in production paths", () => {
    expect(courseResourcesPath("course/with space")).toBe(
      "/api/courses/course%2Fwith%20space/resources",
    );
    expect(studentCourseWorldPath("student/with space", "course/with space")).toBe(
      "/api/courses/course%2Fwith%20space/students/student%2Fwith%20space/world",
    );
  });

  it("normalizes current and explicit resource payloads through one helper", () => {
    const backend: BackendResource[] = [
      {
        id: "resource-a",
        title: "Lecture",
        origin: "instructor",
        artifact_type: "lecture",
        status: "processed",
        concept_count: 1,
        created_at: null,
      },
    ];

    expect(normalizeCourseResources(backend)).toEqual([
      {
        id: "resource-a",
        title: "Lecture",
        origin: "instructor",
        artifact_type: "lecture",
        concept_count: 1,
        concept_ids: [],
        status: "complete",
        uploaded_at: "",
      },
    ]);
  });

  it("clones explicit mock worlds and resources without mutating fixtures", () => {
    const world = mockWorldForCourse("requested-course");
    const resources = cloneMockResources();
    world.regions[0].name = "Changed";
    resources[0].concept_ids.push("changed");

    const freshWorld = mockWorldForCourse("fresh-course");
    const freshResources = cloneMockResources();

    expect(world.course_id).toBe("requested-course");
    expect(freshWorld.course_id).toBe("fresh-course");
    expect(freshWorld.regions[0].name).toBe(fixture.regions[0].name);
    expect(freshResources[0].concept_ids).toEqual(MOCK_RESOURCES[0].concept_ids);
  });
});
