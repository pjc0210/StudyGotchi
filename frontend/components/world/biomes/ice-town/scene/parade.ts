import {
  ICE_TOWN_LAYOUT,
  type BiomeLayout,
  type IceDistrictKind,
} from "../layout/biome-layout";
import { anchorPoint, sampleTerrain } from "../layout/terrain";

/** Half-extent of the district landmark/building the walkers must stay outside. */
export const LANDMARK_FOOTPRINT_M: Record<IceDistrictKind, number> = {
  harbour: 6.5,
  town: 5.2,
  lake: 8,
  forest: 7.5,
  glacier: 7,
  station: 6,
};

/** Extra metres past the footprint so bodies clear walls, gantries, and plaza trees. */
export const PARADE_CLEARANCE_M = 5.5;

export const WALKER_DISTRICTS: readonly IceDistrictKind[] = [
  "harbour",
  "harbour",
  "town",
  "town",
  "lake",
  "forest",
  "forest",
  "glacier",
  "station",
];

export function paradeRadius(districtId: IceDistrictKind): number {
  return LANDMARK_FOOTPRINT_M[districtId] + PARADE_CLEARANCE_M;
}

export function isParadeLand(layout: BiomeLayout, x: number, z: number): boolean {
  const sample = sampleTerrain(layout, x, z);
  return sample.material !== "sea" && sample.height >= layout.seaLevel - 0.08;
}

/** Point on a ring around the district landmark, snapped onto land if the ring hits water. */
export function paradePoint(
  layout: BiomeLayout,
  districtId: IceDistrictKind,
  angle: number,
): { x: number; z: number } {
  const district = layout.districts.find((entry) => entry.id === districtId) ?? layout.districts[0];
  const [cx, cz] = anchorPoint(layout, district);
  const radius = paradeRadius(districtId);
  const minRadius = LANDMARK_FOOTPRINT_M[districtId] + 4;
  const tries = [0, 0.14, -0.14, 0.28, -0.28, 0.45, -0.45, 0.7, -0.7, 1.05, -1.05, Math.PI];
  for (const delta of tries) {
    for (const scale of [1, 1.12, 1.24, 0.94]) {
      const r = radius * scale;
      if (r < minRadius) continue;
      const a = angle + delta;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (isParadeLand(layout, x, z)) return { x, z };
    }
  }
  return { x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius };
}

export function paradeAnchor(layout: BiomeLayout, districtId: IceDistrictKind): [number, number] {
  const district = layout.districts.find((entry) => entry.id === districtId) ?? ICE_TOWN_LAYOUT.districts[0];
  return anchorPoint(layout, district);
}
