import { describe, expect, it } from "vitest";
import { DEMO_COURSES, DEMO_HERO_CODE } from "./demo-courses";
import {
  courseFilesOpenOnFocus,
  galaxyHrefForConcept,
  isPlanetGlobePath,
  landHref,
  landParamFromSearch,
  planetHref,
  PRODUCT_NAV,
  resolveLandCourseId,
  screenPointFromNdc,
  sharesPlanetLeaveBeat,
  shouldShowLandmarkFlag,
  showGlobeLandmarkNumberPin,
} from "./earth-nav";
import { conceptIdForLabel } from "./ice-district-concepts";
import world from "./pipeline/8.223-world.json";

describe("earth planet vs land", () => {
  it("labels the top header Courses and Information", () => {
    expect(PRODUCT_NAV.map((item) => item.label)).toEqual(["Courses", "Information"]);
    expect(PRODUCT_NAV[0]?.href).toBe(planetHref());
    expect(PRODUCT_NAV[1]?.href).toBe("/knowledge");
  });

  it("treats bare /earth as the planetary globe, not ice land", () => {
    expect(planetHref()).toBe("/earth");
    expect(landParamFromSearch("")).toBeNull();
    expect(landParamFromSearch("?v=land-files-1")).toBeNull();
    expect(isPlanetGlobePath("/earth")).toBe(true);
    expect(isPlanetGlobePath("/earth", "")).toBe(true);
    expect(isPlanetGlobePath("/earth", `land=${DEMO_HERO_CODE}`)).toBe(false);
    expect(landHref(DEMO_HERO_CODE)).toBe(`/earth?land=${DEMO_HERO_CODE}`);
    expect(resolveLandCourseId(DEMO_HERO_CODE, DEMO_COURSES)).toBe(DEMO_COURSES[0].id);
    expect(resolveLandCourseId(null, DEMO_COURSES)).toBeNull();
  });

  it("does not auto-open the files list when a course is focused", () => {
    expect(courseFilesOpenOnFocus()).toBe(false);
  });

  it("sends a specific concept to Galaxy search/select", () => {
    expect(galaxyHrefForConcept("085699dc-1387-441b-87ae-78f0951e3757")).toBe(
      "/knowledge?concept=085699dc-1387-441b-87ae-78f0951e3757",
    );
    expect(galaxyHrefForConcept("Canonical Momentum")).toBe("/knowledge?q=Canonical%20Momentum");
    expect(conceptIdForLabel(world.regions, "Canonical Momentum")).toBe(
      "085699dc-1387-441b-87ae-78f0951e3757",
    );
  });

  it("shows only the active course flag and projects on-screen pins", () => {
    expect(shouldShowLandmarkFlag("ice", "ice")).toBe(true);
    expect(shouldShowLandmarkFlag("ice", "forest")).toBe(false);
    expect(shouldShowLandmarkFlag(null, "ice")).toBe(false);
    expect(screenPointFromNdc({ x: 0, y: 0, z: 0.2 }, { left: 10, top: 20, width: 200, height: 100 })).toEqual({
      x: 110,
      y: 70,
    });
    expect(screenPointFromNdc({ x: 0, y: 0, z: 1.2 }, { left: 0, top: 0, width: 100, height: 100 })).toBeNull();
  });

  it("slides the flag out with Classes when leaving Courses for Information", () => {
    expect(sharesPlanetLeaveBeat("course-navigator")).toBe(true);
    expect(sharesPlanetLeaveBeat("landmark-flag")).toBe(true);
    expect(sharesPlanetLeaveBeat("sg-constellation")).toBe(false);
  });

  it("does not float a numeric badge over globe landmarks", () => {
    expect(showGlobeLandmarkNumberPin()).toBe(false);
  });
});
