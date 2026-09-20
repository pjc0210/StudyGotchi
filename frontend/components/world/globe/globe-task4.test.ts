import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildGreatCirclePoints } from "./GlobeRoutes";
import {
  nearestFacingCourseId,
  shortestFocusQuaternion,
} from "./CourseGlobeScene";
import * as GlobeOceanModule from "./GlobeOcean";
import * as GlobeShipsModule from "./GlobeShips";
import type { UnitDirection } from "./globe-types";

describe("production globe interactions", () => {
  it("settles to the stable id nearest the focus direction", () => {
    const directions = new Map<string, UnitDirection>([
      ["course-behind", [0, 0, -1]],
      ["course-focused", [0, 0, 1]],
      ["course-side", [1, 0, 0]],
    ]);

    expect(
      nearestFacingCourseId(
        new THREE.Quaternion(),
        ["course-side", "course-behind", "course-focused"],
        directions,
        new THREE.Vector3(0, 0, 1),
      ),
    ).toBe("course-focused");
  });

  it("computes a shortest correction from the current globe rotation", () => {
    const current = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 3,
    );
    const courseDirection = new THREE.Vector3(1, 0, 0);
    const focusDirection = new THREE.Vector3(0, 0, 1);

    const target = shortestFocusQuaternion(
      current,
      courseDirection,
      focusDirection,
    );
    const focused = courseDirection.clone().applyQuaternion(target);

    expect(focused.angleTo(focusDirection)).toBeLessThan(1e-7);
    expect(target.length()).toBeCloseTo(1);
  });

  it("builds lifted great-circle route samples with exact endpoints", () => {
    const points = buildGreatCirclePoints(
      [1, 0, 0],
      [0, 1, 0],
      4.7,
      0.08,
      8,
    );

    expect(points).toHaveLength(9);
    expect(points[0].clone().normalize().distanceTo(new THREE.Vector3(1, 0, 0))).toBeLessThan(
      1e-7,
    );
    expect(points.at(-1)?.clone().normalize().distanceTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(
      1e-7,
    );
    expect(points[4].length()).toBeGreaterThan(points[0].length());
  });

  it("freezes ocean time and frame interpolation for reduced motion", () => {
    const oceanAnimationState = (
      GlobeOceanModule as {
        oceanAnimationState?: (
          elapsedSeconds: number,
          reducedMotion: boolean,
        ) => {
          time: number;
          current: number;
          next: number;
          mix: number;
        };
      }
    ).oceanAnimationState;

    expect(typeof oceanAnimationState).toBe("function");
    if (!oceanAnimationState) return;

    expect(oceanAnimationState(12.75, true)).toEqual(
      oceanAnimationState(0, true),
    );
    expect(oceanAnimationState(12.75, false).time).toBe(12.75);
    expect(oceanAnimationState(12.75, false)).not.toEqual(
      oceanAnimationState(0, false),
    );
  });

  it("keeps ship roots and wakes at the water surface", () => {
    const elevations = GlobeShipsModule as {
      SHIP_ROOT_ELEVATION?: number;
      WAKE_SURFACE_EPSILON?: number;
    };

    expect(elevations.SHIP_ROOT_ELEVATION).toBe(0);
    expect(elevations.WAKE_SURFACE_EPSILON).toBeGreaterThan(0);
    expect(elevations.WAKE_SURFACE_EPSILON).toBeLessThanOrEqual(0.015);
  });
});
