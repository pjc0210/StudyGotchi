import { hashString, makeRng } from "../seed";
import type { BiomeId, CanvasPlace, CanvasSpot } from "./types";

export const ISLAND_RADIUS = 8;

export const BIOMES: Record<
  BiomeId,
  { id: BiomeId; ground: string; accent: string; creature: string }
> = {
  forest: { id: "forest", ground: "#8fc48a", accent: "#4f8a4a", creature: "#f2a86f" },
  meadow: { id: "meadow", ground: "#bfe0a0", accent: "#8fbf6a", creature: "#c9a2e6" },
  ice: { id: "ice", ground: "#e6f2fb", accent: "#a9cfe8", creature: "#8fc9d8" },
  city: { id: "city", ground: "#d9c3d6", accent: "#b98bb0", creature: "#e88a8a" },
  sand: { id: "sand", ground: "#efd9a2", accent: "#d2a95e", creature: "#b9c96f" },
};

export interface Vec2 {
  x: number;
  z: number;
}

/** Place centres sit on a ring. Index keeps them evenly spaced; the id only jitters. */
export function placeCenter(place: CanvasPlace, index: number, count: number): Vec2 {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
  const rng = makeRng(hashString(place.id));
  const radius = 0.42 + rng() * 0.1;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

/** Spot offset inside a place. Hash of the concept id so new spots append, old ones stay. */
export function spotOffset(conceptId: string): Vec2 {
  const rng = makeRng(hashString(conceptId));
  const angle = rng() * Math.PI * 2;
  const radius = Math.sqrt(rng()) * 0.18;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

export function characterOffset(characterId: string): Vec2 {
  const rng = makeRng(hashString(`ch:${characterId}`));
  const angle = rng() * Math.PI * 2;
  const radius = 0.08 + rng() * 0.1;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

export function worldPosition(center: Vec2, offset: Vec2): Vec2 {
  return {
    x: (center.x + offset.x) * ISLAND_RADIUS,
    z: (center.z + offset.z) * ISLAND_RADIUS,
  };
}

export function nearestPlace(
  places: Array<{ id: string; center: Vec2 }>,
  x: number,
  z: number,
): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const place of places) {
    const dx = x - place.center.x;
    const dz = z - place.center.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = place.id;
    }
  }
  return best;
}

export function landmarkHeight(spots: CanvasSpot[], x: number, z: number, centers: Map<string, Vec2>): number {
  let bump = 0;
  for (const spot of spots) {
    if (spot.state !== 2) continue;
    const center = centers.get(spot.place_id);
    if (!center) continue;
    const pos = worldPosition(center, spotOffset(spot.concept_id));
    const nx = pos.x / ISLAND_RADIUS;
    const nz = pos.z / ISLAND_RADIUS;
    const d2 = (x - nx) ** 2 + (z - nz) ** 2;
    bump += spot.height * 0.7 * Math.exp(-d2 / 0.025);
  }
  return Math.min(bump, 1.6);
}
