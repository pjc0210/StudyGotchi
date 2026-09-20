import { describe, expect, it } from "vitest";
import { DEMO_COURSES, DEMO_HERO_CODE } from "./demo-courses";
import {
  SANDBOX_CATALOG,
  SANDBOX_ICE_CODE,
  isCourseUuid,
  isSandboxCatalogId,
  sandboxIceCourseId,
  withSandboxCourses,
} from "./sandbox-courses";

describe("sandbox student courses", () => {
  it("follows the pipeline hero, never a 6.1210 catalog id", () => {
    expect(SANDBOX_ICE_CODE).toBe(DEMO_HERO_CODE);
    expect(SANDBOX_CATALOG.map((course) => course.code)).toEqual(["8.223", "6.1400"]);
    expect(isCourseUuid("6.1210")).toBe(false);
    expect(isSandboxCatalogId("6.1210")).toBe(true);
    expect(withSandboxCourses([]).map((course) => course.id)).toEqual(
      DEMO_COURSES.map((course) => course.id),
    );
    expect(sandboxIceCourseId(withSandboxCourses([]))).toBe(DEMO_COURSES[0].id);
  });
});
