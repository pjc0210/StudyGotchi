import { describe, expect, it } from "vitest";
import { ICE_TOWN_LAYOUT, type IceDistrictKind } from "../layout/biome-layout";
import {
  LANDMARK_FOOTPRINT_M,
  PARADE_CLEARANCE_M,
  WALKER_DISTRICTS,
  paradeAnchor,
  paradePoint,
  paradeRadius,
} from "./parade";

const DISTRICTS: IceDistrictKind[] = ["harbour", "town", "lake", "forest", "glacier", "station"];

describe("ice landmark parades", () => {
  it("sends walkers to every district and rings them outside the landmark footprint", () => {
    expect(new Set(WALKER_DISTRICTS)).toEqual(new Set(DISTRICTS));
    for (const id of DISTRICTS) {
      expect(paradeRadius(id)).toBe(LANDMARK_FOOTPRINT_M[id] + PARADE_CLEARANCE_M);
      expect(paradeRadius(id)).toBeGreaterThan(LANDMARK_FOOTPRINT_M[id] + 4);
    }
  });

  it("keeps parade samples outside the building, on land", () => {
    for (const id of DISTRICTS) {
      const [ax, az] = paradeAnchor(ICE_TOWN_LAYOUT, id);
      const minDist = LANDMARK_FOOTPRINT_M[id] + 3.5;
      for (let i = 0; i < 8; i++) {
        const point = paradePoint(ICE_TOWN_LAYOUT, id, (i / 8) * Math.PI * 2);
        const dist = Math.hypot(point.x - ax, point.z - az);
        expect(dist).toBeGreaterThan(minDist);
      }
    }
  });
});
