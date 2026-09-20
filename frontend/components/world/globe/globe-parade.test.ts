import { describe, expect, it } from "vitest";
import {
  GLOBE_BUDDY_SCALE,
  GLOBE_LANDMARK_FOOTPRINT_LOCAL,
  GLOBE_PARADE_CLEARANCE_LOCAL,
  globeBuddyPoint,
  globeLandmarkFootprint,
  globeParadeRadius,
  globeTownScale,
} from "./globe-parade";

const COUNT = 6;

describe("globe landmark parades", () => {
  it("keeps buddy rings outside the scaled landmark for quiet and active towns", () => {
    const cases: Array<{ progress: number | null; active: boolean }> = [
      { progress: null, active: false },
      { progress: 0.2, active: false },
      { progress: 0.55, active: false },
      { progress: 0.82, active: true },
      { progress: 1, active: true },
    ];
    for (const { progress, active } of cases) {
      const footprint = globeLandmarkFootprint(progress, active);
      expect(footprint).toBeGreaterThan(0.3);
      expect(globeParadeRadius(progress, active, 0)).toBeGreaterThan(footprint + 0.12);
      for (let index = 0; index < COUNT; index++) {
        for (const offset of [0, 0.4, 1.2, Math.PI]) {
          const point = globeBuddyPoint(progress, active, index, COUNT, offset);
          const dist = Math.hypot(point.x, point.z);
          expect(dist).toBeGreaterThan(footprint);
        }
      }
    }
  });

  it("spaces buddies apart and keeps a uniform visual scale", () => {
    const progress = 0.82;
    const points = Array.from({ length: COUNT }, (_, index) =>
      globeBuddyPoint(progress, true, index, COUNT, 0.3),
    );
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const gap = Math.hypot(points[i].x - points[j].x, points[i].z - points[j].z);
        expect(gap).toBeGreaterThan(0.22);
      }
    }
    expect(GLOBE_BUDDY_SCALE).toBe(0.78);
    expect(GLOBE_PARADE_CLEARANCE_LOCAL).toBeGreaterThanOrEqual(8);
    expect(GLOBE_LANDMARK_FOOTPRINT_LOCAL).toBeGreaterThanOrEqual(20);
    expect(globeTownScale(0.82, true)).toBeGreaterThan(globeTownScale(0.82, false));
  });
});
