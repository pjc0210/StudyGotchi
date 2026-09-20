import { hashString } from "@/lib/seed";
import type { CourseGlobeCourse, GlobeBiome, UnitDirection } from "./globe-types";

export type { UnitDirection } from "./globe-types";

export const PRODUCTION_PIXEL_GRAIN = 1.5;
export const PIXEL_ATLAS_SIZE = 320;
export const WATER_PATTERN_SIZE = 48;
export const WATER_FRAME_COUNT = 48;
export const WATER_FRAME_MS = 150;

const COURSE_CLUSTER_STRENGTH = 0.56;

const BIOMES: GlobeBiome[] = ["ice", "city", "meadow", "forest", "volcanic", "sand", "coast"];

export interface ContinentLobe {
  group: number;
  direction: UnitDirection;
  threshold: number;
}

export interface TerrainSample {
  ownerId: string;
  ownerDot: number;
  score: number;
  land: boolean;
  coast: boolean;
  biomeWeight: number;
  elevation: number;
}

export type MarkerBand = "neutral" | "seed" | "growing" | "thriving";

export interface MarkerState {
  band: MarkerBand;
  footprintScale: number;
  tiers: number;
  landmarkCount: number;
  pawnCount: number;
  activity: number | null;
}

export function biomeForCourse(courseId: string): GlobeBiome {
  return BIOMES[hashString(courseId) % BIOMES.length];
}

export function waterFrameState(elapsedMs: number) {
  const position = Math.max(0, elapsedMs) / WATER_FRAME_MS;
  const current = Math.floor(position) % WATER_FRAME_COUNT;
  const next = (current + 1) % WATER_FRAME_COUNT;
  const rawMix = position - Math.floor(position);
  const mix = rawMix * rawMix * (3 - 2 * rawMix);
  return { current, next, mix };
}

function seedHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function fibonacciCourseDirection(index: number, count: number): UnitDirection {
  const y = -1 + (2 * (index + 0.5)) / count;
  const radial = Math.sqrt(Math.max(0, 1 - y * y));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = index * goldenAngle;
  return [Math.cos(angle) * radial, y, Math.sin(angle) * radial];
}

function rotateDirection(
  direction: UnitDirection,
  pitch: number,
  yaw: number,
  roll: number,
): UnitDirection {
  const [x, y, z] = direction;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const x1 = x;
  const y1 = y * cp - z * sp;
  const z1 = y * sp + z * cp;
  const x2 = x1 * cy + z1 * sy;
  const y2 = y1;
  const z2 = -x1 * sy + z1 * cy;
  return [x2 * cr - y2 * sr, x2 * sr + y2 * cr, z2];
}

function normalizeDirection(direction: UnitDirection): UnitDirection {
  const length = Math.hypot(...direction) || 1;
  return [direction[0] / length, direction[1] / length, direction[2] / length];
}

function seededCourseDirectionsForCount(
  count: number,
  seed: string,
  clusterStrength = COURSE_CLUSTER_STRENGTH,
): UnitDirection[] {
  const random = seededUnit(seedHash(seed));
  const pitch = (random() - 0.5) * Math.PI;
  const yaw = random() * Math.PI * 2;
  const roll = (random() - 0.5) * Math.PI;
  const rotated = Array.from({ length: count }, (_, index) =>
    rotateDirection(fibonacciCourseDirection(index, count), pitch, yaw, roll),
  );
  if (clusterStrength <= 0) return rotated;
  const clustered = rotated.map((direction) => [...direction] as UnitDirection);
  for (let index = 0; index + 1 < clustered.length; index += 2) {
    const a = clustered[index];
    const b = clustered[index + 1];
    const midpoint = normalizeDirection([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
    clustered[index] = normalizeDirection([
      a[0] * (1 - clusterStrength) + midpoint[0] * clusterStrength,
      a[1] * (1 - clusterStrength) + midpoint[1] * clusterStrength,
      a[2] * (1 - clusterStrength) + midpoint[2] * clusterStrength,
    ]);
    clustered[index + 1] = normalizeDirection([
      b[0] * (1 - clusterStrength) + midpoint[0] * clusterStrength,
      b[1] * (1 - clusterStrength) + midpoint[1] * clusterStrength,
      b[2] * (1 - clusterStrength) + midpoint[2] * clusterStrength,
    ]);
  }
  return clustered;
}

export function seededCourseDirections(ids: string[], seed: string): UnitDirection[] {
  const sortedIds = [...ids].sort();
  const sortedDirections = seededCourseDirectionsForCount(sortedIds.length, seed);
  const directionById = new Map(sortedIds.map((id, index) => [id, sortedDirections[index]]));
  return ids.map((id) => directionById.get(id)!);
}

function directionDot(a: UnitDirection, b: UnitDirection) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function crossDirection(a: UnitDirection, b: UnitDirection): UnitDirection {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

interface DirectionsLayout {
  sortedIds: string[];
  courseDirections: UnitDirection[];
  lobes: ContinentLobe[];
}

const directionsLayoutCache = new WeakMap<Map<string, UnitDirection>, DirectionsLayout>();

function buildContinentLobes(courseDirections: UnitDirection[]) {
  const lobes: ContinentLobe[] = [];
  for (let index = 0; index < courseDirections.length; index += 2) {
    const a = courseDirections[index];
    const b = courseDirections[index + 1];
    const center = b
      ? normalizeDirection([a[0] + b[0], a[1] + b[1], a[2] + b[2]])
      : a;
    const reference: UnitDirection = Math.abs(center[1]) < 0.82 ? [0, 1, 0] : [1, 0, 0];
    const east = normalizeDirection(crossDirection(reference, center));
    const north = normalizeDirection(crossDirection(center, east));
    const group = Math.floor(index / 2);
    const offset = (eastOffset: number, northOffset: number) =>
      normalizeDirection([
        center[0] + east[0] * eastOffset + north[0] * northOffset,
        center[1] + east[1] * eastOffset + north[1] * northOffset,
        center[2] + east[2] * eastOffset + north[2] * northOffset,
      ]);
    lobes.push(
      { group, direction: a, threshold: 0.905 },
      { group, direction: b ?? offset(0.24, 0.04), threshold: 0.92 },
      { group, direction: offset(0.27, 0.23), threshold: 0.94 },
      { group, direction: offset(-0.24, -0.31), threshold: 0.955 },
    );
  }
  return lobes;
}

function resolveDirectionsLayout(directions: Map<string, UnitDirection>): DirectionsLayout {
  const cached = directionsLayoutCache.get(directions);
  if (cached) return cached;
  const sortedIds = [...directions.keys()].sort();
  const courseDirections = sortedIds.map((id) => directions.get(id)!);
  const layout = {
    sortedIds,
    courseDirections,
    lobes: buildContinentLobes(courseDirections),
  };
  directionsLayoutCache.set(directions, layout);
  return layout;
}

export function continentLobes(directions: Map<string, UnitDirection>) {
  return resolveDirectionsLayout(directions).lobes;
}

function continentPerturb(direction: UnitDirection, index: number) {
  const [x, y, z] = direction;
  return (
    Math.sin(x * 9.7 + y * 6.9 - z * 8.3 + index * 1.91) * 0.01 +
    Math.sin(x * 19.1 - y * 13.7 + z * 4.3 + index * 0.73) * 0.004 +
    Math.sin((x + z) * 31.3 + y * 14.1 - index * 1.17) * 0.0015
  );
}

function smoothUnit(value: number, low: number, high: number) {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

export function sampleTerrain(
  direction: UnitDirection,
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
): TerrainSample {
  const { sortedIds, courseDirections, lobes } = resolveDirectionsLayout(directions);
  let score = -Infinity;
  for (const lobe of lobes) {
    const candidate =
      directionDot(direction, lobe.direction) - lobe.threshold + continentPerturb(direction, lobe.group);
    if (candidate > score) {
      score = candidate;
    }
  }

  let ownerIndex = 0;
  let ownerDot = -Infinity;
  for (let index = 0; index < courseDirections.length; index++) {
    const candidate = directionDot(direction, courseDirections[index]);
    if (candidate > ownerDot) {
      ownerIndex = index;
      ownerDot = candidate;
    }
  }
  const ownerId = sortedIds[ownerIndex] ?? courses[0]?.id ?? "";
  const districtNoise =
    Math.sin(direction[0] * 21.7 + direction[1] * 13.3 - direction[2] * 17.9 + ownerIndex) * 0.0035 +
    Math.sin(direction[0] * 37.1 - direction[1] * 9.7 + direction[2] * 23.9) * 0.0015;
  const biomeWeight = smoothUnit(ownerDot + districtNoise, 0.972, 0.996);
  const land = score >= 0;
  const coast = land && score < 0.012;
  if (!land) {
    return { ownerId, ownerDot, score, land, coast, biomeWeight: 0, elevation: 0 };
  }

  const [x, y, z] = direction;
  const reliefNoise =
    Math.sin(x * 23.1 + y * 9.7 - z * 17.3 + ownerIndex) * 0.006 +
    Math.sin(x * 47.7 - y * 31.1 + z * 13.9 - ownerIndex * 0.7) * 0.003;
  const brokenRidge =
    Math.max(0, Math.sin(x * 31.7 + y * 37.3 - z * 19.9 + ownerIndex * 2.3)) * 0.015;
  const elevation = 0.22 + Math.max(-0.014, reliefNoise) + brokenRidge;
  return { ownerId, ownerDot, score, land, coast, biomeWeight, elevation };
}

function pixelHash(x: number, y: number, salt: number) {
  let value = Math.imul(x + salt * 1013, 374761393) ^ Math.imul(y - salt * 733, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function pixelGrassTone(x: number, y: number): -2 | -1 | 0 | 1 | 2 {
  const cellX = Math.floor(x / 4);
  const cellY = Math.floor(y / 4);
  const localX = ((x % 4) + 4) % 4;
  const localY = ((y % 4) + 4) % 4;
  const cluster = pixelHash(cellX, cellY, 0);

  if (cluster < 0.24) {
    if ((localX === 1 && localY >= 1) || (localX === 2 && localY === 2)) return 2;
    if ((localX + localY) % 3 === 0) return 1;
  } else if (cluster > 0.8) {
    if ((localX + localY) % 3 === 0) return -2;
    if (localX === 2 && localY >= 1) return -1;
  }

  const speckle = pixelHash(x, y, 1);
  if (speckle < 0.04) return 1;
  if (speckle > 0.97) return -1;
  return 0;
}

export function nearestCourseNeighbors(
  sourceId: string,
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
  count = 3,
): string[] {
  const source = directions.get(sourceId);
  if (!source) return [];

  return courses
    .map((course) => {
      const direction = directions.get(course.id);
      if (!direction || course.id === sourceId) return null;
      return {
        id: course.id,
        dot: directionDot(source, direction),
      };
    })
    .filter((entry): entry is { id: string; dot: number } => entry !== null)
    .sort((a, b) => b.dot - a.dot)
    .slice(0, count)
    .map(({ id }) => id);
}

export function courseMarkerState(progress: number | null): MarkerState {
  if (progress === null) {
    return {
      band: "neutral",
      footprintScale: 0.72,
      tiers: 1,
      landmarkCount: 1,
      pawnCount: 1,
      activity: null,
    };
  }

  const value = Math.min(1, Math.max(0, progress));
  if (value < 1 / 3) {
    return {
      band: "seed",
      footprintScale: 0.72,
      tiers: 1,
      landmarkCount: 1,
      pawnCount: 1,
      activity: value,
    };
  }
  if (value < 2 / 3) {
    return {
      band: "growing",
      footprintScale: 0.9,
      tiers: 2,
      landmarkCount: 2,
      pawnCount: 3,
      activity: value,
    };
  }
  return {
    band: "thriving",
    footprintScale: 1.08,
    tiers: 3,
    landmarkCount: 3,
    pawnCount: 5,
    activity: value,
  };
}
