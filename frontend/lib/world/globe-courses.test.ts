import { describe, expect, it } from "vitest";
import { DEMO_COURSES } from "./demo-courses";
import {
  biomeForGlobeCourse,
  GLOBE_SHOWCASE,
  markerIdForCourse,
  toGlobeCourses,
} from "./globe-courses";

describe("globe marker roster", () => {
  it("keeps the showcase families as a lookup table only", () => {
    expect(new Set(GLOBE_SHOWCASE.map((course) => markerIdForCourse(course))).size).toBe(17);
  });

  it("places only the pipeline courses on the planet", () => {
    expect(toGlobeCourses([]).map((course) => course.id)).toEqual([]);
    const globe = toGlobeCourses(DEMO_COURSES);
    expect(globe.map((course) => course.id)).toEqual(DEMO_COURSES.map((course) => course.id));
    expect(globe.map((course) => course.biome)).toEqual(["sand", "forest"]);
    expect(globe.some((course) => course.id === "6.1210")).toBe(false);
  });

  it("pins 8.223 to sand and 6.1400 to jungle", () => {
    expect(biomeForGlobeCourse(DEMO_COURSES[0].id, "8.223")).toBe("sand");
    expect(biomeForGlobeCourse(DEMO_COURSES[1].id, "6.1400")).toBe("forest");
  });
});
