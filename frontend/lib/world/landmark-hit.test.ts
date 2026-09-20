import { describe, expect, it } from "vitest";
import {
  LANDMARK_FACING_EPSILON,
  isLandmarkFacing,
  isLandmarkOccludedByGlobe,
  isLandmarkOnScreen,
  isLandmarkVisible,
  landmarkFacingDot,
  pickNearestVisibleLandmark,
} from "./landmark-hit";

/** Unit planet at the origin. Camera sits on +Z, well outside the sphere. */
const PLANET = { x: 0, y: 0, z: 0 };
const RADIUS = 1;
const CAMERA = { x: 0, y: 0, z: 5 };

const FRONT_PIN = { x: 0, y: 0, z: 1.2 };
const BACK_PIN = { x: 0, y: 0, z: -1.2 };

/** Visual limb from this camera: N·viewDir = R/D = 0.20. Raised so the pin sits outside the mesh. */
const SILHOUETTE_PIN = { x: 1.077775, y: 0, z: 0.22 };

/** Facing 0.07 — just under the 0.08 floor, already around the limb. */
const BELOW_EPSILON_PIN = { x: 1.0973, y: 0, z: 0.077 };

/** On the unit sphere at facing 0.12: passes the floor, sits behind the R/D=0.20 limb. */
const OCCLUDED_FRONTISH_PIN = { x: 0.992774, y: 0, z: 0.12 };

function visible(pin: { x: number; y: number; z: number }) {
  return isLandmarkVisible({
    pin,
    camera: CAMERA,
    planetCenter: PLANET,
    planetRadius: RADIUS,
  });
}

describe("landmark hit visibility", () => {
  it("treats a camera-facing pin as visible", () => {
    expect(landmarkFacingDot(FRONT_PIN, CAMERA, PLANET)).toBeCloseTo(1, 5);
    expect(isLandmarkFacing(FRONT_PIN, CAMERA, PLANET)).toBe(true);
    expect(isLandmarkOccludedByGlobe(FRONT_PIN, CAMERA, PLANET, RADIUS)).toBe(false);
    expect(visible(FRONT_PIN)).toBe(true);
  });

  it("rejects a pin on the opposite side of the planet", () => {
    expect(landmarkFacingDot(BACK_PIN, CAMERA, PLANET)).toBeCloseTo(-1, 5);
    expect(isLandmarkFacing(BACK_PIN, CAMERA, PLANET)).toBe(false);
    expect(isLandmarkOccludedByGlobe(BACK_PIN, CAMERA, PLANET, RADIUS)).toBe(true);
    expect(visible(BACK_PIN)).toBe(false);
  });

  it("keeps a silhouette / grazing pin hittable (facing 0.20 > 0.08 epsilon)", () => {
    expect(LANDMARK_FACING_EPSILON).toBe(0.08);
    expect(landmarkFacingDot(SILHOUETTE_PIN, CAMERA, PLANET)).toBeCloseTo(0.2, 2);
    expect(landmarkFacingDot(SILHOUETTE_PIN, CAMERA, PLANET)).toBeGreaterThan(
      LANDMARK_FACING_EPSILON,
    );
    expect(isLandmarkOccludedByGlobe(SILHOUETTE_PIN, CAMERA, PLANET, RADIUS)).toBe(
      false,
    );
    expect(visible(SILHOUETTE_PIN)).toBe(true);
  });

  it("drops a near-limb sliver once facing falls below the 0.08 epsilon", () => {
    expect(landmarkFacingDot(BELOW_EPSILON_PIN, CAMERA, PLANET)).toBeCloseTo(0.07, 2);
    expect(isLandmarkFacing(BELOW_EPSILON_PIN, CAMERA, PLANET)).toBe(false);
    expect(visible(BELOW_EPSILON_PIN)).toBe(false);
  });

  it("does not treat an occluded pin behind the globe as hittable", () => {
    expect(landmarkFacingDot(OCCLUDED_FRONTISH_PIN, CAMERA, PLANET)).toBeCloseTo(
      0.12,
      2,
    );
    expect(isLandmarkFacing(OCCLUDED_FRONTISH_PIN, CAMERA, PLANET)).toBe(true);
    expect(
      isLandmarkOccludedByGlobe(OCCLUDED_FRONTISH_PIN, CAMERA, PLANET, RADIUS),
    ).toBe(true);
    expect(visible(OCCLUDED_FRONTISH_PIN)).toBe(false);
  });

  it("rejects a pin that has left the view frustum", () => {
    expect(
      isLandmarkVisible({
        pin: FRONT_PIN,
        camera: CAMERA,
        planetCenter: PLANET,
        planetRadius: RADIUS,
        ndc: { x: 0, y: 0, z: 1.2 },
      }),
    ).toBe(false);
    expect(isLandmarkOnScreen({ x: 0, y: 0, z: 0.2 })).toBe(true);
    expect(isLandmarkOnScreen({ x: 1.4, y: 0, z: 0.2 })).toBe(false);
  });
});

describe("landmark hit picking", () => {
  it("picks the nearer of two visible pins on the same ray", () => {
    const nearer = { x: 0, y: 0, z: 2 };
    const farther = FRONT_PIN;
    expect(visible(nearer)).toBe(true);
    expect(visible(farther)).toBe(true);

    const picked = pickNearestVisibleLandmark({
      rayOrigin: CAMERA,
      rayDirection: { x: 0, y: 0, z: -1 },
      landmarks: [
        { id: "far", pin: farther },
        { id: "near", pin: nearer },
      ],
      camera: CAMERA,
      planetCenter: PLANET,
      planetRadius: RADIUS,
    });

    expect(picked).toBe("near");
  });

  it("does not pick a closer far-side pin even when it sits on the ray", () => {
    const picked = pickNearestVisibleLandmark({
      rayOrigin: CAMERA,
      rayDirection: { x: 0, y: 0, z: -1 },
      landmarks: [
        { id: "back", pin: BACK_PIN },
        { id: "front", pin: FRONT_PIN },
      ],
      camera: CAMERA,
      planetCenter: PLANET,
      planetRadius: RADIUS,
    });

    expect(picked).toBe("front");
  });
});
