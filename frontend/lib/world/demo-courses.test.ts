import { describe, expect, it } from "vitest";
import {
  DEMO_COURSES,
  DEMO_HERO_CODE,
  DEMO_SECOND_CODE,
  DEMO_STUDENT_ID,
  demoHeroCourseId,
  studentIdForCourse,
  withDemoCourses,
} from "./demo-courses";

describe("two-course-pipeline roster", () => {
  it("exposes 8.223 then 6.1400 with pipeline UUIDs", () => {
    expect(DEMO_COURSES.map((course) => course.code)).toEqual(["8.223", "6.1400"]);
    expect(DEMO_HERO_CODE).toBe("8.223");
    expect(DEMO_SECOND_CODE).toBe("6.1400");
    expect(DEMO_COURSES.some((course) => course.id === "6.1210")).toBe(false);
    expect(DEMO_STUDENT_ID).toBe("82230000-0000-4000-8000-000000000001");
  });

  it("keeps the hero first and maps each course to its pipeline student", () => {
    const courses = withDemoCourses([]);
    expect(courses.map((course) => course.id)).toEqual(DEMO_COURSES.map((course) => course.id));
    expect(demoHeroCourseId(courses)).toBe(DEMO_COURSES[0].id);
    expect(studentIdForCourse(DEMO_COURSES[0].id)).toBe("82230000-0000-4000-8000-000000000001");
    expect(studentIdForCourse(DEMO_COURSES[1].id)).toBe("61400000-0000-4000-8000-000000000001");
    const extras = withDemoCourses(
      [{ id: "e0851ef7-47d4-43c4-b64a-4018d2996383", code: "6.1400", name: "Old", term: "X" }],
      [],
    );
    expect(extras).toHaveLength(2);
    expect(extras[1].id).toBe(DEMO_COURSES[1].id);
  });
});

describe("pipeline assets stay off 6.1210", () => {
  it("serves the hero graph and world, never fixture 6.1210", async () => {
    const { pipelineGraphForCourse, pipelineWorldForCourse } = await import("./pipeline-assets");
    const { mockWorldForCourse } = await import("../api");
    const graph = pipelineGraphForCourse(DEMO_COURSES[0].id);
    const world = mockWorldForCourse(DEMO_COURSES[0].id);
    expect(graph?.course_id).toBe(DEMO_COURSES[0].id);
    expect(world.course_id).toBe(DEMO_COURSES[0].id);
    expect(JSON.stringify(graph)).not.toContain("6.1210");
    expect(JSON.stringify(world)).not.toContain("6.1210");
    expect(pipelineWorldForCourse("6.1210")).toBeNull();
  });
});

describe("live demo graph fallback", () => {
  it("uses the 8.223 pipeline sky when Railway says 403 Not your world", async () => {
    const { ApiError, liveOrPipeline, populatedOrPipelineGraph, normalizeGraph } = await import("../api");
    const { pipelineGraphForCourse } = await import("./pipeline-assets");
    const pipeline = pipelineGraphForCourse(DEMO_COURSES[0].id);
    expect(pipeline).toBeTruthy();

    const fromForbidden = liveOrPipeline(pipeline, new ApiError("Not your world", 403));
    const graph = normalizeGraph(fromForbidden);
    const clusters = new Set(graph.nodes.map((node) => node.cluster).filter(Boolean));

    expect(graph.nodes.length).toBeGreaterThan(100);
    expect(graph.edges.length).toBeGreaterThan(50);
    expect(clusters.has("Canonical Momentum")).toBe(true);
    expect(clusters.has("Lagrangian Formalism")).toBe(true);
    expect([...clusters].some((name) => name?.includes("Euler-Lagrange"))).toBe(true);

    const emptyLive = normalizeGraph({ nodes: [], edges: [] });
    const fromEmpty = populatedOrPipelineGraph(DEMO_COURSES[0].id, emptyLive);
    expect(fromEmpty.nodes.length).toBe(graph.nodes.length);

    const { seededKnowledgeGraph } = await import("../api");
    const seeded = seededKnowledgeGraph(DEMO_COURSES[0].id);
    expect(seeded?.nodes.length).toBe(graph.nodes.length);
    expect(seeded?.nodes.some((node) => node.cluster === "Canonical Momentum")).toBe(true);
  });

  it("rethrows when there is no pipeline graph for the course", async () => {
    const { ApiError, liveOrPipeline } = await import("../api");
    const error = new ApiError("Not your world", 403);
    expect(() => liveOrPipeline(null, error)).toThrow(error);
  });
});
