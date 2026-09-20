import { LANDMARK_REF_FIT, LANDMARK_REF_SCALE, PLANET_SEAT } from "./globe-seat";
import { courseMarkerState } from "./globe-spec";

/** Matches GlobeTown so buddy rings track the visible landmark size. */
export const GLOBE_BOUQUET_SCALE =
  LANDMARK_REF_SCALE * (LANDMARK_REF_FIT / PLANET_SEAT.radiusFit);
export const GLOBE_ACTIVE_POP = 1.48;

/** Bouquet-local metres covering the pedestal and leaning props. */
export const GLOBE_LANDMARK_FOOTPRINT_LOCAL = 22;
/** Extra bouquet-local metres so bodies clear walls, pines, and crowns. */
export const GLOBE_PARADE_CLEARANCE_LOCAL = 10;
/** World-unit gap between the inner and outer rings. */
export const GLOBE_PARADE_RING_GAP = 0.38;
export const GLOBE_BUDDY_SCALE = 0.78;

export function globeTownScale(progress: number | null, active: boolean): number {
  return GLOBE_BOUQUET_SCALE * courseMarkerState(progress).footprintScale * (active ? GLOBE_ACTIVE_POP : 1);
}

export function globeLandmarkFootprint(progress: number | null, active: boolean): number {
  return GLOBE_LANDMARK_FOOTPRINT_LOCAL * globeTownScale(progress, active);
}

export function globeParadeRadius(progress: number | null, active: boolean, ring = 0): number {
  const scale = globeTownScale(progress, active);
  const inner =
    (GLOBE_LANDMARK_FOOTPRINT_LOCAL + GLOBE_PARADE_CLEARANCE_LOCAL) * scale;
  return inner + Math.max(0, ring) * GLOBE_PARADE_RING_GAP;
}

export function globeBuddyPoint(
  progress: number | null,
  active: boolean,
  index: number,
  count: number,
  angleOffset = 0,
): { x: number; z: number; heading: number } {
  const ring = index % 2;
  const slots = Math.max(1, Math.ceil(count / 2));
  const slot = Math.floor(index / 2);
  const radius = globeParadeRadius(progress, active, ring);
  const angle = (slot / slots) * Math.PI * 2 + (ring ? Math.PI / slots : 0) + angleOffset;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    heading: angle + Math.PI / 2,
  };
}
