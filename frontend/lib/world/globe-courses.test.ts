import { describe, expect, it } from "vitest";
import { DEMO_COURSES } from "./demo-courses";
import { biomeForGlobeCourse, GLOBE_SHOWCASE, markerIdForCourse, toGlobeCourses, withEarthCourses } from "./globe-courses";
import { SANDBOX_COURSES } from "./sandbox-roster";

describe("globe marker roster", () => {
  it("keeps the showcase families as a lookup table only", () => {
    expect(new Set(GLOBE_SHOWCASE.map((course) => markerIdForCourse(course))).size).toBe(17);
  });

  it("places owned UUID courses on the planet", () => {
    expect(toGlobeCourses([]).map((course) => course.id)).toEqual([]);
    const globe = toGlobeCourses(DEMO_COURSES);
    expect(globe.map((course) => course.id)).toEqual(DEMO_COURSES.map((course) => course.id));
    expect(globe.map((course) => course.biome)).toEqual(["ice", "forest"]);
    expect(globe.some((course) => course.id === "6.1210")).toBe(false);
  });

  it("pins 8.223 to ice and 6.1400 to jungle", () => {
    expect(biomeForGlobeCourse(DEMO_COURSES[0].id, "8.223")).toBe("ice");
    expect(biomeForGlobeCourse(DEMO_COURSES[1].id, "6.1400")).toBe("forest");
  });

  it("seeds the seven sandbox courses and maps 8.223 to ice, not a preview pin", () => {
    const earth = withEarthCourses(DEMO_COURSES);
    expect(earth.map((course) => course.code)).toEqual(SANDBOX_COURSES.map((course) => course.code));
    const globe = toGlobeCourses(earth);
    expect(globe).toHaveLength(7);
    expect(biomeForGlobeCourse(DEMO_COURSES[0].id, "8.223")).toBe("ice");
    expect(globe.find((course) => course.code === "8.223")?.biome).toBe("ice");
    expect(globe.some((course) => course.code === "ICE")).toBe(false);
  });
});
