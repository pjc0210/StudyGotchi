import { describe, expect, it } from "vitest";
import {
  ICE_CAMERA_LIMITS,
  ICE_LOOK_AT,
  ICE_LOOK_BOX,
  clampCameraPosition,
  clampLookTarget,
  poseFor,
  STATIONS,
  defaultOverride,
} from "./stations";

describe("ice camera bounds", () => {
  it("pulls back far enough to fit harbour through mountains, still boxed", () => {
    expect(ICE_CAMERA_LIMITS.yawDeg).toBeGreaterThanOrEqual(38);
    expect(ICE_CAMERA_LIMITS.yawDeg).toBeLessThanOrEqual(48);
    expect(ICE_CAMERA_LIMITS.pitchMinDeg).toBeGreaterThanOrEqual(20);
    expect(ICE_CAMERA_LIMITS.minDistance).toBeGreaterThanOrEqual(80);
    expect(ICE_CAMERA_LIMITS.maxDistance).toBeGreaterThanOrEqual(260);
    expect(ICE_CAMERA_LIMITS.maxDistance).toBeLessThanOrEqual(320);
    const pose = poseFor(
      STATIONS.overview,
      defaultOverride(STATIONS.overview),
      { center: ICE_LOOK_AT, chord: 176 },
      16 / 9,
    );
    expect(pose.position[2]).toBeGreaterThan(ICE_LOOK_AT[2] + 40);
    expect(pose.position[1]).toBeGreaterThan(36);
  });

  it("lets the look-at reach mountain camp and research island", () => {
    const town = clampLookTarget(...ICE_LOOK_AT);
    expect(town).toEqual(ICE_LOOK_AT);
    const pines = clampLookTarget(31, 2.4, -45);
    expect(pines[2]).toBe(-45);
    expect(pines[2]).toBeGreaterThan(ICE_LOOK_BOX.min[2]);
    const camp = clampLookTarget(-86, 2.4, 1);
    expect(camp[0]).toBe(-86);
    const island = clampLookTarget(92, 2.4, 68);
    expect(island[0]).toBe(92);
    const left = clampCameraPosition(-150, 64, 160, town[2]);
    expect(left[0]).toBeLessThan(-120);
    const right = clampCameraPosition(190, 64, 160, town[2]);
    expect(right[0]).toBeGreaterThan(160);
    const camera = clampCameraPosition(48, 56, 132, town[2]);
    expect(camera[2]).toBeGreaterThan(town[2] + 20);
  });
});
