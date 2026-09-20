/** Full-bleed seat: the disc overflows the frame so walkers have ground. */
export const PLANET_SEAT = {
  anchorX: 0.74,
  anchorY: 0.58,
  /** Visual radius as a fraction of the half-axis — larger than the old boxed disc. */
  radiusFit: 1.08,
  lookAtY: -0.7,
  pitch: 0.38,
} as const;

/** Landmark world scale that held the old 0.78-fit on-screen size. */
export const LANDMARK_REF_FIT = 0.78;
export const LANDMARK_REF_SCALE = 0.058;

export function seatedOffset(
  viewport: { width: number; height: number },
  fovDeg: number,
  distance: number,
  seat = PLANET_SEAT,
): { x: number; y: number } {
  const aspect = Math.max(0.35, viewport.width / Math.max(1, viewport.height));
  const verticalFov = (fovDeg * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const ndcX = seat.anchorX * 2 - 1;
  const ndcY = 1 - seat.anchorY * 2;
  return {
    x: -ndcX * distance * Math.tan(horizontalFov / 2),
    y: -ndcY * distance * Math.tan(verticalFov / 2),
  };
}

export function seatedLookAt(
  viewport: { width: number; height: number },
  fovDeg: number,
  distance: number,
  seat = PLANET_SEAT,
): [number, number, number] {
  const offset = seatedOffset(viewport, fovDeg, distance, seat);
  return [offset.x, seat.lookAtY + offset.y, 0];
}

export function seatedCameraDistance(
  viewport: { width: number; height: number },
  fovDeg: number,
  globeRadius: number,
  seat = PLANET_SEAT,
): number {
  const aspect = Math.max(0.35, viewport.width / Math.max(1, viewport.height));
  const verticalFov = (fovDeg * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  return globeRadius / (seat.radiusFit * Math.tan(Math.max(0.12, limitingFov / 2)));
}

export function seatedCameraPosition(
  viewport: { width: number; height: number },
  fovDeg: number,
  globeRadius: number,
  seat = PLANET_SEAT,
): { position: [number, number, number]; lookAt: [number, number, number] } {
  const distance = seatedCameraDistance(viewport, fovDeg, globeRadius, seat);
  const offset = seatedOffset(viewport, fovDeg, distance, seat);
  const lookAt: [number, number, number] = [offset.x, seat.lookAtY + offset.y, 0];
  return {
    position: [offset.x, lookAt[1] + distance * seat.pitch, distance],
    lookAt,
  };
}
