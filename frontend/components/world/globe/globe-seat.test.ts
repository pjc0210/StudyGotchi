import { describe, expect, it } from "vitest";
import {
  PLANET_SEAT,
  seatedCameraDistance,
  seatedCameraPosition,
  seatedLookAt,
} from "./globe-seat";

describe("planet seat", () => {
  it("places the disc on the right of a wide viewport", () => {
    const { position, lookAt } = seatedCameraPosition(
      { width: 1440, height: 900 },
      26,
      4.55,
    );
    expect(lookAt[0]).toBeLessThan(0);
    expect(position[0]).toBeCloseTo(lookAt[0]);
    expect(PLANET_SEAT.anchorX).toBeGreaterThan(0.5);
  });

  it("fills the background instead of fitting a boxed disc", () => {
    const fov = (26 * Math.PI) / 180;
    const seated = seatedCameraDistance({ width: 1440, height: 900 }, 26, 4.55);
    const halfHeight = seated * Math.tan(fov / 2);
    expect(4.55 / halfHeight).toBeCloseTo(PLANET_SEAT.radiusFit, 2);
    expect(PLANET_SEAT.radiusFit).toBeGreaterThan(0.95);
    expect(PLANET_SEAT.radiusFit).toBeLessThan(1.2);
  });

  it("keeps a slight downward pitch on the seated camera", () => {
    const { position, lookAt } = seatedCameraPosition(
      { width: 1440, height: 900 },
      26,
      4.55,
    );
    expect(position[2]).toBeGreaterThan(lookAt[2]);
    expect(position[1]).toBeGreaterThan(lookAt[1]);
  });
});
