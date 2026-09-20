import { describe, expect, it } from "vitest";
import { GLOBE_SHOWCASE, markerIdForCourse, toGlobeCourses } from "./globe-courses";

describe("globe marker roster", () => {
  it("puts every bouquet family on the planet once", () => {
    const ids = GLOBE_SHOWCASE.map((course) => markerIdForCourse(course));
    expect(ids).toEqual([
      "ice-town",
      "city",
      "volcanic",
      "academy-town",
      "forest",
      "egyptian-desert",
      "harbor-town",
      "ink-world",
      "celestial-garden",
      "heavy-industry",
      "future-utopia",
      "wildwest",
      "alpine",
      "swamp",
      "jungle",
      "whimsical-land",
      "fractal-recursion",
    ]);
    expect(new Set(ids).size).toBe(17);
  });

  it("keeps neighbor towns so the belt still has every family", () => {
    expect(toGlobeCourses([]).map((course) => markerIdForCourse(course))).toHaveLength(17);
  });
});
