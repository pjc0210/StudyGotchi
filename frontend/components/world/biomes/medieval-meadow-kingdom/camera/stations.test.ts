import { describe, expect, it } from "vitest";
import {
  CAMERA_LIMITS,
  STATIONS,
  clampDioramaPitch,
  clampDioramaYaw,
  clampDolly,
  defaultOverride,
  poseFor,
} from "./stations";

describe("meadow camera clamps", () => {
  it("keeps a preferred heading and refuses side-void yaw", () => {
    expect(STATIONS.overview.azimuthDeg).toBe(CAMERA_LIMITS.preferredHeadingDeg);
    expect(clampDioramaYaw(-90)).toBe(-CAMERA_LIMITS.yawDeg);
    expect(clampDioramaYaw(90)).toBe(CAMERA_LIMITS.yawDeg);
    expect(clampDioramaYaw(8)).toBe(8);
  });

  it("allows tilt and zoom without a locked top-down rail", () => {
    expect(CAMERA_LIMITS.pitchMaxDeg - CAMERA_LIMITS.pitchMinDeg).toBeGreaterThan(20);
    expect(CAMERA_LIMITS.pitchMaxDeg).toBeLessThan(70);
    expect(clampDioramaPitch(4)).toBe(CAMERA_LIMITS.pitchMinDeg);
    expect(clampDioramaPitch(80)).toBe(CAMERA_LIMITS.pitchMaxDeg);
    expect(clampDolly(0.1)).toBe(CAMERA_LIMITS.minDolly);
    expect(clampDolly(4)).toBe(CAMERA_LIMITS.maxDolly);
  });

  it("frames the land from the south, not straight down", () => {
    const pose = poseFor(
      STATIONS.overview,
      defaultOverride(STATIONS.overview),
      { center: [0, 0, 0], chord: 184 },
      16 / 9,
    );
    expect(pose.position[2]).toBeGreaterThan(80);
    expect(pose.position[1]).toBeGreaterThan(16);
    expect(pose.position[1] / pose.position[2]).toBeLessThan(0.55);
  });
});
